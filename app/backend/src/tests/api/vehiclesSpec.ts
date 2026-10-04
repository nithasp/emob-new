import { ListedParameter, TestPlanner } from '../../types/test.types';
import { demoPlanner, uniqueName } from '../support/api';

const TYPE_FIELDS = `vehicleTypeId name access dimension { width height depth } maximumWeightCapacity
  maximumVolumeCapacity maximumDistance isVehicleAvailable`;
const CREATE_TYPE = `mutation ($input: VehicleTypeInput!) { createVehicleType(input: $input) { ${TYPE_FIELDS} } }`;
const UPDATE_TYPE = `mutation ($vehicleTypeId: String!, $input: VehicleTypeUpdateInput!) {
  updateVehicleType(vehicleTypeId: $vehicleTypeId, input: $input) { ${TYPE_FIELDS} }
}`;
const DELETE_TYPE = `mutation ($vehicleTypeId: String!) { deleteVehicleType(vehicleTypeId: $vehicleTypeId) }`;
const CREATE_VEHICLES = `mutation ($input: VehicleInput!) {
  createVehicle(input: $input) { vehicles { vehicleId licensePlate isActive } duplicates message }
}`;
const UPDATE_VEHICLE = `mutation ($vehicleId: String!, $input: VehicleUpdateInput!) {
  updateVehicle(vehicleId: $vehicleId, input: $input) { vehicleId licensePlate startDepotId { depotId } }
}`;
const SOFT_DELETE = `mutation ($vehicleId: String!) { softDeleteVehicle(vehicleId: $vehicleId) { vehicleId isActive } }`;
const DELETE_VEHICLE = `mutation ($vehicleId: String!) { deleteVehicle(vehicleId: $vehicleId) }`;
const PARAMETERS = `query ($depotId: String!) { dynamicParameters(depotId: $depotId) { id keyName valueType value } }`;
const UPDATE_PARAMETERS = `mutation ($updates: [DynamicParameterUpdateItemInput!]!) {
  updateDynamicParameter(updates: $updates) { success updatedCount errors { id message } results { id keyName value } }
}`;

const codeOf = (res: { body: { errors?: Array<{ extensions?: { code?: string } }> } }): string | undefined =>
  res.body.errors?.[0]?.extensions?.code;

