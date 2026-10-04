import { INPUT_KEYS } from '../data/inputFormats';
import { uploadPreOrderSchema, validateExperimentSchema } from '../schemas/experiment.schema';
import { uuid } from '../schemas/common.schema';
import { Depot } from '../types/company.types';
import {
  DownloadResultFile,
  Experiment,
  ExperimentInputFile,
  ExperimentRow,
  ExperimentState,
  PreOrderUpload,
  SolveOutcome,
  UploadPreOrderResult,
  UploadedInputFile,
  emptyExperimentFiles,
} from '../types/experiment.types';
import { Constraint, DynamicParameter } from '../types/parameter.types';
import {
  IssueDetail,
  REPLACE_TYPE,
  TransformFile,
  TransformIssue,
  TransformLocations,
  VALIDATION_TYPE,
  ValidateResult,
  ValidationIssue,
  VehicleSelection,
} from '../types/pipeline.types';
import { ExperimentServiceDeps } from '../types/service.types';
import { PublicUser } from '../types/user.types';
import { AppError } from '../utils/errors';
import { timeToMinutes } from '../utils/time';
import { parse } from '../utils/validation';
import { scopeToDepot, snapshotParameters, toConstraint } from './parameter.service';
import { buildPlan, buildPlanWorkbook } from './pipeline/plan.service';
import { planRoutes } from './pipeline/solver.service';
import { readSheet } from './pipeline/spreadsheet';
import { transformOrders } from './pipeline/transform.service';
import { buildFleet, validateRun } from './pipeline/validation.service';
import { experimentKeys, extensionOf, safeFileName } from './storage/keys';

const ACCEPTED_EXTENSIONS = ['xlsx', 'csv'];
const DEFAULT_SERVICE_DURATION_MIN = 15;
const MAX_NAME_LENGTH = 200;

const notFound = () => new AppError('Experiment not found', 404, 'not_found');

const pad = (value: number): string => String(value).padStart(2, '0');

