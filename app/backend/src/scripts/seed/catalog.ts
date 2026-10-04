import {
  ACTUAL_LOCATION_COLUMNS,
  CUSTOMER_MASTER_COLUMNS,
  INPUT_KEYS,
  PREORDER_COLUMNS,
  PRODUCT_MASTER_COLUMNS,
  TIME_WINDOW_COLUMNS,
} from '../../data/inputFormats';
import { LocalizedText } from '../../types/parameter.types';
import { SeedDepot, SeedParameter, SeedProduct, SeedVehicleType } from '../../types/seed.types';
import { VehicleTypeWrite } from '../../types/vehicle.types';

export const SEED_DEPOTS: SeedDepot[] = [
  {
    key: 'bangna',
    depotName: 'Bang Na Distribution Center',
    latitude: 13.6685,
    longitude: 100.634,
    timeWindowEarly: '08:00',
    timeWindowLate: '18:00',
    serviceRadiusKm: 17,
  },
  {
    key: 'rangsit',
    depotName: 'Rangsit Distribution Center',
    latitude: 13.987,
    longitude: 100.617,
    timeWindowEarly: '07:30',
    timeWindowLate: '17:30',
    serviceRadiusKm: 19,
  },
  {
    key: 'nonthaburi',
    depotName: 'Nonthaburi Cross-Dock Hub',
    latitude: 13.8605,
    longitude: 100.4415,
    timeWindowEarly: '08:00',
    timeWindowLate: '18:00',
    serviceRadiusKm: 15,
  },
];

export const SEED_INPUT_DATA = [
  {
    keyName: INPUT_KEYS.preorder,
    displayName: 'Pre-Order',
    columnRequired: PREORDER_COLUMNS,
    fileFormatType: 'xlsx',
    required: true,
  },
  {
    keyName: INPUT_KEYS.timeWindow,
    displayName: 'Delivery Time Window',
    columnRequired: TIME_WINDOW_COLUMNS,
    fileFormatType: 'csv',
    required: false,
  },
];

export const SEED_CONFIGURATION_COLUMNS = {
  product: PRODUCT_MASTER_COLUMNS,
  customer: CUSTOMER_MASTER_COLUMNS,
  actual: ACTUAL_LOCATION_COLUMNS,
};

const product = (
  productId: string,
  name: string,
  packagingType: string,
  weightKg: number,
  volumeM3: number,
): SeedProduct => ({ productId, skuCode: `SKU-${productId}`, name, packagingType, weightKg, volumeM3 });

export const SEED_PRODUCTS: SeedProduct[] = [
  product('P1001', 'Drinking Water 600 ml x 12', 'Pack', 7.6, 0.011),
  product('P1002', 'Drinking Water 1.5 L x 6', 'Pack', 9.4, 0.014),
  product('P1003', 'Mineral Water 500 ml x 24', 'Case', 12.8, 0.019),
  product('P1010', 'Cola 325 ml Can x 24', 'Case', 8.6, 0.012),
  product('P1011', 'Cola 1.25 L PET x 12', 'Case', 16.2, 0.024),
  product('P1012', 'Lemon Soda 325 ml Can x 24', 'Case', 8.6, 0.012),
  product('P1020', 'Green Tea 500 ml x 24', 'Case', 13.1, 0.02),
  product('P1021', 'Thai Tea 450 ml x 24', 'Case', 12.2, 0.019),
  product('P1030', 'Energy Drink 150 ml x 50', 'Crate', 14.5, 0.018),
  product('P1031', 'Electrolyte Drink 350 ml x 24', 'Case', 9.3, 0.013),
  product('P1040', 'Soy Milk UHT 300 ml x 36', 'Case', 12.4, 0.017),
  product('P1041', 'UHT Milk 180 ml x 48', 'Case', 10.1, 0.014),
  product('P1050', 'Instant Noodles Tom Yum x 30', 'Carton', 2.4, 0.021),
  product('P1051', 'Instant Noodles Pork x 30', 'Carton', 2.4, 0.021),
  product('P1060', 'Jasmine Rice 5 kg x 4', 'Sack', 20.4, 0.026),
  product('P1061', 'Sticky Rice 5 kg x 4', 'Sack', 20.4, 0.026),
  product('P1070', 'Vegetable Oil 1 L x 12', 'Case', 11.6, 0.016),
  product('P1071', 'Fish Sauce 700 ml x 12', 'Case', 13.9, 0.015),
  product('P1072', 'Soy Sauce 600 ml x 12', 'Case', 11.2, 0.014),
  product('P1080', 'Potato Chips 50 g x 48', 'Carton', 3.1, 0.045),
  product('P1081', 'Seaweed Snack 32 g x 60', 'Carton', 2.6, 0.03),
  product('P1090', 'Canned Tuna 185 g x 48', 'Case', 11.5, 0.012),
  product('P1091', 'Sweetened Condensed Milk 380 g x 48', 'Case', 20.2, 0.016),
  product('P1100', 'Laundry Detergent 800 g x 12', 'Case', 10.3, 0.018),
];

