import { INPUT_KEYS } from '../../data/inputFormats';
import { Depot } from '../../types/company.types';
import { LatLng } from '../../types/geo.types';
import {
  CustomerNode,
  DepotNode,
  IssueDetail,
  Located,
  NodeAddress,
  NodeProduct,
  OrderDraft,
  ProductMasterEntry,
  REPLACE_TYPE,
  SheetData,
  TransformFile,
  TransformInput,
  TransformIssue,
  TransformOutcome,
  VALIDATION_TYPE,
} from '../../types/pipeline.types';
import { haversineKm, isInsideThailand, parseLatLng, round } from '../../utils/geo';
import { isTimeString, timeToMinutes } from '../../utils/time';
import { geocodeAddress } from './geocoder';
import { text } from './spreadsheet';

const MAX_ISSUES_PER_FILE = 100;
const DEFAULT_UNIT_WEIGHT_KG = 5;
const DEFAULT_UNIT_VOLUME_M3 = 0.01;

// How far a given coordinate may sit from the centre of the area its address names before the
// address is trusted over the coordinate
const SUBDISTRICT_RADIUS_KM = 6;
const DISTRICT_RADIUS_KM = 15;
const CENTROID_JITTER_DEGREES = 0.004;

function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

// Several orders resolved to the same centre point would stack on the map; each gets a small,
// repeatable offset of its own
function jitter(point: LatLng, seed: string): LatLng {
  const h = hash(seed);
  const dLat = (((h & 0xffff) / 0xffff) * 2 - 1) * CENTROID_JITTER_DEGREES;
  const dLng = ((((h >>> 16) & 0xffff) / 0xffff) * 2 - 1) * CENTROID_JITTER_DEGREES;
  return { latitude: round(point.latitude + dLat, 6), longitude: round(point.longitude + dLng, 6) };
}

function locate(draft: OrderDraft): Located {
  const hit = geocodeAddress(draft.address);
  const processedAddress: NodeAddress = hit
    ? {
        address: draft.address.address,
        subdistrict: hit.subdistrict ?? draft.address.subdistrict,
        district: hit.district ?? draft.address.district,
        province: hit.province,
        postalCode: draft.address.postalCode ?? hit.postalCode,
      }
    : draft.address;

  const centroid = (): Located => {
    if (!hit) {
      return {
        latitude: null,
        longitude: null,
        replaceType: REPLACE_TYPE.none,
        validationType: VALIDATION_TYPE.noValid,
        grade: 'C',
        processedAddress,
        geocoded: true,
      };
    }
    const point = jitter(hit, draft.orderId);
    const replaceType =
      hit.level === 'subdistrict'
        ? REPLACE_TYPE.subdistrict
        : hit.level === 'district'
          ? REPLACE_TYPE.district
          : REPLACE_TYPE.province;
    return {
      ...point,
      replaceType,
      validationType: draft.point ? VALIDATION_TYPE.province : VALIDATION_TYPE.nanInput,
      grade: hit.level === 'province' ? 'C' : 'B',
      processedAddress,
      geocoded: true,
    };
  };

  if (!draft.point) return centroid();

  const given = {
    latitude: round(draft.point.latitude, 6),
    longitude: round(draft.point.longitude, 6),
    replaceType: REPLACE_TYPE.none,
    processedAddress,
    geocoded: false,
  };

  if (!hit || hit.level === 'province') {
    return { ...given, validationType: VALIDATION_TYPE.nonValidated, grade: 'C' };
  }

  const distanceKm = haversineKm(draft.point, hit);
  if (hit.level === 'subdistrict' && distanceKm <= SUBDISTRICT_RADIUS_KM) {
    return { ...given, validationType: VALIDATION_TYPE.subdistrict, grade: 'A' };
  }
  if (distanceKm <= DISTRICT_RADIUS_KM) {
    return { ...given, validationType: VALIDATION_TYPE.district, grade: 'A' };
  }
  return centroid();
}

