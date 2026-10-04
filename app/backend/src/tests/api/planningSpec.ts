import { Run, TestPlanner } from '../../types/test.types';
import { api, GRAPHQL, XLSX, demoPlanner, outsidePlanner, registerPlanner, sampleFile } from '../support/api';

const EXPERIMENTS = `query { experiments { runId name status run groupId triggeredBy triggeredByName depots { depotId depotName } } }`;
const EXPERIMENT = `query experiment($Id: RunIdInput!) {
  experiment(input: $Id) {
    runId name status run groupId triggeredBy timeStart timeEnd timeDuration
    inputdata { keyName filename displayName fileSize fileUrl }
    fileUrls {
      transform { locations warning }
      validate { parameterFormats vehicleTypes preVRPSolution errorWarning }
      plan { vrpSolutionLean geoJson vrpStats }
    }
  }
}`;
const CREATE = `mutation { createExperiment { runId status } }`;
const UPLOAD = `mutation uploadPreOrder($input: PreOrderInput!) { uploadPreOrder(input: $input) { name groupId result status } }`;
const VALIDATE = `mutation validateExperiment($validateInput: ExperimentInputValidation!) { validateExperiment(input: $validateInput) { result } }`;
const SUBMIT = `mutation submitExperiment($input: ExperimentSubmitInput!) { submitExperiment(input: $input) { runId status } }`;
const REPLICATE = `mutation replicateExperiment($runId: String!) { replicateExperiment(runId: $runId) { runId } }`;
const CANCEL = `mutation cancelExperiment($runId: String!) { cancelExperiment(runId: $runId) { runId status } }`;
const RESULT_FILE = `query downloadResultFile($runId: String!) { downloadResultFile(experimentRunID: $runId) { resultFileBlobPath fileUrl { resultFileBlobPathUrl } } }`;

const CONSTRAINT = {
  earlyDeliveryTime: '08:00',
  backToDepotTime: '18:00',
  maximumWorkDuration: '09:00',
  serviceDurationTime: '00:15',
  numberOfVehicleAvailable: 20,
  vehicleOrderSizeCapacity: 6000,
  maximumTravelDistance: 250,
  minimumVehicle: 1,
};

const FINISHED = ['Succeeded', 'Failed', 'Cancelled'];

const codeOf = (res: { body: { errors?: Array<{ extensions?: { code?: string } }> } }): string | undefined =>
  res.body.errors?.[0]?.extensions?.code;

async function runsOf(planner: TestPlanner): Promise<Run[]> {
  const res = await planner.gql(EXPERIMENTS).expect(200);
  return res.body.data.experiments as Run[];
}

async function detailOf(planner: TestPlanner, runId: string) {
  const res = await planner.gql(EXPERIMENT, { Id: { runId } }).expect(200);
  return res.body.data.experiment;
}

async function finishedRun(planner: TestPlanner): Promise<Run> {
  const run = (await runsOf(planner)).find(
    (item) => item.status === 'Succeeded' && item.run === 'Original' && item.triggeredBy === planner.id,
  );
  if (!run) throw new Error('the seed left no succeeded run');
  return run;
}

async function bangNaDepot(planner: TestPlanner): Promise<string> {
  const res = await planner.gql('{ myDepots { depotId depotName } }').expect(200);
  const depot = (res.body.data.myDepots as Array<{ depotId: string; depotName: string }>).find((item) =>
    item.depotName.startsWith('Bang Na'),
  );
  if (!depot) throw new Error('the seed left no Bang Na depot');
  return depot.depotId;
}

async function fleetOf(planner: TestPlanner) {
  const res = await planner.gql('{ myVehicleTypes { vehicleTypeId name } }').expect(200);
  const types = res.body.data.myVehicleTypes as Array<{ vehicleTypeId: string; name: string }>;
  const typeId = (prefix: string): string => {
    const type = types.find((item) => item.name.startsWith(prefix));
    if (!type) throw new Error(`the seed left no "${prefix}" vehicle type`);
    return type.vehicleTypeId;
  };
  return [
    { vehicleTypeId: typeId('4W Box'), numberOfVehiclesAvailable: 5 },
    { vehicleTypeId: typeId('EV Van'), numberOfVehiclesAvailable: 4 },
  ];
}

async function uploadedRun(planner: TestPlanner): Promise<string> {
  const created = await planner.gql(CREATE).expect(200);
  const runId = created.body.data.createExperiment.runId as string;

  const res = await planner
    .upload(
      UPLOAD,
      {
        input: {
          runId,
          depotId: [await bangNaDepot(planner)],
          preOrderFiles: [
            { file: null, keyName: 'preorder' },
            { file: null, keyName: 'time_window' },
          ],
        },
      },
      [
        {
          path: 'variables.input.preOrderFiles.0.file',
          name: 'preorder_bangna_sample.xlsx',
          type: XLSX,
          content: await sampleFile('preorder_bangna_sample.xlsx'),
        },
        {
          path: 'variables.input.preOrderFiles.1.file',
          name: 'time_window_bangna_sample.csv',
          type: 'text/csv',
          content: await sampleFile('time_window_bangna_sample.csv'),
        },
      ],
    )
    .expect(200);
  expect(res.body.errors).toBeUndefined();
  expect(res.body.data.uploadPreOrder.result.isSuccesses).toBe(true);
  return runId;
}