export const UNLISTED_PRODUCTS: SeedProduct[] = [
  product('P9001', 'Seasonal Gift Basket (New)', 'Basket', 0, 0),
  product('P9002', 'Cold Brew Coffee 250 ml x 12 (Trial)', 'Pack', 0, 0),
];

const breaks = [{ name: 'Lunch', duration: '01:00', timeWindowEarly: '11:30', timeWindowLate: '13:30' }];

const vehicleType = (
  values: Pick<VehicleTypeWrite, 'name' | 'vehicleProfileType' | 'vehicleGroupId'> &
    Partial<VehicleTypeWrite> & { size: [number, number, number]; weight: number },
): VehicleTypeWrite => {
  const { size, weight, ...rest } = values;
  return {
    access: ['REAR'],
    allowedBreaks: breaks,
    dimension: { width: size[0], height: size[1], depth: size[2] },
    maximumWeightCapacity: weight,
    maximumVolumeCapacity: null,
    timeWindowEarly: '08:00',
    timeWindowLate: '18:00',
    maximumDistance: 300,
    maximumDuration: '09:00',
    fixedCost: 800,
    unitDistanceCost: 5,
    unitDurationCost: 60,
    maxpallet: null,
    zone: null,
    isVehicleAvailable: true,
    ...rest,
  };
};

