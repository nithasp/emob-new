import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../../config';
import pool from '../../database';
import {
  ACTUAL_LOCATION_NAME,
  CUSTOMER_MASTER_NAME,
  INPUT_KEYS,
  PRODUCT_MASTER_NAME,
} from '../../data/inputFormats';
import {
  experimentRunner,
  experimentService,
  repositories,
  storageService,
  userService,
} from '../../services';
import { scopeToDepot, toConstraint } from '../../services/parameter.service';
import { buildWorkbook } from '../../services/pipeline/spreadsheet';
import { companyPrefix, configurationPrefix } from '../../services/storage/keys';
import { ACTUAL_CATEGORY } from '../../types/configuration.types';
import { CellValue } from '../../types/pipeline.types';
import {
  DepotKey,
  GeneratedOrders,
  Owner,
  Scenario,
  SeededVehicleType,
  TypeKey,
} from '../../types/seed.types';
import { PublicUser } from '../../types/user.types';
import {
  SEED_CONFIGURATION_COLUMNS,
  SEED_DEPOTS,
  SEED_INPUT_DATA,
  SEED_PARAMETERS,
  SEED_PRODUCTS,
  SEED_VEHICLE_TYPES,
} from './catalog';
import { Random, generateOrders } from './orders';

const SAMPLE_DIR = path.resolve(__dirname, '..', '..', '..', 'sample-data');
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const HOUR_MS = 60 * 60 * 1000;

let log: (message: string) => void = console.log;

const SCENARIOS: Scenario[] = [
  {
    name: 'preorder_bangna_week40_mon',
    depot: 'bangna',
    owner: 'demo',
    ageHours: 30,
    orderPrefix: 'BN-MON',
    orders: { seed: 4101, orderCount: 58, missingCoordinateShare: 0.06 },
    stage: 'Succeeded',
    solveSeconds: 94,
    fleet: [
      { type: 'evVan', plates: 3 },
      { type: 'box', plates: 3 },
      { type: 'evTruck', plates: 2 },
      { type: 'pickup', count: 2 },
    ],
  },
  {
    name: 'preorder_rangsit_week40_mon',
    depot: 'rangsit',
    owner: 'somchai',
    ageHours: 52,
    orderPrefix: 'RS-MON',
    orders: { seed: 5202, orderCount: 46, missingCoordinateShare: 0.05, unlistedProductOrders: 2 },
    stage: 'Succeeded',
    solveSeconds: 71,
    fleet: [
      { type: 'box', count: 3 },
      { type: 'sixWheel', plates: 2 },
      { type: 'pickup', plates: 2 },
    ],
  },
  {
    name: 'preorder_nonthaburi_week39_fri',
    depot: 'nonthaburi',
    owner: 'nattaya',
    ageHours: 98,
    orderPrefix: 'NB-FRI',
    orders: { seed: 6303, orderCount: 38, mismatchedCoordinates: 2 },
    stage: 'Succeeded',
    solveSeconds: 58,
    fleet: [
      { type: 'evVan', count: 3 },
      { type: 'box', count: 2 },
      { type: 'evTruck', count: 1 },
    ],
  },
  {
    name: 'preorder_bangna_week39_thu',
    depot: 'bangna',
    owner: 'demo',
    ageHours: 126,
    orderPrefix: 'BN-THU',
    orders: { seed: 7404, orderCount: 52, missingCoordinateShare: 0.04 },
    stage: 'Failed',
    solveSeconds: 300,
    fleet: [
      { type: 'pickup', count: 3 },
      { type: 'box', count: 2 },
      { type: 'sixWheel', count: 2 },
    ],
    rerun: {
      name: 'preorder_bangna_week39_thu',
      ageHours: 122,
      solveSeconds: 88,
      fleet: [
        { type: 'pickup', count: 3 },
        { type: 'box', count: 3 },
        { type: 'sixWheel', count: 2 },
      ],
    },
  },
  {
    name: 'preorder_rangsit_week39_wed',
    depot: 'rangsit',
    owner: 'somchai',
    ageHours: 150,
    orderPrefix: 'RS-WED',
    orders: { seed: 8505, orderCount: 41 },
    stage: 'Cancelled',
    solveSeconds: 12,
    fleet: [
      { type: 'box', count: 4 },
      { type: 'pickup', count: 2 },
    ],
  },
  {
    name: 'preorder_bangna_week40_tue',
    depot: 'bangna',
    owner: 'demo',
    ageHours: 2,
    orderPrefix: 'BN-TUE',
    orders: {
      seed: 9606,
      orderCount: 54,
      missingCoordinateShare: 0.1,
      mismatchedCoordinates: 2,
      unknownAreas: 1,
      unlistedProductOrders: 2,
    },
    stage: 'validated',
    fleet: [
      { type: 'evVan', plates: 4 },
      { type: 'box', count: 3 },
      { type: 'evTruck', plates: 2 },
    ],
  },
  {
    name: 'preorder_nonthaburi_week40_tue',
    depot: 'nonthaburi',
    owner: 'nattaya',
    ageHours: 1,
    orderPrefix: 'NB-TUE',
    orders: { seed: 1707, orderCount: 33, missingCoordinateShare: 0.08 },
    stage: 'uploaded',
    fleet: [],
  },
];

