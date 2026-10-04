import { GAZETTEER } from '../../data/gazetteer';
import { PREORDER_COLUMNS, TIME_WINDOW_COLUMNS } from '../../data/inputFormats';
import { subdistrictPoint } from '../../services/pipeline/geocoder';
import { buildCsv, buildWorkbook } from '../../services/pipeline/spreadsheet';
import { CellValue } from '../../types/pipeline.types';
import { Area, GeneratedOrders, OrderOptions, SeedDepot, SeedProduct } from '../../types/seed.types';
import { haversineKm, round } from '../../utils/geo';
import { SEED_PRODUCTS, UNLISTED_PRODUCTS } from './catalog';

// Deterministic generator: the same seed always produces the same orders, so a re-seed leaves the
// demo looking the way it did
export class Random {
  constructor(private state: number) {}

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)] as T;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Roughly bell-shaped around zero, within +/- spread. */
  spread(spread: number): number {
    return ((this.next() + this.next() + this.next()) / 3 - 0.5) * 2 * spread;
  }
}

const SHOP_KINDS = [
  { suffix: 'Minimart', channel: 'Traditional Trade' },
  { suffix: 'Grocery', channel: 'Traditional Trade' },
  { suffix: 'Convenience Store', channel: 'Modern Trade' },
  { suffix: 'Supermarket', channel: 'Modern Trade' },
  { suffix: 'Wholesale', channel: 'Traditional Trade' },
  { suffix: 'Cafe', channel: 'HoReCa' },
  { suffix: 'Restaurant', channel: 'HoReCa' },
  { suffix: 'Canteen', channel: 'HoReCa' },
  { suffix: 'Pharmacy', channel: 'Modern Trade' },
  { suffix: 'Fresh Market Stall', channel: 'Traditional Trade' },
];

const OWNERS = [
  'Somsri',
  'Anong',
  'Pranee',
  'Wichai',
  'Somchai',
  'Malee',
  'Kanya',
  'Narong',
  'Suda',
  'Preecha',
  'Ratana',
  'Boonmee',
  'Chai',
  'Dao',
  'Lamai',
  'Niran',
  'Orawan',
  'Pim',
  'Sunee',
  'Thana',
  'Ubon',
  'Wanida',
  'Yupa',
  'Arthit',
  'Busaba',
  'Chatchai',
  'Duangjai',
  'Kamon',
  'Manee',
  'Nipa',
];

const ROADS = [
  'Sukhumvit',
  'Rama IV',
  'Lat Phrao',
  'Ratchadaphisek',
  'Phahon Yothin',
  'Ram Inthra',
  'Srinagarindra',
  'Bang Na-Trat',
  'Phetkasem',
  'Charan Sanit Wong',
  'Rama II',
  'Rama III',
  'Vibhavadi Rangsit',
  'Chaeng Watthana',
  'Ngam Wong Wan',
  'On Nut',
  'Phatthanakan',
  'Ramkhamhaeng',
  'Tiwanon',
  'Rattanathibet',
  'Theparak',
  'Kanchanaphisek',
  'Lam Luk Ka',
  'Rangsit-Nakhon Nayok',
];

const HEADER_INDEX = Object.fromEntries(PREORDER_COLUMNS.map((column, index) => [column, index]));

function areasNear(depot: SeedDepot): Area[] {
  const areas: Area[] = [];
  for (const province of GAZETTEER) {
    for (const district of province.districts) {
      if (haversineKm(depot, district) > depot.serviceRadiusKm) continue;
      district.subdistricts.forEach((subdistrict, index) => {
        areas.push({
          province: province.en,
          district: district.en,
          subdistrict: subdistrict.en,
          zip: subdistrict.zip,
          ...subdistrictPoint(district, index),
        });
      });
    }
  }
  return areas;
}

function orderLines(
  random: Random,
  products: SeedProduct[],
): Array<{ product: SeedProduct; quantity: number }> {
  const lines = new Map<string, { product: SeedProduct; quantity: number }>();
  const count = random.int(1, 4);
  while (lines.size < count) {
    const product = random.pick(products);
    lines.set(product.productId, { product, quantity: random.int(1, product.weightKg > 15 ? 8 : 18) });
  }
  return [...lines.values()];
}