export const SEED_VEHICLE_TYPES: SeedVehicleType[] = [
  {
    key: 'evVan',
    type: vehicleType({
      name: 'EV Van 0.9T',
      vehicleProfileType: 'CAR',
      vehicleGroupId: 'EV',
      size: [150, 135, 250],
      weight: 900,
      access: ['REAR', 'LEFT'],
      maximumDistance: 220,
      fixedCost: 550,
      unitDistanceCost: 1.8,
      unitDurationCost: 55,
      maxpallet: 2,
      zone: 'Inner Bangkok',
    }),
    licensePlates: ['3ขฬ 4127', '3ขฬ 4128', '4กพ 9015', '4กพ 9016'],
  },
  {
    key: 'pickup',
    type: vehicleType({
      name: '4W Pickup 1.1T',
      vehicleProfileType: 'CAR',
      vehicleGroupId: 'ICE-LIGHT',
      size: [160, 150, 240],
      weight: 1100,
      access: ['REAR', 'LEFT', 'RIGHT'],
      fixedCost: 600,
      unitDistanceCost: 4.2,
      unitDurationCost: 55,
      maxpallet: 2,
    }),
    licensePlates: ['2ฒก 5501', '2ฒก 5502', '2ฒก 5503'],
  },
  {
    key: 'box',
    type: vehicleType({
      name: '4W Box Truck 2.2T',
      vehicleProfileType: 'TRUCK',
      vehicleGroupId: 'ICE-LIGHT',
      size: [180, 190, 330],
      weight: 2200,
      fixedCost: 850,
      unitDistanceCost: 5.4,
      unitDurationCost: 60,
      maxpallet: 4,
    }),
    licensePlates: ['70-4821', '70-4822', '70-4835', '70-4840'],
  },
  {
    key: 'evTruck',
    type: vehicleType({
      name: 'EV 6W Truck 4T',
      vehicleProfileType: 'TRUCK',
      vehicleGroupId: 'EV',
      size: [220, 220, 520],
      weight: 4000,
      access: ['REAR', 'RIGHT'],
      maximumDistance: 180,
      fixedCost: 1400,
      unitDistanceCost: 3.1,
      unitDurationCost: 75,
      maxpallet: 8,
    }),
    licensePlates: ['71-0193', '71-0194'],
  },
  {
    key: 'sixWheel',
    type: vehicleType({
      name: '6W Truck 5.5T',
      vehicleProfileType: 'TRUCK',
      vehicleGroupId: 'ICE-HEAVY',
      size: [230, 230, 560],
      weight: 5500,
      access: ['REAR', 'RIGHT'],
      maximumDistance: 400,
      fixedCost: 1600,
      unitDistanceCost: 7.8,
      unitDurationCost: 80,
      maxpallet: 10,
      timeWindowEarly: '09:00',
      zone: 'Outer ring (truck curfew 06:00-09:00)',
    }),
    licensePlates: ['72-6610', '72-6611', '72-6612'],
  },
  {
    key: 'tenWheel',
    type: vehicleType({
      name: '10W Truck 14T',
      vehicleProfileType: 'TRUCK',
      vehicleGroupId: 'ICE-HEAVY',
      size: [240, 250, 720],
      weight: 14000,
      access: ['REAR', 'RIGHT', 'TOP'],
      maximumDistance: 500,
      maximumDuration: '10:00',
      fixedCost: 2800,
      unitDistanceCost: 11.5,
      unitDurationCost: 95,
      maxpallet: 16,
      timeWindowEarly: '10:00',
      zone: 'Outer ring (truck curfew 06:00-10:00)',
    }),
    licensePlates: [],
  },
];

const TIME_PATTERN = '^([01]\\d|2[0-3]):[0-5]\\d$';
const DURATION_PATTERN = '^\\d{1,2}:[0-5]\\d$';

const TIME: LocalizedText = { th_TH: 'เวลาทำงาน', en_US: 'Working time' };
const VEHICLE: LocalizedText = { th_TH: 'ยานพาหนะ', en_US: 'Vehicle' };
const DISTANCE: LocalizedText = { th_TH: 'ระยะทาง', en_US: 'Distance' };

