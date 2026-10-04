import { newVehiclesSchema, vehicleTypeSchema, vehicleUpdateSchema } from '../schemas/vehicle.schema';
import { Depot } from '../types/company.types';
import { VehicleServiceDeps } from '../types/service.types';
import {
  ACCESS_TYPES,
  EnumOption,
  VEHICLE_PROFILE_TYPES,
  Vehicle,
  VehicleCreationResult,
  VehicleFilters,
  VehicleRow,
  VehicleType,
} from '../types/vehicle.types';
import { AppError } from '../utils/errors';
import { parse } from '../utils/validation';

const ENUMS: Record<string, readonly string[]> = {
  VehicleProfileTypeEnum: VEHICLE_PROFILE_TYPES,
  AccessTypeEnum: ACCESS_TYPES,
};

const typeNotFound = () => new AppError('Vehicle type not found', 404, 'not_found');
const vehicleNotFound = () => new AppError('Vehicle not found', 404, 'not_found');

export function createVehicleService({ vehicles, vehicleTypes, depots }: VehicleServiceDeps) {
  async function hydrate(companyId: string, rows: VehicleRow[]): Promise<Vehicle[]> {
    if (!rows.length) return [];
    const [depotList, typeList] = await Promise.all([
      depots.listByCompany(companyId),
      vehicleTypes.listByCompany(companyId),
    ]);
    const depotById = new Map(depotList.map((depot): [string, Depot] => [depot.depotId, depot]));
    const typeById = new Map(typeList.map((type): [string, VehicleType] => [type.vehicleTypeId, type]));

    return rows.flatMap((row) => {
      const startDepot = depotById.get(row.startDepotId);
      const endDepot = depotById.get(row.endDepotId);
      const vehicleType = typeById.get(row.vehicleTypeId);
      if (!startDepot || !endDepot || !vehicleType) return [];
      return [
        {
          companyName: startDepot.companyName,
          vehicleId: row.vehicleId,
          licensePlate: row.licensePlate,
          startDepotId: startDepot,
          endDepotId: endDepot,
          vehicleTypeId: row.vehicleTypeId,
          vehicleType,
          isActive: row.isActive,
          createdAt: row.createdAt,
          modifiedAt: row.modifiedAt,
        },
      ];
    });
  }

  // A depot or vehicle type id from another company matches no row here, so a vehicle can never be
  // attached to another tenant's master data (OWASP API1)
  async function assertReferences(
    companyId: string,
    refs: {
      startDepotId?: string | undefined;
      endDepotId?: string | undefined;
      vehicleTypeId?: string | undefined;
    },
  ): Promise<void> {
    const depotIds = [...new Set([refs.startDepotId, refs.endDepotId].filter((id): id is string => !!id))];
    if (depotIds.length) {
      const found = await depots.findByIds(companyId, depotIds);
      if (found.length !== depotIds.length) throw new AppError('Depot not found', 404, 'not_found');
    }
    if (refs.vehicleTypeId && !(await vehicleTypes.show(companyId, refs.vehicleTypeId))) throw typeNotFound();
  }

  async function requireVehicle(companyId: string, vehicleId: string): Promise<Vehicle> {
    const row = await vehicles.show(companyId, vehicleId);
    const [vehicle] = row ? await hydrate(companyId, [row]) : [];
    if (!vehicle) throw vehicleNotFound();
    return vehicle;
  }

  return {
    enumValues(enumName: string): EnumOption[] {
      const values = ENUMS[enumName];
      if (!values) throw new AppError(`Unknown enum "${enumName}"`, 400, 'invalid_request');
      return values.map((value) => ({ key: value, value }));
    },

    listTypes(companyId: string): Promise<VehicleType[]> {
      return vehicleTypes.listByCompany(companyId);
    },

    async getType(companyId: string, vehicleTypeId: string): Promise<VehicleType> {
      const type = await vehicleTypes.show(companyId, vehicleTypeId);
      if (!type) throw typeNotFound();
      return type;
    },

    createType(companyId: string, input: unknown): Promise<VehicleType> {
      return vehicleTypes.create(companyId, parse(vehicleTypeSchema, input));
    },

    async updateType(companyId: string, vehicleTypeId: string, input: unknown): Promise<VehicleType> {
      const updated = await vehicleTypes.update(companyId, vehicleTypeId, parse(vehicleTypeSchema, input));
      if (!updated) throw typeNotFound();
      return updated;
    },

    async deleteType(companyId: string, vehicleTypeId: string): Promise<boolean> {
      const inUse = await vehicles.listByCompany(companyId, { vehicleTypeId });
      if (inUse.length) {
        throw new AppError(
          `This vehicle type still has ${inUse.length} vehicle(s). Remove or reassign them first.`,
          409,
          'conflict',
        );
      }
      if (!(await vehicleTypes.delete(companyId, vehicleTypeId))) throw typeNotFound();
      return true;
    },

    async listVehicles(companyId: string, filters: VehicleFilters): Promise<Vehicle[]> {
      return hydrate(companyId, await vehicles.listByCompany(companyId, filters));
    },

    getVehicle: requireVehicle,

    async createVehicles(companyId: string, input: unknown): Promise<VehicleCreationResult> {
      const data = parse(newVehiclesSchema, input);
      await assertReferences(companyId, data);

      const requested = [
        ...new Map(data.licensePlates.map((plate) => [plate.toLowerCase(), plate])).values(),
      ];
      const taken = new Set(
        (await vehicles.existingPlates(companyId, requested)).map((plate) => plate.toLowerCase()),
      );
      const duplicates = requested.filter((plate) => taken.has(plate.toLowerCase()));
      const fresh = requested.filter((plate) => !taken.has(plate.toLowerCase()));

      if (!fresh.length) {
        throw new AppError(`License plate already exists: ${duplicates.join(', ')}`, 409, 'conflict');
      }

      const created: VehicleRow[] = [];
      for (const licensePlate of fresh) {
        created.push(
          await vehicles.create(companyId, {
            licensePlate,
            startDepotId: data.startDepotId,
            endDepotId: data.endDepotId,
            vehicleTypeId: data.vehicleTypeId,
          }),
        );
      }

      return {
        vehicles: await hydrate(companyId, created),
        duplicates,
        message: duplicates.length
          ? `Created ${created.length} vehicle(s); ${duplicates.length} license plate(s) already existed.`
          : `Created ${created.length} vehicle(s).`,
      };
    },

    async updateVehicle(companyId: string, vehicleId: string, input: unknown): Promise<Vehicle> {
      const changes = parse(vehicleUpdateSchema, input);
      await assertReferences(companyId, changes);

      if (changes.licensePlate) {
        const taken = await vehicles.existingPlates(companyId, [changes.licensePlate]);
        const current = await vehicles.show(companyId, vehicleId);
        if (taken.length && current?.licensePlate.toLowerCase() !== changes.licensePlate.toLowerCase()) {
          throw new AppError(`License plate already exists: ${changes.licensePlate}`, 409, 'conflict');
        }
      }

      if (!(await vehicles.update(companyId, vehicleId, changes))) throw vehicleNotFound();
      return requireVehicle(companyId, vehicleId);
    },

    async deleteVehicle(companyId: string, vehicleId: string): Promise<boolean> {
      if (!(await vehicles.delete(companyId, vehicleId))) throw vehicleNotFound();
      return true;
    },

    async deactivateVehicle(companyId: string, vehicleId: string): Promise<Vehicle> {
      if (!(await vehicles.update(companyId, vehicleId, { isActive: false }))) throw vehicleNotFound();
      return requireVehicle(companyId, vehicleId);
    },
  };
}

export type VehicleService = ReturnType<typeof createVehicleService>;