export function generateOrders(options: OrderOptions): GeneratedOrders {
  const random = new Random(options.seed);
  const areas = areasNear(options.depot);
  const rows: CellValue[][] = [];
  const orderIds: string[] = [];

  let withoutCoordinate = Math.round(options.orderCount * (options.missingCoordinateShare ?? 0));
  let mismatched = options.mismatchedCoordinates ?? 0;
  let unknown = options.unknownAreas ?? 0;
  let unlisted = options.unlistedProductOrders ?? 0;

  for (let i = 0; i < options.orderCount; i++) {
    const area = random.pick(areas);
    const kind = random.pick(SHOP_KINDS);
    const orderId = `${options.orderPrefix}-${String(i + 1).padStart(4, '0')}`;
    orderIds.push(orderId);

    const point = {
      latitude: round(area.latitude + random.spread(0.014), 6),
      longitude: round(area.longitude + random.spread(0.014), 6),
    };

    let latLng = `${point.latitude}, ${point.longitude}`;
    let { district, subdistrict, province } = area;
    let zip: number | string = area.zip;
    const irregular = i > 4 && i % 3 === 0;
    if (irregular && unknown > 0) {
      unknown--;
      latLng = '';
      district = 'N/A';
      subdistrict = '';
      province = 'Unknown';
      zip = '';
    } else if (irregular && mismatched > 0) {
      mismatched--;
      const elsewhere = random.pick(
        areas.filter((candidate) => haversineKm(candidate, area) > 18).concat(area),
      );
      latLng = `${round(elsewhere.latitude + 0.18, 6)}, ${round(elsewhere.longitude - 0.16, 6)}`;
    } else if (irregular && withoutCoordinate > 0) {
      withoutCoordinate--;
      latLng = '';
    }

    const lines = orderLines(random, SEED_PRODUCTS);
    if (irregular && unlisted > 0) {
      unlisted--;
      lines.push({ product: random.pick(UNLISTED_PRODUCTS), quantity: random.int(1, 6) });
    }

    const customerName = `${random.pick(OWNERS)} ${kind.suffix}`;
    const address = `${random.int(1, 399)}/${random.int(1, 60)} Soi ${random.pick(ROADS)} ${random.int(1, 90)}, ${random.pick(ROADS)} Rd.`;
    const tel = random.chance(0.6)
      ? `08${random.int(1, 9)}-${random.int(100, 999)}-${random.int(1000, 9999)}`
      : `02-${random.int(200, 999)}-${random.int(1000, 9999)}`;

    for (const { product, quantity } of lines) {
      const row: CellValue[] = new Array<CellValue>(PREORDER_COLUMNS.length).fill(null);
      const set = (column: string, value: CellValue): void => {
        const index = HEADER_INDEX[column];
        if (index !== undefined) row[index] = value;
      };
      set('ORDERID_ORG', orderId);
      set('CUSTOMER_NAME', customerName);
      set('TEL', tel);
      set('CHANNEL', kind.channel);
      set('ADDRESS', address);
      set('TUMBOL', subdistrict);
      set('AUMPHER', district);
      set('PROVINCE', province);
      set('ZIPCODE', zip);
      set('LatLng', latLng);
      set('PRODUCTID', product.productId);
      set('PRODUCTNAME', product.name);
      set('QUANTITYMAIN', quantity);
      rows.push(row);
    }
  }

  return {
    rows,
    orderIds,
    workbook: () =>
      buildWorkbook([
        {
          name: 'PreOrder',
          headers: PREORDER_COLUMNS,
          rows,
          columnWidths: [18, 28, 14, 18, 44, 22, 22, 16, 10, 24, 12, 36, 14],
        },
      ]),
    timeWindows: () =>
      buildCsv(
        TIME_WINDOW_COLUMNS,
        orderIds
          .filter((_, index) => index % 5 === 0)
          .map((orderId, index) =>
            index % 2 === 0 ? [orderId, '08:00', '12:00'] : [orderId, '13:00', '17:30'],
          ),
      ),
  };
}