async function waitUntilFinished(planner: TestPlanner, runId: string) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const detail = await detailOf(planner, runId);
    if (FINISHED.includes(detail.status)) return detail;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`run ${runId} did not finish`);
}

describe('GraphQL API', () => {
  let demo: TestPlanner;

  beforeAll(async () => {
    demo = await demoPlanner();
  });

  describe('the endpoint', () => {
    it('is closed to a caller without an access token, introspection included', async () => {
      const res = await api.post(GRAPHQL).send({ query: '{ __schema { queryType { name } } }' }).expect(401);
      expect(res.body.code).toBe('no_token');
    });

    it('reports a query it cannot run without a stack trace', async () => {
      const res = await demo.gql('{ experiments { noSuchField } }').expect(400);
      expect(codeOf(res)).toBe('GRAPHQL_VALIDATION_FAILED');
      expect(JSON.stringify(res.body)).not.toContain('stacktrace');
    });

    it('refuses a query nested deeper than the limit', async () => {
      const res = await demo.gql('{ a { b { c { d { e { f { g { h { i } } } } } } } } }').expect(400);
      const messages = (res.body.errors as Array<{ message: string }>).map((error) => error.message);
      expect(messages).toContain('Query is nested 9 levels deep; the limit is 8.');
    });

    it('answers a malformed id as a bad request, without leaking the SQL error', async () => {
      const res = await demo.gql('query ($id: String!) { myVehicle(vehicleId: $id) { vehicleId } }', {
        id: 'not-a-uuid',
      });
      expect(res.body.errors[0].extensions.statusCode).toBe(400);
      expect(res.body.errors[0].message).not.toMatch(/syntax|uuid/i);
    });
  });

  describe('the demo workspace', () => {
    it('lists the seeded runs in every state, each with its depot', async () => {
      const runs = await runsOf(demo);
      const statuses = new Set(runs.map((run) => run.status));

      expect(runs.length).toBeGreaterThanOrEqual(8);
      for (const status of ['Succeeded', 'Failed', 'Cancelled', 'Initializing']) {
        expect(statuses.has(status)).withContext(status).toBeTrue();
      }
    });

    it('holds the master data the run page reads', async () => {
      const res = await demo
        .gql(
          `{
            myDepots { depotId inputdata { keyName required } }
            myVehicleTypes { vehicleTypeId }
            myVehicles { vehicleId isActive }
            configurations { id category }
          }`,
        )
        .expect(200);

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.myDepots.length).toBe(3);
      expect(res.body.data.myDepots[0].inputdata.length).toBe(2);
      expect(res.body.data.myVehicleTypes.length).toBeGreaterThanOrEqual(6);
      expect(res.body.data.myVehicles.length).toBeGreaterThanOrEqual(16);
      expect(res.body.data.configurations.length).toBe(18);

      const depotId = res.body.data.myDepots[0].depotId as string;
      const parameters = await demo
        .gql('query ($depotId: String!) { dynamicParameters(depotId: $depotId) { keyName value } }', {
          depotId,
        })
        .expect(200);
      expect(parameters.body.data.dynamicParameters.length).toBe(8);
    });

    it('serves the plan of a finished run in minutes and kilometres', async () => {
      const detail = await detailOf(demo, (await finishedRun(demo)).runId);

      const stats = await demo.get(detail.fileUrls.plan.vrpStats).expect(200);
      expect(stats.body.routeCount).toBeGreaterThan(0);
      expect(stats.body.dataUnits.timeUnit).toBe('min');

      const map = await demo.get(detail.fileUrls.plan.geoJson).expect(200);
      expect(JSON.stringify(map.body)).toContain('LineString');
    });
  });

  describe('stored files', () => {
    let statsUrl: string;

    beforeAll(async () => {
      const detail = await detailOf(demo, (await finishedRun(demo)).runId);
      statsUrl = detail.fileUrls.plan.vrpStats as string;
    });

    it('are not served without an access token', async () => {
      const res = await api.get(statsUrl).expect(401);
      expect(res.body.code).toBe('no_token');
    });

    it('are served to another planner of the same company, never cached', async () => {
      const colleague = await registerPlanner('colleague');
      const res = await colleague.get(statsUrl).expect(200);
      expect(res.headers['cache-control']).toBe('private, no-store');
    });

    it('do not exist for a planner of another company', async () => {
      const outsider = await outsidePlanner();
      const res = await outsider.get(statsUrl).expect(404);
      expect(res.body.code).toBe('not_found');
    });

    it('cannot be reached with a key that climbs out of the store', async () => {
      await demo.get('/api/v1/files/companies/..%2F..%2F.env').expect(404);
      await demo.get('/api/v1/files/..%2Fpackage.json').expect(404);
    });

    it('download the result workbook under its own file name', async () => {
      const run = await finishedRun(demo);
      const res = await demo.gql(RESULT_FILE, { runId: run.runId }).expect(200);
      const url = res.body.data.downloadResultFile.fileUrl.resultFileBlobPathUrl as string;

      const file = await demo.get(url).expect(200);
      expect(file.headers['content-type']).toBe(XLSX);
      expect(file.headers['content-disposition']).toMatch(/filename="[^"]+\.xlsx"/);
    });
  });

  describe('another company', () => {
    it('sees none of the demo workspace', async () => {
      const outsider = await outsidePlanner();
      const run = await finishedRun(demo);

      const lists = await outsider.gql(
        '{ experiments { runId } myDepots { depotId } myVehicles { vehicleId } }',
      );
      expect(lists.body.data).toEqual({ experiments: [], myDepots: [], myVehicles: [] });

      const detail = await outsider.gql(EXPERIMENT, { Id: { runId: run.runId } });
      expect(codeOf(detail)).toBe('NOT_FOUND');

      const copy = await outsider.gql(REPLICATE, { runId: run.runId });
      expect(codeOf(copy)).toBe('NOT_FOUND');
    });
  });

  describe('planning a run', () => {
    it('reports the rows of an order file it cannot use', async () => {
      const created = await demo.gql(CREATE).expect(200);
      const runId = created.body.data.createExperiment.runId as string;

      const res = await demo
        .upload(
          UPLOAD,
          {
            input: {
              runId,
              depotId: [await bangNaDepot(demo)],
              preOrderFiles: [{ file: null, keyName: 'preorder' }],
            },
          },
          [
            {
              path: 'variables.input.preOrderFiles.0.file',
              name: 'preorder_invalid_rows_sample.xlsx',
              type: XLSX,
              content: await sampleFile('preorder_invalid_rows_sample.xlsx'),
            },
          ],
        )
        .expect(200);

      const result = res.body.data.uploadPreOrder.result;
      expect(result.isSuccesses).toBe(false);
      expect(result.error[0].detail.length).toBe(3);
    });

    it('goes from an uploaded order file to a plan', async () => {
      const runId = await uploadedRun(demo);
      const vehicles = await fleetOf(demo);

      const validated = await demo
        .gql(VALIDATE, {
          validateInput: { runId, parameter: CONSTRAINT, updateLocation: { customers: [] }, vehicles },
        })
        .expect(200);
      const result = validated.body.data.validateExperiment.result;
      expect(result.isSuccesses).toBe(true);
      // The sample orders name two products the product master does not list
      expect(result.warning[0].errorType).toBe('missing_product');

      const submitted = await demo.gql(SUBMIT, { input: { runId } }).expect(200);
      expect(submitted.body.data.submitExperiment.status).toBe('Queued');

      const done = await waitUntilFinished(demo, runId);
      expect(done.status).toBe('Succeeded');
      expect(done.name).toBe('preorder_bangna_sample');

      const stats = await demo.get(done.fileUrls.plan.vrpStats).expect(200);
      expect(stats.body.routeCount).toBeGreaterThan(0);
      expect(stats.body.customerCount).toBeGreaterThan(0);
      expect(stats.body.unassignedCustomers).toEqual([]);
    });

    it('refuses to plan a run whose validation found hard-constraint errors', async () => {
      const runId = await uploadedRun(demo);

      const validated = await demo
        .gql(VALIDATE, {
          validateInput: {
            runId,
            parameter: { ...CONSTRAINT, vehicleOrderSizeCapacity: 100 },
            updateLocation: { customers: [] },
            vehicles: await fleetOf(demo),
          },
        })
        .expect(200);
      const result = validated.body.data.validateExperiment.result;
      expect(result.isSuccesses).toBe(false);
      expect(result.error[0].errorType).toBe('constraint_validation');

      const submitted = await demo.gql(SUBMIT, { input: { runId } });
      expect(codeOf(submitted)).toBe('CONFLICT');
    });

    it('keeps a draft closed to planners who did not create it', async () => {
      const runId = await uploadedRun(demo);
      const colleague = await registerPlanner('nosy');

      const submitted = await colleague.gql(SUBMIT, { input: { runId } });
      expect(codeOf(submitted)).toBe('FORBIDDEN');
    });

    it('copies a finished run into an editable rerun of the same group', async () => {
      const run = await finishedRun(demo);

      const res = await demo.gql(REPLICATE, { runId: run.runId }).expect(200);
      const copy = await detailOf(demo, res.body.data.replicateExperiment.runId);

      expect(copy.status).toBe('Initializing');
      expect(copy.run).toBe('Rerun');
      expect(copy.groupId).toBe(run.groupId);
      expect(copy.triggeredBy).toBe(demo.id);
      expect(copy.inputdata[0].fileUrl).toBeTruthy();
      expect(copy.fileUrls.plan.geoJson).toBeNull();
    });

    it('does not cancel a run that has already finished', async () => {
      const run = await finishedRun(demo);
      const res = await demo.gql(CANCEL, { runId: run.runId });
      expect(codeOf(res)).toBe('CONFLICT');
    });
  });
});