describe('Vehicles and parameters', () => {
  let demo: TestPlanner;
  let depotIds: string[];

  beforeAll(async () => {
    demo = await demoPlanner();
    const res = await demo.gql('{ myDepots { depotId } }').expect(200);
    depotIds = (res.body.data.myDepots as Array<{ depotId: string }>).map((depot) => depot.depotId);
  });

  async function newType(overrides: Record<string, unknown> = {}) {
    const res = await demo
      .gql(CREATE_TYPE, {
        input: {
          name: uniqueName('Test Van'),
          access: ['REAR'],
          vehicleProfileType: 'CAR',
          maximumWeightCapacity: 700,
          maximumVolumeCapacity: 4000000,
          timeWindowEarly: '08:00',
          timeWindowLate: '17:00',
          maximumDistance: 150,
          ...overrides,
        },
      })
      .expect(200);
    expect(res.body.errors).toBeUndefined();
    return res.body.data.createVehicleType;
  }

  async function newVehicles(vehicleTypeId: string, licensePlates: string[]) {
    const res = await demo
      .gql(CREATE_VEHICLES, {
        input: { licensePlates, startDepotId: depotIds[0], endDepotId: depotIds[0], vehicleTypeId },
      })
      .expect(200);
    expect(res.body.errors).toBeUndefined();
    return res.body.data.createVehicle;
  }

  describe('vehicle types', () => {
    it('are created available, sized by volume when no dimension is given', async () => {
      const type = await newType();
      expect(type.dimension).toBeNull();
      expect(type.maximumVolumeCapacity).toBe(4000000);
      expect(type.isVehicleAvailable).toBe(true);
    });

    it('are replaced as a whole by an update: what the form leaves out is cleared', async () => {
      const type = await newType();

      const res = await demo
        .gql(UPDATE_TYPE, {
          vehicleTypeId: type.vehicleTypeId,
          input: {
            name: type.name,
            access: ['REAR', 'LEFT'],
            vehicleProfileType: 'CAR',
            maximumWeightCapacity: 750,
            dimension: { width: 150, height: 140, depth: 250 },
            timeWindowEarly: '08:00',
            timeWindowLate: '17:00',
          },
        })
        .expect(200);

      const updated = res.body.data.updateVehicleType;
      expect(updated.maximumWeightCapacity).toBe(750);
      expect(updated.dimension).toEqual({ width: 150, height: 140, depth: 250 });
      expect(updated.maximumVolumeCapacity).toBeNull();
      expect(updated.maximumDistance).toBeNull();
    });

    it('cannot share a name', async () => {
      const type = await newType();
      const res = await demo.gql(CREATE_TYPE, { input: { name: type.name } });
      expect(codeOf(res)).toBe('CONFLICT');
      expect(res.body.errors[0].message).toBe('A vehicle type with that name already exists');
    });

    it('cannot be deleted while vehicles use them', async () => {
      const type = await newType();
      const { vehicles } = await newVehicles(type.vehicleTypeId, [uniqueName('TT')]);

      const refused = await demo.gql(DELETE_TYPE, { vehicleTypeId: type.vehicleTypeId });
      expect(codeOf(refused)).toBe('CONFLICT');

      await demo.gql(DELETE_VEHICLE, { vehicleId: vehicles[0].vehicleId }).expect(200);
      const deleted = await demo.gql(DELETE_TYPE, { vehicleTypeId: type.vehicleTypeId }).expect(200);
      expect(deleted.body.data.deleteVehicleType).toBe(true);
    });
  });

  describe('vehicles', () => {
    it('are registered by license plate, and plates already in use are reported back', async () => {
      const type = await newType();
      const plate = uniqueName('PL');
      await newVehicles(type.vehicleTypeId, [plate]);

      const second = await newVehicles(type.vehicleTypeId, [plate, `${plate}-B`]);
      expect(second.vehicles.map((vehicle: { licensePlate: string }) => vehicle.licensePlate)).toEqual([
        `${plate}-B`,
      ]);
      expect(second.duplicates).toEqual([plate]);
    });

    it('can move to another depot and take a new plate', async () => {
      const type = await newType();
      const { vehicles } = await newVehicles(type.vehicleTypeId, [uniqueName('MV')]);
      const plate = uniqueName('MV-NEW');

      const res = await demo
        .gql(UPDATE_VEHICLE, {
          vehicleId: vehicles[0].vehicleId,
          input: {
            licensePlate: plate,
            startDepotId: depotIds[1],
            endDepotId: depotIds[1],
            vehicleTypeId: type.vehicleTypeId,
          },
        })
        .expect(200);

      expect(res.body.data.updateVehicle.licensePlate).toBe(plate);
      expect(res.body.data.updateVehicle.startDepotId.depotId).toBe(depotIds[1]);
    });

    it('are taken out of service without losing the record', async () => {
      const type = await newType();
      const { vehicles } = await newVehicles(type.vehicleTypeId, [uniqueName('SD')]);

      const res = await demo.gql(SOFT_DELETE, { vehicleId: vehicles[0].vehicleId }).expect(200);
      expect(res.body.data.softDeleteVehicle).toEqual({ vehicleId: vehicles[0].vehicleId, isActive: false });
    });
  });

  describe('dynamic parameters', () => {
    it('save a valid value and report an invalid one in the same request', async () => {
      const listed = await demo.gql(PARAMETERS, { depotId: depotIds[2] }).expect(200);
      const parameters = listed.body.data.dynamicParameters as ListedParameter[];
      const early = parameters.find((parameter) => parameter.keyName === 'EarlyDeliveryTime');
      const available = parameters.find((parameter) => parameter.keyName === 'NumberOfVehicleAvailable');
      if (!early || !available) throw new Error('the seed left no delivery-time or fleet-size parameter');

      const res = await demo
        .gql(UPDATE_PARAMETERS, {
          updates: [
            { id: early.id, value: '07:30' },
            { id: available.id, value: 9999 },
          ],
        })
        .expect(200);

      const outcome = res.body.data.updateDynamicParameter;
      expect(outcome.success).toBe(false);
      expect(outcome.updatedCount).toBe(1);
      expect(outcome.results).toEqual([{ id: early.id, keyName: 'EarlyDeliveryTime', value: '07:30' }]);
      expect(outcome.errors.length).toBe(1);
      expect(outcome.errors[0].id).toBe(available.id);

      const after = await demo.gql(PARAMETERS, { depotId: depotIds[2] }).expect(200);
      const saved = (after.body.data.dynamicParameters as typeof parameters).find(
        (parameter) => parameter.id === available.id,
      );
      expect(saved?.value).toBe(available.value);
    });
  });
});