const randomPassword = (): string => crypto.randomBytes(18).toString('base64url');

async function seedUsers(companyId: string): Promise<Record<Owner, PublicUser>> {
  const generated: string[] = [];
  const passwordFor = (label: string, configured: string | undefined): string => {
    if (configured) return configured;
    const password = randomPassword();
    generated.push(`  ${label}: ${password}`);
    return password;
  };

  const demo = await userService.upsertAccount({
    companyId,
    username: config.demo.username,
    password: passwordFor(`${config.demo.username} (planner)`, config.demo.password),
    firstName: 'Demo',
    lastName: 'Planner',
    role: 'BRS',
  });
  await userService.upsertAccount({
    companyId,
    username: config.adminSeed.username,
    password: passwordFor(`${config.adminSeed.username} (admin)`, config.adminSeed.password),
    firstName: 'System',
    lastName: 'Admin',
    role: 'Admin',
  });
  // Colleagues exist to own some of the runs; nobody signs in as them
  const somchai = await userService.upsertAccount({
    companyId,
    username: 'somchai',
    password: randomPassword(),
    firstName: 'Somchai',
    lastName: 'Rattanakul',
    role: 'BRS',
  });
  const nattaya = await userService.upsertAccount({
    companyId,
    username: 'nattaya',
    password: randomPassword(),
    firstName: 'Nattaya',
    lastName: 'Srisuk',
    role: 'BRS',
  });

  if (generated.length) {
    log('[seed] generated passwords (set DEMO_PASSWORD / ADMIN_PASSWORD in .env to choose your own):');
    log(generated.join('\n'));
  }
  return { demo, somchai, nattaya };
}

// A re-seed starts from a clean workspace: the company's rows and stored files are removed, the
// accounts and their sessions are kept
async function resetCompany(companyId: string): Promise<void> {
  for (const table of [
    'experiments',
    'configurations',
    'dynamic_parameters',
    'vehicles',
    'vehicle_types',
    'depots',
  ]) {
    await pool.query(`DELETE FROM ${table} WHERE company_id = $1`, [companyId]);
  }
  await storageService.deletePrefix(companyPrefix(companyId));
}

async function seedDepots(companyId: string): Promise<Record<DepotKey, string>> {
  const ids = {} as Record<DepotKey, string>;
  for (const [sortOrder, depot] of SEED_DEPOTS.entries()) {
    const depotId = await repositories.depots.create({ companyId, sortOrder, ...depot });
    ids[depot.key] = depotId;
    for (const [inputOrder, input] of SEED_INPUT_DATA.entries()) {
      await repositories.depots.addInputData({ depotId, sortOrder: inputOrder, ...input });
    }
  }
  return ids;
}