export const SEED_PARAMETERS: SeedParameter[] = [
  {
    category: TIME,
    keyName: 'EarlyDeliveryTime',
    displayName: { th_TH: 'เวลาเริ่มจัดส่ง', en_US: 'Earliest delivery time' },
    valueType: 'time',
    value: '08:00',
    joiConfig: {
      type: 'string',
      required: true,
      pattern: TIME_PATTERN,
      message: 'Enter a time such as 08:00',
    },
    description: {
      th_TH: 'เวลาที่รถคันแรกออกจากคลังสินค้าได้',
      en_US: 'The time the first vehicle may leave the depot.',
    },
  },
  {
    category: TIME,
    keyName: 'BackToDepotTime',
    displayName: { th_TH: 'เวลากลับถึงคลัง', en_US: 'Back to depot by' },
    valueType: 'time',
    value: '18:00',
    joiConfig: {
      type: 'string',
      required: true,
      pattern: TIME_PATTERN,
      message: 'Enter a time such as 18:00',
    },
    description: {
      th_TH: 'เวลาที่รถทุกคันต้องกลับถึงคลังสินค้า',
      en_US: 'The time every vehicle has to be back at the depot.',
    },
  },
  {
    category: TIME,
    keyName: 'MaximumWorkDuration',
    displayName: { th_TH: 'ชั่วโมงทำงานสูงสุด', en_US: 'Maximum work duration' },
    valueType: 'duration_hh:mm',
    value: '09:00',
    joiConfig: {
      type: 'string',
      required: true,
      pattern: DURATION_PATTERN,
      message: 'Enter a duration such as 09:00',
    },
    description: {
      th_TH: 'ระยะเวลาทำงานสูงสุดต่อคันต่อวัน รวมเวลาพัก',
      en_US: 'The longest a vehicle may be out in one day, breaks included.',
    },
  },
  {
    category: TIME,
    keyName: 'ServiceDurationTime',
    displayName: { th_TH: 'เวลาลงสินค้าต่อจุด', en_US: 'Service time per stop' },
    valueType: 'duration_hh:mm',
    value: '00:15',
    joiConfig: {
      type: 'string',
      required: true,
      pattern: DURATION_PATTERN,
      message: 'Enter a duration such as 00:15',
    },
    description: {
      th_TH: 'เวลาเฉลี่ยที่ใช้ลงสินค้าที่ร้านค้าแต่ละจุด',
      en_US: 'The average time spent unloading at each stop.',
    },
  },
  {
    category: VEHICLE,
    keyName: 'NumberOfVehicleAvailable',
    displayName: { th_TH: 'จำนวนรถที่ใช้ได้', en_US: 'Vehicles available' },
    valueType: 'number',
    value: '20',
    joiConfig: {
      type: 'number',
      required: true,
      min: 1,
      max: 200,
      message: 'Enter a number between 1 and 200',
    },
    description: {
      th_TH: 'จำนวนรถสูงสุดที่ใช้ได้ในแผนนี้',
      en_US: 'The most vehicles one plan may use.',
    },
  },
  {
    category: VEHICLE,
    keyName: 'MinimumVehicle',
    displayName: { th_TH: 'จำนวนรถขั้นต่ำ', en_US: 'Minimum vehicles' },
    valueType: 'number',
    value: '1',
    joiConfig: {
      type: 'number',
      required: true,
      min: 1,
      max: 200,
      message: 'Enter a number between 1 and 200',
    },
    description: {
      th_TH: 'จำนวนรถขั้นต่ำที่ต้องใช้ในแผน',
      en_US: 'The fewest vehicles a plan should use.',
    },
  },
  {
    category: VEHICLE,
    keyName: 'VehicleOrderSizeCapacity',
    displayName: { th_TH: 'น้ำหนักบรรทุกสูงสุดต่อคัน', en_US: 'Maximum load per vehicle' },
    valueType: 'number_kg',
    value: '6000',
    joiConfig: {
      type: 'number',
      required: true,
      min: 100,
      max: 30000,
      message: 'Enter a weight between 100 and 30,000 kg',
    },
    description: {
      th_TH: 'น้ำหนักบรรทุกสูงสุดต่อคัน ไม่ว่ารถจะรับน้ำหนักได้มากกว่านี้หรือไม่',
      en_US: 'A cap on the load of any vehicle, whatever its own capacity.',
    },
  },
  {
    category: DISTANCE,
    keyName: 'MaximumTravelDistance',
    displayName: { th_TH: 'ระยะทางสูงสุดต่อเที่ยว', en_US: 'Maximum distance per route' },
    valueType: 'number_km',
    value: '250',
    joiConfig: {
      type: 'number',
      required: true,
      min: 10,
      max: 1000,
      message: 'Enter a distance between 10 and 1,000 km',
    },
    description: {
      th_TH: 'ระยะทางสูงสุดที่รถหนึ่งคันวิ่งได้ต่อเที่ยว',
      en_US: 'The longest route any vehicle may drive.',
    },
  },
];