function toDepotNode(depot: Depot): DepotNode {
  return {
    id: depot.depotId,
    depotId: depot.depotId,
    depotName: depot.depotName,
    nodeId: depot.depotId,
    index: 0,
    name: depot.depotName,
    isDepot: true,
    latitude: depot.latitude,
    longitude: depot.longitude,
    timeWindowEarly: depot.timeWindowEarly,
    timeWindowLate: depot.timeWindowLate,
    createdAt: depot.createdAt.toISOString(),
    updatedAt: depot.updatedAt.toISOString(),
    columns: [],
    inputdata: depot.inputdata,
    deliveryWeight: 0,
    pickupWeight: 0,
    deliveryVolume: 0,
    pickupVolume: 0,
    serviceDuration: 0,
    zone: '',
    required: true,
  };
}

function failure(message: string, error: TransformIssue[]): TransformOutcome {
  return {
    result: { statusCode: '422', message, isSuccesses: false, isWarning: false, warning: [], error },
    locations: null,
    geocodedCount: 0,
  };
}

const cap = (details: IssueDetail[]): IssueDetail[] => details.slice(0, MAX_ISSUES_PER_FILE);

function readTimeWindows(
  file: TransformFile | undefined,
  issues: IssueDetail[],
): Map<string, [number, number]> {
  const windows = new Map<string, [number, number]>();
  if (!file) return windows;

  for (const [index, row] of file.sheet.rows.entries()) {
    const rowNumber = index + 2;
    const orderId = text(row['ORDERID_ORG']);
    if (!orderId) continue;

    const early = text(row['TIME_WINDOW_EARLY']);
    const late = text(row['TIME_WINDOW_LATE']);
    if (!isTimeString(early)) {
      issues.push({ type: 'val_datetime_parsing', input: early, location: [rowNumber, 'TIME_WINDOW_EARLY'] });
      continue;
    }
    if (!isTimeString(late)) {
      issues.push({ type: 'val_datetime_parsing', input: late, location: [rowNumber, 'TIME_WINDOW_LATE'] });
      continue;
    }
    windows.set(orderId, [timeToMinutes(early), timeToMinutes(late)]);
  }
  return windows;
}

function readOrders(file: TransformFile, issues: IssueDetail[]): OrderDraft[] {
  const drafts = new Map<string, OrderDraft>();

  for (const [index, row] of file.sheet.rows.entries()) {
    const rowNumber = index + 2;
    const orderId = text(row['ORDERID_ORG']);
    if (!orderId) {
      issues.push({ type: 'val_missing', input: null, location: [rowNumber, 'ORDERID_ORG'] });
      continue;
    }

    const productId = text(row['PRODUCTID']);
    if (!productId) issues.push({ type: 'val_missing', input: null, location: [rowNumber, 'PRODUCTID'] });

    const quantityText = text(row['QUANTITYMAIN']);
    const quantity = Number(quantityText);
    if (!quantityText) {
      issues.push({ type: 'val_missing', input: null, location: [rowNumber, 'QUANTITYMAIN'] });
    } else if (!Number.isFinite(quantity)) {
      issues.push({ type: 'val_float_parsing', input: quantityText, location: [rowNumber, 'QUANTITYMAIN'] });
    } else if (quantity <= 0) {
      issues.push({
        type: 'val_greater_than',
        input: quantity,
        inputType: 'float',
        location: [rowNumber, 'QUANTITYMAIN'],
        context: { limitValue: 0 },
      });
    }

    let draft = drafts.get(orderId);
    if (!draft) {
      const latLngText = text(row['LatLng']);
      const parsed = latLngText ? parseLatLng(latLngText) : null;
      if (latLngText && !parsed) {
        issues.push({ type: 'val_str_matches', input: latLngText, location: [rowNumber, 'LatLng'] });
      }
      const zip = Number(text(row['ZIPCODE']));

      draft = {
        orderId,
        row: rowNumber,
        customerName: text(row['CUSTOMER_NAME']),
        tel: text(row['TEL']),
        channel: text(row['CHANNEL']),
        address: {
          address: text(row['ADDRESS']),
          subdistrict: text(row['TUMBOL']) || null,
          district: text(row['AUMPHER']) || null,
          province: text(row['PROVINCE']) || text(row['PROVICE']) || null,
          postalCode: Number.isFinite(zip) && zip > 0 ? zip : null,
        },
        point: parsed && isInsideThailand(parsed) ? parsed : null,
        products: new Map(),
      };
      drafts.set(orderId, draft);
    }

    if (productId && Number.isFinite(quantity) && quantity > 0) {
      const unitWeight = Number(text(row['WEIGHT_KG']));
      const existing = draft.products.get(productId);
      draft.products.set(productId, {
        name: text(row['PRODUCTNAME']) || existing?.name || productId,
        quantity: (existing?.quantity ?? 0) + quantity,
        unitWeight:
          Number.isFinite(unitWeight) && unitWeight > 0 ? unitWeight : (existing?.unitWeight ?? null),
      });
    }
  }
  return [...drafts.values()];
}