async function seedVehicles(
  companyId: string,
  depotIds: Record<DepotKey, string>,
): Promise<Record<TypeKey, SeededVehicleType>> {
  const homes = Object.values(depotIds);
  const seeded = {} as Record<TypeKey, SeededVehicleType>;
  let counter = 0;

  for (const entry of SEED_VEHICLE_TYPES) {
    const type = await repositories.vehicleTypes.create(companyId, entry.type);
    const vehicleIds: string[] = [];
    for (const licensePlate of entry.licensePlates) {
      const home = homes[counter++ % homes.length] ?? homes[0] ?? '';
      const vehicle = await repositories.vehicles.create(companyId, {
        licensePlate,
        startDepotId: home,
        endDepotId: home,
        vehicleTypeId: type.vehicleTypeId,
      });
      vehicleIds.push(vehicle.vehicleId);
    }
    seeded[entry.key] = { vehicleTypeId: type.vehicleTypeId, vehicleIds };
  }
  const inWorkshop = seeded.box.vehicleIds.pop();
  if (inWorkshop) await repositories.vehicles.update(companyId, inWorkshop, { isActive: false });
  return seeded;
}

async function seedParameters(companyId: string, depotIds: Record<DepotKey, string>): Promise<void> {
  for (const depot of SEED_DEPOTS) {
    for (const [sortOrder, parameter] of SEED_PARAMETERS.entries()) {
      const value =
        parameter.keyName === 'EarlyDeliveryTime'
          ? depot.timeWindowEarly
          : parameter.keyName === 'BackToDepotTime'
            ? depot.timeWindowLate
            : parameter.value;
      await repositories.parameters.create({
        companyId,
        depotId: depotIds[depot.key],
        sortOrder,
        isRequired: true,
        defaultValue: parameter.value,
        ...parameter,
        value,
      });
    }
  }
}

async function addConfiguration(
  companyId: string,
  depotId: string,
  configuration: { name: string; category: string; columns: string[]; replace: boolean; timestamp?: Date },
  file?: { fileName: string; content: Buffer },
): Promise<void> {
  const row = await repositories.configurations.create({
    companyId,
    depotId,
    type: 'xlsx',
    fileBlobPath: '',
    ...configuration,
  });
  if (!file) return;

  const key = `${configurationPrefix(companyId, row.id)}/${Date.now()}/${file.fileName}`;
  await storageService.put(key, file.content);
  await pool.query('UPDATE configurations SET file_blob_path = $2 WHERE id = $1', [row.id, key]);
}

function customerMasterRows(orders: GeneratedOrders): CellValue[][] {
  const seen = new Set<string>();
  const rows: CellValue[][] = [];
  for (const row of orders.rows) {
    const orderId = String(row[0]);
    if (seen.has(orderId)) continue;
    seen.add(orderId);
    rows.push([
      `C-${orderId}`,
      row[1] ?? '',
      row[3] ?? '',
      row[4] ?? '',
      row[5] ?? '',
      row[6] ?? '',
      row[7] ?? '',
      row[8] ?? '',
      row[9] ?? '',
    ]);
  }
  return rows;
}