const defaultName = (now: Date): string =>
  `Experiment ${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

// The run page prints this number followed by "MB"
const toMegabytes = (bytes: number): number => Math.max(0.01, Math.round(bytes / 10_000) / 100);

const stem = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  return (dot > 0 ? fileName.slice(0, dot) : fileName).slice(0, MAX_NAME_LENGTH);
};

export function createExperimentService(deps: ExperimentServiceDeps) {
  const { experiments, depots, vehicleTypes, vehicles, parameters, configurations, storage, runner } = deps;

  async function depotMap(companyId: string): Promise<Map<string, Depot>> {
    const list = await depots.listByCompany(companyId);
    return new Map(list.map((depot): [string, Depot] => [depot.depotId, depot]));
  }

  function depotsOf(row: ExperimentRow, depotById: Map<string, Depot>): Depot[] {
    const own = row.depotIds.flatMap((depotId) => {
      const depot = depotById.get(depotId);
      return depot ? [depot] : [];
    });
    if (own.length) return own;
    const [first] = depotById.values();
    return first ? [first] : [];
  }

  function toExperiment(
    row: ExperimentRow,
    depotById: Map<string, Depot>,
    configurationList: unknown[] = [],
  ): Experiment {
    const runDepots = depotsOf(row, depotById);
    const { transform, validate, plan } = row.files;

    return {
      companyName: runDepots[0]?.companyName ?? '',
      runId: row.runId,
      companyId: row.companyId,
      groupId: row.groupId,
      name: row.name,
      run: row.run,
      status: row.status,
      triggeredBy: row.triggeredBy,
      triggeredByName: row.triggeredByName,
      timestamp: row.timestamp,
      timeStart: row.timeStart,
      timeEnd: row.timeEnd,
      timeDuration: row.timeDuration,
      countGeocoding: row.countGeocoding,
      countReroute: row.countReroute,
      errorMessage: row.errorMessage,
      configurations: configurationList,
      inputdata: row.inputdata.map((file) => ({ ...file, fileUrl: storage.fileUrl(file.blobPath) })),
      depots: runDepots,
      fileUrls: {
        transform: {
          locations: storage.fileUrl(transform.locations),
          warning: storage.fileUrl(transform.warning),
        },
        validate: {
          parameterFormats: storage.fileUrl(validate.parameterFormats),
          vehicleTypes: storage.fileUrl(validate.vehicleTypes),
          preVRPSolution: storage.fileUrl(validate.preVRPSolution),
          errorWarning: storage.fileUrl(validate.errorWarning),
        },
        plan: {
          vrpSolutionLean: storage.fileUrl(plan.vrpSolutionLean),
          geoJson: storage.fileUrl(plan.geoJson),
          vrpStats: storage.fileUrl(plan.vrpStats),
        },
      },
    };
  }

  async function requireRun(companyId: string, runId: string): Promise<ExperimentRow> {
    const row = await experiments.show(companyId, parse(uuid, runId));
    if (!row) throw notFound();
    return row;
  }

  // A run in preparation belongs to the planner who started it; colleagues can see it in the list
  // but not change it (OWASP API1)
  async function requireDraft(user: PublicUser, runId: string): Promise<ExperimentRow> {
    const row = await requireRun(user.companyId, runId);
    if (row.triggeredBy !== user.id) {
      throw new AppError('Only the creator of this experiment can change it', 403, 'forbidden');
    }
    if (row.status !== 'Initializing') {
      throw new AppError(
        `This experiment is already ${row.status} and can no longer be changed`,
        409,
        'conflict',
      );
    }
    return row;
  }

  async function present(companyId: string, runId: string): Promise<Experiment> {
    const row = await requireRun(companyId, runId);
    return toExperiment(row, await depotMap(companyId));
  }

  const state = (
    row: ExperimentRow,
    status: ExperimentState['status'],
    message: string,
  ): ExperimentState => ({
    runId: row.runId,
    status,
    groupId: row.groupId,
    statusCode: '200',
    message,
  });

  async function depotParameters(companyId: string, depotId: string | null): Promise<DynamicParameter[]> {
    return scopeToDepot(await parameters.listForDepot(companyId, depotId), depotId);
  }

  async function readInput(file: ExperimentInputFile): Promise<TransformFile | null> {
    const object = await storage.get(file.blobPath);
    if (!object) return null;
    return {
      keyName: file.keyName,
      fileName: file.filename,
      sheet: await readSheet(object.body, file.filename),
    };
  }

  return {
    async list(companyId: string): Promise<Experiment[]> {
      const [rows, depotById] = await Promise.all([
        experiments.listByCompany(companyId),
        depotMap(companyId),
      ]);
      return rows.map((row) => toExperiment(row, depotById));
    },

    async get(companyId: string, runId: string): Promise<Experiment> {
      const row = await requireRun(companyId, runId);
      const depotById = await depotMap(companyId);
      const runDepotIds = depotsOf(row, depotById).map((depot) => depot.depotId);
      const used = await configurations.listForDepots(companyId, runDepotIds);
      return toExperiment(
        row,
        depotById,
        used.map(({ id, name, category, depotId, fileBlobPath, timestamp }) => ({
          id,
          name,
          category,
          depotId,
          fileBlobPath,
          timestamp,
        })),
      );
    },

    async create(user: PublicUser): Promise<Experiment> {
      const runId = await experiments.create({
        companyId: user.companyId,
        name: defaultName(new Date()),
        triggeredBy: user.id,
      });
      return present(user.companyId, runId);
    },

    async uploadPreOrder(
      user: PublicUser,
      input: unknown,
      uploads: PreOrderUpload[],
    ): Promise<UploadPreOrderResult> {
      const { runId, depotId } = parse(uploadPreOrderSchema, input);
      const row = await requireDraft(user, runId);

      const depotById = await depotMap(user.companyId);
      const depot = depotById.get(depotId?.[0] ?? '') ?? depotsOf(row, depotById)[0];
      if (!depot) throw new AppError('Depot not found', 404, 'not_found');
      if (!uploads.length) throw new AppError('No file was uploaded', 400, 'invalid_request');

      const keys = experimentKeys(user.companyId, row.runId);
      const fresh: UploadedInputFile[] = [];

      for (const { keyName, file } of uploads) {
        const definition = depot.inputdata.find((item) => item.keyName === keyName);
        if (!definition) {
          throw new AppError(
            `"${file.filename}" is not a file type this depot accepts`,
            400,
            'invalid_request',
          );
        }
        const extension = extensionOf(file.filename);
        if (!ACCEPTED_EXTENSIONS.includes(extension)) {
          throw new AppError(`"${file.filename}" must be an .xlsx or .csv file`, 400, 'invalid_request');
        }
        const fileName = safeFileName(file.filename, `${keyName}.${extension}`);
        fresh.push({
          meta: {
            keyName,
            filename: fileName,
            blobPath: keys.input(keyName, fileName),
            displayName: definition.displayName,
            fileFormatType: extension,
            fileSize: toMegabytes(file.content.length),
          },
          content: file.content,
          transform: { keyName, fileName, sheet: await readSheet(file.content, fileName) },
        });
      }

      const replaced = new Set(fresh.map((entry) => entry.meta.keyName));
      const kept = row.inputdata.filter((file) => !replaced.has(file.keyName));
      const keptFiles = (await Promise.all(kept.map(readInput))).filter(
        (file): file is TransformFile => !!file,
      );

      const provided = new Set([...replaced, ...kept.map((file) => file.keyName)]);
      const missing = depot.inputdata.filter((item) => item.required && !provided.has(item.keyName));
      if (missing.length) {
        throw new AppError(
          `Required file missing: ${missing.map((item) => item.displayName).join(', ')}`,
          400,
          'invalid_request',
        );
      }

      const depotConstraint = toConstraint(await depotParameters(user.companyId, depot.depotId));
      const outcome = transformOrders({
        depot,
        files: [...fresh.map((entry) => entry.transform), ...keptFiles],
        productMaster: await configurations.productMaster(user.companyId, depot.depotId),
        serviceDurationMin: timeToMinutes(depotConstraint.serviceDurationTime, DEFAULT_SERVICE_DURATION_MIN),
      });

      const response = { timestamp: row.timestamp, groupId: row.groupId, result: outcome.result };
      if (!outcome.locations) return { ...response, name: row.name, status: row.status };

      for (const entry of fresh) {
        const previous = row.inputdata.find((file) => file.keyName === entry.meta.keyName);
        if (previous && previous.blobPath !== entry.meta.blobPath) await storage.delete(previous.blobPath);
        await storage.put(entry.meta.blobPath, entry.content);
      }
      await storage.putJson(keys.transformLocations, outcome.locations);

      const files = emptyExperimentFiles();
      files.transform.locations = keys.transformLocations;
      if (outcome.result.warning.length) {
        await storage.putJson(keys.transformWarning, outcome.result.warning);
        files.transform.warning = keys.transformWarning;
      }

      const orderFile = fresh.find((entry) => entry.meta.keyName === INPUT_KEYS.preorder) ?? fresh[0];
      const name = orderFile ? stem(orderFile.meta.filename) : row.name;

      await experiments.update(row.runId, {
        name,
        inputdata: [...kept, ...fresh.map((entry) => entry.meta)],
        files,
        parameters: [],
        countGeocoding: outcome.geocodedCount,
        countReroute: 0,
      });
      await experiments.setDepots(row.runId, [depot.depotId]);

      return { ...response, name, status: row.status };
    },

    async validate(user: PublicUser, input: unknown): Promise<{ result: ValidateResult }> {
      const data = parse(validateExperimentSchema, input);
      const row = await requireDraft(user, data.runId);

      const locations = row.files.transform.locations
        ? await storage.getJson<TransformLocations>(row.files.transform.locations)
        : null;
      if (!locations) throw new AppError('Upload the order files before validating', 409, 'conflict');

      for (const update of data.updateLocation?.customers ?? []) {
        const customer = locations.customers.find(
          (candidate) =>
            (update.nodeId && candidate.nodeId === update.nodeId) ||
            (update.name === candidate.name && update.index === candidate.index),
        );
        if (!customer) continue;
        customer.latitude = update.latitude;
        customer.longitude = update.longitude;
        customer.replaceType = REPLACE_TYPE.input;
        customer.validationType = VALIDATION_TYPE.subdistrict;
        customer.grade = 'A';
      }

      const requested = data.vehicles ?? [];
      const selections: VehicleSelection[] = requested.map((vehicle) => ({
        vehicleTypeId: vehicle.vehicleTypeId,
        numberOfVehiclesAvailable: vehicle.numberOfVehiclesAvailable ?? 0,
        specificVehicleIds: vehicle.vehicleId ?? [],
      }));
      if (
        !selections.some(
          (selection) => selection.numberOfVehiclesAvailable > 0 || selection.specificVehicleIds.length,
        )
      ) {
        throw new AppError('Add at least one vehicle to the run before validating', 400, 'invalid_request');
      }

      const typeIds = [...new Set(selections.map((selection) => selection.vehicleTypeId))];
      const types = await vehicleTypes.findByIds(user.companyId, typeIds);
      if (types.length !== typeIds.length) throw new AppError('Vehicle type not found', 404, 'not_found');

      const vehicleRows = await vehicles.findByIds(
        user.companyId,
        selections.flatMap((selection) => selection.specificVehicleIds),
      );

      const constraint: Constraint = data.parameter;
      const fleet = buildFleet(selections, types, vehicleRows, constraint);

      const transformWarnings = row.files.transform.warning
        ? await storage.getJson<TransformIssue[]>(row.files.transform.warning)
        : null;
      const missingProducts: IssueDetail[] = (transformWarnings ?? []).flatMap((warning) =>
        warning.title === 'products' ? warning.detail : [],
      );
      const orderFile =
        row.inputdata.find((file) => file.keyName === INPUT_KEYS.preorder) ?? row.inputdata[0];

      const result = validateRun({
        locations,
        constraint,
        fleet,
        orderFileName: orderFile?.filename ?? row.name,
        missingProducts,
      });

      const keys = experimentKeys(user.companyId, row.runId);
      await storage.putJson(keys.transformLocations, locations);
      await storage.putJson(keys.parameterFormats, constraint);
      await storage.putJson(keys.vehicleTypes, selections);
      await storage.putJson(keys.preVRPSolution, {
        customers: locations.customers,
        depots: locations.depots,
        validate: result.validate,
      });

      const hasIssues = result.warning.length > 0 || result.error.length > 0;
      if (hasIssues) {
        await storage.putJson(keys.errorWarning, { warnings: result.warning, errors: result.error });
      } else if (row.files.validate.errorWarning) {
        await storage.delete(keys.errorWarning);
      }

      const depotId = row.depotIds[0] ?? null;
      await experiments.update(row.runId, {
        files: {
          ...row.files,
          validate: {
            parameterFormats: keys.parameterFormats,
            vehicleTypes: keys.vehicleTypes,
            preVRPSolution: keys.preVRPSolution,
            errorWarning: hasIssues ? keys.errorWarning : null,
          },
        },
        parameters: snapshotParameters(await depotParameters(user.companyId, depotId), constraint),
      });

      return { result };
    },

    async submit(user: PublicUser, runId: string): Promise<Experiment> {
      const row = await requireDraft(user, runId);
      const { validate } = row.files;
      if (!validate.parameterFormats || !validate.vehicleTypes || !validate.preVRPSolution) {
        throw new AppError('Validate the experiment before submitting it', 409, 'conflict');
      }
      if (validate.errorWarning) {
        const issues = await storage.getJson<{ errors?: ValidationIssue[] }>(validate.errorWarning);
        if (issues?.errors?.length) {
          throw new AppError('Fix the validation errors before submitting the experiment', 409, 'conflict');
        }
      }

      const queued = await experiments.transition(row.runId, ['Initializing'], {
        status: 'Queued',
        timeStart: null,
        timeEnd: null,
        timeDuration: null,
        errorMessage: null,
      });
      if (!queued) throw new AppError('This experiment has already been submitted', 409, 'conflict');

      runner.enqueue(row.runId);
      return present(user.companyId, row.runId);
    },
    async solve(runId: string): Promise<SolveOutcome> {
      const row = await experiments.showById(runId);
      if (!row) throw notFound();

      const { transform, validate } = row.files;
      const locations = transform.locations
        ? await storage.getJson<TransformLocations>(transform.locations)
        : null;
      const constraint = validate.parameterFormats
        ? await storage.getJson<Constraint>(validate.parameterFormats)
        : null;
      const selections = validate.vehicleTypes
        ? await storage.getJson<VehicleSelection[]>(validate.vehicleTypes)
        : null;
      const depot = locations?.depots[0];
      if (!locations || !constraint || !selections || !depot) {
        throw new Error('the run has no validated input to plan from');
      }

      const types = await vehicleTypes.findByIds(
        row.companyId,
        selections.map((selection) => selection.vehicleTypeId),
      );
      const vehicleRows = await vehicles.findByIds(
        row.companyId,
        selections.flatMap((selection) => selection.specificVehicleIds),
      );
      const fleet = buildFleet(selections, types, vehicleRows, constraint);
      if (!fleet.length) throw new Error('the run has no vehicle left to plan with');

      const solverInput = {
        depot: {
          nodeId: depot.nodeId,
          name: depot.depotName,
          latitude: depot.latitude,
          longitude: depot.longitude,
        },
        customers: locations.customers,
        fleet,
        constraint,
      };
      const built = await buildPlan(solverInput, planRoutes(solverInput));

      const keys = experimentKeys(row.companyId, row.runId);
      const resultKey = keys.result(safeFileName(`Plan_${row.name}.xlsx`, 'Plan.xlsx'));
      await storage.putJson(keys.vrpSolutionLean, built.solution);
      await storage.putJson(keys.geoJson, built.geoJson);
      await storage.putJson(keys.vrpStats, built.stats);
      await storage.put(resultKey, await buildPlanWorkbook(row.name, built));

      return {
        files: {
          ...row.files,
          plan: { vrpSolutionLean: keys.vrpSolutionLean, geoJson: keys.geoJson, vrpStats: keys.vrpStats },
          result: resultKey,
        },
        rerouteCount: built.rerouteCount,
      };
    },

    async rerun(companyId: string, runId: string): Promise<ExperimentState> {
      const row = await requireRun(companyId, runId);
      const queued = await experiments.transition(row.runId, ['Failed', 'Cancelled'], {
        status: 'Queued',
        run: 'Rerun',
        timeStart: null,
        timeEnd: null,
        timeDuration: null,
        errorMessage: null,
        files: { ...row.files, plan: emptyExperimentFiles().plan, result: null },
      });
      if (!queued) {
        throw new AppError('Only a failed or cancelled experiment can be retried', 409, 'conflict');
      }
      runner.enqueue(row.runId);
      return state(row, 'Queued', 'The experiment has been queued again.');
    },

    async cancel(companyId: string, runId: string): Promise<ExperimentState> {
      const row = await requireRun(companyId, runId);
      const cancelled = await experiments.transition(row.runId, ['Queued', 'InProgress'], {
        status: 'Cancelled',
        timeEnd: new Date(),
      });
      if (!cancelled) {
        throw new AppError('Only a queued or running experiment can be cancelled', 409, 'conflict');
      }
      runner.cancel(row.runId);
      return state(row, 'Cancelled', 'The experiment has been cancelled.');
    },
    async replicate(user: PublicUser, runId: string): Promise<Experiment> {
      const source = await requireRun(user.companyId, runId);
      const copyId = await experiments.create({
        companyId: user.companyId,
        name: source.name,
        triggeredBy: user.id,
        groupId: source.groupId,
        run: 'Rerun',
      });

      const from = experimentKeys(user.companyId, source.runId);
      const to = experimentKeys(user.companyId, copyId);
      const move = async (key: string | null): Promise<string | null> => {
        if (!key) return null;
        const target = `${to.prefix}${key.slice(from.prefix.length)}`;
        await storage.copy(key, target);
        return target;
      };

      const inputdata: ExperimentInputFile[] = [];
      for (const file of source.inputdata) {
        const blobPath = await move(file.blobPath);
        if (blobPath) inputdata.push({ ...file, blobPath });
      }

      const files = emptyExperimentFiles();
      files.transform.locations = await move(source.files.transform.locations);
      files.transform.warning = await move(source.files.transform.warning);
      files.validate.parameterFormats = await move(source.files.validate.parameterFormats);
      files.validate.vehicleTypes = await move(source.files.validate.vehicleTypes);
      files.validate.preVRPSolution = await move(source.files.validate.preVRPSolution);
      files.validate.errorWarning = await move(source.files.validate.errorWarning);

      await experiments.update(copyId, {
        inputdata,
        files,
        parameters: source.parameters,
        countGeocoding: source.countGeocoding,
      });
      await experiments.setDepots(copyId, source.depotIds);
      return present(user.companyId, copyId);
    },

    async downloadResultFile(companyId: string, runId: string): Promise<DownloadResultFile> {
      const row = await requireRun(companyId, runId);
      const url = storage.fileUrl(row.files.result);
      if (!row.files.result || !url) {
        throw new AppError('This experiment has no result file yet', 404, 'not_found');
      }
      return { resultFileBlobPath: row.files.result, fileUrl: { resultFileBlobPathUrl: url } };
    },

    async parametersOf(companyId: string, runId: string): Promise<DynamicParameter[]> {
      const row = await requireRun(companyId, runId);
      if (row.parameters.length) return row.parameters;
      return depotParameters(companyId, row.depotIds[0] ?? null);
    },

    async constraintOf(companyId: string, runId: string): Promise<Constraint> {
      const row = await requireRun(companyId, runId);
      const saved = row.files.validate.parameterFormats
        ? await storage.getJson<Constraint>(row.files.validate.parameterFormats)
        : null;
      return saved ?? toConstraint(await depotParameters(companyId, row.depotIds[0] ?? null));
    },
  };
}

export type ExperimentService = ReturnType<typeof createExperimentService>;