export function transformOrders(input: TransformInput): TransformOutcome {
  const { depot, files, productMaster, serviceDurationMin } = input;

  const errors: TransformIssue[] = [];
  for (const file of files) {
    const required = depot.inputdata.find((item) => item.keyName === file.keyName)?.columnRequired ?? [];
    const missing = required.filter((column) => !file.sheet.headers.includes(column));
    if (missing.length) {
      errors.push({
        title: file.fileName,
        detail: missing.map((column) => ({
          type: 'val_column_in_dataframe',
          input: null,
          location: [0, column],
        })),
      });
    }
  }
  if (errors.length) return failure('Some required columns are missing from the uploaded files.', errors);

  const orderFile =
    files.find((file) => file.keyName === INPUT_KEYS.preorder) ??
    files.find((file) => ['ORDERID_ORG', 'PRODUCTID'].every((column) => file.sheet.headers.includes(column)));
  if (!orderFile) {
    return failure('No order file was uploaded.', [
      {
        title: 'orders',
        detail: [{ type: 'val_column_in_dataframe', input: null, location: [0, 'ORDERID_ORG'] }],
      },
    ]);
  }

  const orderIssues: IssueDetail[] = [];
  const drafts = readOrders(orderFile, orderIssues);
  if (orderIssues.length) errors.push({ title: orderFile.fileName, detail: cap(orderIssues) });

  const windowFile = files.find((file) => file.keyName === INPUT_KEYS.timeWindow);
  const windowIssues: IssueDetail[] = [];
  const windows = readTimeWindows(windowFile, windowIssues);
  if (windowFile && windowIssues.length)
    errors.push({ title: windowFile.fileName, detail: cap(windowIssues) });

  if (errors.length) return failure('The uploaded files contain invalid rows.', errors);
  if (!drafts.length) {
    return failure('The order file has no rows.', [
      {
        title: orderFile.fileName,
        detail: [{ type: 'val_missing', input: null, location: [2, 'ORDERID_ORG'] }],
      },
    ]);
  }

  const depotEarly = timeToMinutes(depot.timeWindowEarly, 8 * 60);
  const depotLate = timeToMinutes(depot.timeWindowLate, 18 * 60);
  const missingProducts = new Map<string, IssueDetail>();
  let geocodedCount = 0;

  const customers = drafts.map((draft, position): CustomerNode => {
    const located = locate(draft);
    if (located.geocoded) geocodedCount++;

    let weight = 0;
    let volume = 0;
    const productQuantity: NodeProduct[] = [];
    const missing: NodeProduct[] = [];
    const zeroWeightIds: string[] = [];

    for (const [productId, line] of draft.products) {
      const master = productMaster?.get(productId);
      const product: NodeProduct = {
        productId,
        skuCode: master?.skuCode ?? productId,
        name: master?.name ?? line.name,
        packagingType: master?.packagingType ?? '',
        productQuantity: line.quantity,
      };
      productQuantity.push(product);

      if (productMaster && !master) {
        missing.push(product);
        if (!missingProducts.has(productId)) {
          missingProducts.set(productId, {
            type: 'missing_product',
            input: productId,
            location: [draft.row, 'PRODUCTID'],
            context: {
              missing_product_quantity: {
                productId,
                skuCode: product.skuCode,
                name: product.name,
                packagingType: product.packagingType || '-',
              },
            },
          });
        }
        continue;
      }

      const unitWeight = master?.weightKg ?? line.unitWeight ?? DEFAULT_UNIT_WEIGHT_KG;
      if (unitWeight <= 0) zeroWeightIds.push(productId);
      weight += unitWeight * line.quantity;
      volume += (master?.volumeM3 ?? DEFAULT_UNIT_VOLUME_M3) * line.quantity;
    }

    const window = windows.get(draft.orderId);
    const index = position + 1;

    return {
      latitude: located.latitude,
      longitude: located.longitude,
      grade: located.grade,
      validationType: located.validationType,
      replaceType: located.replaceType,
      originalAddress: draft.address,
      processedAddress: located.processedAddress,
      nodeId: draft.orderId,
      index,
      name: draft.orderId,
      deliveryWeight: round(weight, 2),
      pickupWeight: 0,
      deliveryVolume: round(volume, 4),
      pickupVolume: 0,
      serviceDuration: serviceDurationMin,
      loadingDuration: 0,
      timeWindowEarly: window?.[0] ?? depotEarly,
      timeWindowLate: window?.[1] ?? depotLate,
      priorityGroup: 0,
      priority: 0,
      prize: 0,
      zone: located.processedAddress.district ?? located.processedAddress.province ?? '',
      isDepot: false,
      required: true,
      metrics: {
        excessWeight: 0,
        excessVolume: 0,
        excessDistance: 0,
        excessDuration: 0,
        hasExcessWeight: false,
        hasExcessVolume: false,
        hasExcessDistance: false,
        hasExcessDuration: false,
        hasMissingProducts: missing.length > 0,
        isNodeFeasible: true,
        associatedProductQuantity: productQuantity,
        missingProductQuantity: missing,
        productIds: zeroWeightIds,
        missingProductIds: missing.map((product) => product.productId),
      },
      productQuantity,
      label: index,
      allowVehicleGroupId: [],
      additionalProperties: {
        channel: draft.channel,
        telephone: draft.tel,
        customerName: draft.customerName,
        row: draft.row,
      },
      extra: {
        orderId: draft.orderId,
        channel: draft.channel,
        customerName: draft.customerName,
        tel: draft.tel,
        productsInfo: [],
      },
    };
  });

  const warning: TransformIssue[] = missingProducts.size
    ? [{ title: 'products', detail: [...missingProducts.values()] }]
    : [];
  const failedGeocodes = customers.filter((customer) => customer.latitude === null).length;

  return {
    result: {
      statusCode: '200',
      message: `Transformed ${customers.length} orders from ${orderFile.fileName}.`,
      isSuccesses: true,
      isWarning: warning.length > 0,
      warning,
      error: [],
      data: {
        geoServiceStats: {
          totalGeocodeCount: geocodedCount,
          totalSuccessfulGeocode: geocodedCount - failedGeocodes,
          totalFailedGeocode: failedGeocodes,
          sourceStats: [{ source: 'gazetteer', count: geocodedCount }],
        },
        outputPaths: { locations: 'transform/locations.json' },
      },
    },
    locations: { customers, depots: [toDepotNode(depot)] },
    geocodedCount,
  };
}

export function toProductMaster(sheet: SheetData): Map<string, ProductMasterEntry> {
  const master = new Map<string, ProductMasterEntry>();
  for (const row of sheet.rows) {
    const productId = text(row['PRODUCTID']);
    if (!productId) continue;
    const weightKg = Number(text(row['WEIGHT_KG']));
    const volumeM3 = Number(text(row['VOLUME_M3']));
    master.set(productId, {
      productId,
      skuCode: text(row['SKU_CODE']) || productId,
      name: text(row['PRODUCTNAME']) || productId,
      packagingType: text(row['PACKAGING_TYPE']),
      weightKg: Number.isFinite(weightKg) ? weightKg : 0,
      volumeM3: Number.isFinite(volumeM3) ? volumeM3 : 0,
    });
  }
  return master;
}