async function seedConfigurations(companyId: string, depotIds: Record<DepotKey, string>): Promise<void> {
  const productMaster = await buildWorkbook([
    {
      name: 'Products',
      headers: SEED_CONFIGURATION_COLUMNS.product,
      rows: SEED_PRODUCTS.map((item) => [
        item.productId,
        item.skuCode,
        item.name,
        item.packagingType,
        item.weightKg,
        item.volumeM3,
      ]),
      columnWidths: [12, 14, 40, 16, 12, 12],
    },
  ]);
  const now = new Date();

  for (const [depotIndex, depot] of SEED_DEPOTS.entries()) {
    const depotId = depotIds[depot.key];
    const customers = generateOrders({
      seed: 300 + depotIndex,
      depot,
      orderCount: 45,
      orderPrefix: depot.key.toUpperCase(),
    });

    await addConfiguration(
      companyId,
      depotId,
      {
        name: PRODUCT_MASTER_NAME,
        category: 'master',
        columns: SEED_CONFIGURATION_COLUMNS.product,
        replace: true,
      },
      { fileName: 'product_master.xlsx', content: productMaster },
    );
    await addConfiguration(
      companyId,
      depotId,
      {
        name: CUSTOMER_MASTER_NAME,
        category: 'master',
        columns: SEED_CONFIGURATION_COLUMNS.customer,
        replace: true,
      },
      {
        fileName: 'customer_master.xlsx',
        content: await buildWorkbook([
          {
            name: 'Customers',
            headers: SEED_CONFIGURATION_COLUMNS.customer,
            rows: customerMasterRows(customers),
          },
        ]),
      },
    );

    // The empty row is the slot the "Update" menu uploads into; the dated ones are its history
    await addConfiguration(companyId, depotId, {
      name: ACTUAL_LOCATION_NAME,
      category: ACTUAL_CATEGORY,
      columns: SEED_CONFIGURATION_COLUMNS.actual,
      replace: false,
    });

    const random = new Random(900 + depotIndex);
    for (let monthsAgo = 3; monthsAgo >= 1; monthsAgo--) {
      const timestamp = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 26, 17, 30);
      const label = `${timestamp.getFullYear()}_${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
      const rows = customerMasterRows(customers)
        .slice(0, 30)
        .map((row, index): CellValue[] => [
          `${depot.key.toUpperCase()}-${label}-${String(index + 1).padStart(4, '0')}`,
          row[1] ?? '',
          `${timestamp.toISOString().slice(0, 8)}${String(random.int(1, 25)).padStart(2, '0')} ${random.int(9, 16)}:${String(random.int(0, 59)).padStart(2, '0')}`,
          row[8] ?? '',
          random.pick(['Kittipong', 'Surachai', 'Anan', 'Prasert', 'Wirat']),
        ]);
      await addConfiguration(
        companyId,
        depotId,
        {
          name: `actual_location_${label}.xlsx`,
          category: ACTUAL_CATEGORY,
          columns: SEED_CONFIGURATION_COLUMNS.actual,
          replace: false,
          timestamp,
        },
        {
          fileName: `actual_location_${label}.xlsx`,
          content: await buildWorkbook([
            { name: 'Actual', headers: SEED_CONFIGURATION_COLUMNS.actual, rows },
          ]),
        },
      );
    }
  }
}

function vehiclesOf(fleet: Scenario['fleet'], types: Record<TypeKey, SeededVehicleType>) {
  return fleet.map((entry) => {
    const seeded = types[entry.type];
    return {
      vehicleTypeId: seeded.vehicleTypeId,
      ...(entry.plates ? { vehicleId: seeded.vehicleIds.slice(0, entry.plates) } : {}),
      ...(entry.count ? { numberOfVehiclesAvailable: entry.count } : {}),
    };
  });
}

async function seedExperiments(
  companyId: string,
  owners: Record<Owner, PublicUser>,
  depotIds: Record<DepotKey, string>,
  types: Record<TypeKey, SeededVehicleType>,
): Promise<void> {
  const now = Date.now();

  for (const scenario of SCENARIOS) {
    const depot = SEED_DEPOTS.find((candidate) => candidate.key === scenario.depot);
    if (!depot) continue;
    const owner = owners[scenario.owner];
    const depotId = depotIds[scenario.depot];
    const createdAt = new Date(now - scenario.ageHours * HOUR_MS);

    const runId = await repositories.experiments.create({
      companyId,
      name: scenario.name,
      triggeredBy: owner.id,
      timestamp: createdAt,
    });

    const orders = generateOrders({ ...scenario.orders, depot, orderPrefix: scenario.orderPrefix });
    const upload = await experimentService.uploadPreOrder(owner, { runId, depotId: [depotId] }, [
      {
        keyName: INPUT_KEYS.preorder,
        file: { filename: `${scenario.name}.xlsx`, mimetype: XLSX, content: await orders.workbook() },
      },
    ]);
    if (!upload.result.isSuccesses) throw new Error(`${scenario.name}: ${upload.result.message}`);

    const constraint = toConstraint(
      scopeToDepot(await repositories.parameters.listForDepot(companyId, depotId), depotId),
    );
    const validate = (id: string, fleet: Scenario['fleet']) =>
      experimentService.validate(owner, {
        runId: id,
        parameter: constraint,
        updateLocation: { customers: [] },
        vehicles: vehiclesOf(fleet, types),
      });

    const finish = async (id: string, startedAt: Date, seconds: number): Promise<void> => {
      await repositories.experiments.transition(id, ['Initializing'], { status: 'Queued' });
      await experimentRunner.runNow(id);
      await repositories.experiments.update(id, {
        timeStart: startedAt,
        timeEnd: new Date(startedAt.getTime() + seconds * 1000),
        timeDuration: seconds * 1000,
      });
    };

    const startedAt = new Date(createdAt.getTime() + 9 * 60 * 1000);
    const seconds = scenario.solveSeconds ?? 60;
    let outcome: string = scenario.stage;

    if (scenario.stage !== 'uploaded') {
      const { result } = await validate(runId, scenario.fleet);
      if (!result.isSuccesses) throw new Error(`${scenario.name}: ${result.message}`);
    }

    if (scenario.stage === 'Succeeded') {
      await finish(runId, startedAt, seconds);
    } else if (scenario.stage === 'Failed' || scenario.stage === 'Cancelled') {
      await repositories.experiments.update(runId, {
        status: scenario.stage,
        timeStart: startedAt,
        timeEnd: new Date(startedAt.getTime() + seconds * 1000),
        timeDuration: seconds * 1000,
        errorMessage:
          scenario.stage === 'Failed' ? 'The planning service did not answer within the time limit.' : null,
      });
    }

    if (scenario.rerun) {
      const copy = await experimentService.replicate(owner, runId);
      const copiedAt = new Date(now - scenario.rerun.ageHours * HOUR_MS);
      await repositories.experiments.update(copy.runId, { timestamp: copiedAt, name: scenario.rerun.name });
      await validate(copy.runId, scenario.rerun.fleet);
      await finish(copy.runId, new Date(copiedAt.getTime() + 6 * 60 * 1000), scenario.rerun.solveSeconds);
      outcome += ' + rerun Succeeded';
    }

    log(
      `[seed] experiment ${scenario.name.padEnd(34)} ${String(orders.orderIds.length).padStart(3)} orders  ${outcome}`,
    );
  }
}

async function writeSampleFiles(): Promise<void> {
  await fs.mkdir(SAMPLE_DIR, { recursive: true });
  const write = (name: string, content: Buffer) => fs.writeFile(path.join(SAMPLE_DIR, name), content);

  for (const [index, depot] of SEED_DEPOTS.entries()) {
    const orders = generateOrders({
      seed: 2000 + index,
      depot,
      orderCount: 48,
      orderPrefix: `${depot.key.slice(0, 2).toUpperCase()}-SAMPLE`,
      missingCoordinateShare: 0.08,
      mismatchedCoordinates: 1,
      unlistedProductOrders: 1,
    });
    await write(`preorder_${depot.key}_sample.xlsx`, await orders.workbook());
    await write(`time_window_${depot.key}_sample.csv`, orders.timeWindows());
  }

  const [bangna] = SEED_DEPOTS;
  if (bangna) {
    const broken = generateOrders({ seed: 2999, depot: bangna, orderCount: 12, orderPrefix: 'BN-INVALID' });
    const quantity = 12;
    const latLng = 9;
    const first = broken.rows[1];
    const second = broken.rows[4];
    const third = broken.rows[0];
    if (first) first[quantity] = 'ten';
    if (second) second[quantity] = 0;
    if (third) third[latLng] = 'Bang Na, Bangkok';
    await write('preorder_invalid_rows_sample.xlsx', await broken.workbook());
  }

  await write(
    'product_master.xlsx',
    await buildWorkbook([
      {
        name: 'Products',
        headers: SEED_CONFIGURATION_COLUMNS.product,
        rows: SEED_PRODUCTS.map((item) => [
          item.productId,
          item.skuCode,
          item.name,
          item.packagingType,
          item.weightKg,
          item.volumeM3,
        ]),
      },
    ]),
  );
}

export async function seedWorkspace(options: { quiet?: boolean } = {}): Promise<void> {
  log = options.quiet ? () => undefined : console.log;
  const started = Date.now();
  const company = await repositories.companies.upsert(config.demo.companyName, 'Single');
  const owners = await seedUsers(company.id);

  await resetCompany(company.id);
  const depotIds = await seedDepots(company.id);
  const types = await seedVehicles(company.id, depotIds);
  await seedParameters(company.id, depotIds);
  await seedConfigurations(company.id, depotIds);
  await seedExperiments(company.id, owners, depotIds, types);
  await writeSampleFiles();

  log(
    `[seed] done in ${((Date.now() - started) / 1000).toFixed(1)}s — company "${company.companyName}", ` +
      `${SEED_DEPOTS.length} depots, ${SEED_VEHICLE_TYPES.length} vehicle types, storage: ${storageService.driverName}`,
  );
  log(`[seed] sign in as "${config.demo.username}", or open the web app and enter as a guest`);
}
