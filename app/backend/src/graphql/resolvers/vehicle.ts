import { vehicleService } from '../../services';
import { GraphQLContext, VehicleFilterArgs } from '../../types/graphql.types';

export const vehicleResolvers = {
  Query: {
    getEnumValues: (_: unknown, { enumName }: { enumName: string }) => vehicleService.enumValues(enumName),

    myVehicles: (_: unknown, args: VehicleFilterArgs, { user }: GraphQLContext) =>
      vehicleService.listVehicles(user.companyId, {
        depotId: args.depotId || undefined,
        vehicleTypeId: args.vehicleTypeId || undefined,
      }),

    myVehicle: (_: unknown, { vehicleId }: { vehicleId: string }, { user }: GraphQLContext) =>
      vehicleService.getVehicle(user.companyId, vehicleId),

    myVehicleTypes: (_: unknown, __: unknown, { user }: GraphQLContext) =>
      vehicleService.listTypes(user.companyId),

    myVehicleType: (_: unknown, { vehicleTypeId }: { vehicleTypeId: string }, { user }: GraphQLContext) =>
      vehicleService.getType(user.companyId, vehicleTypeId),
  },

  Mutation: {
    createVehicle: (_: unknown, { input }: { input: unknown }, { user }: GraphQLContext) =>
      vehicleService.createVehicles(user.companyId, input),

    updateVehicle: (_: unknown, args: { vehicleId: string; input: unknown }, { user }: GraphQLContext) =>
      vehicleService.updateVehicle(user.companyId, args.vehicleId, args.input),

    deleteVehicle: (_: unknown, { vehicleId }: { vehicleId: string }, { user }: GraphQLContext) =>
      vehicleService.deleteVehicle(user.companyId, vehicleId),

    softDeleteVehicle: (_: unknown, { vehicleId }: { vehicleId: string }, { user }: GraphQLContext) =>
      vehicleService.deactivateVehicle(user.companyId, vehicleId),

    createVehicleType: (_: unknown, { input }: { input: unknown }, { user }: GraphQLContext) =>
      vehicleService.createType(user.companyId, input),

    updateVehicleType: (
      _: unknown,
      args: { vehicleTypeId: string; input: unknown },
      { user }: GraphQLContext,
    ) => vehicleService.updateType(user.companyId, args.vehicleTypeId, args.input),

    deleteVehicleType: (_: unknown, { vehicleTypeId }: { vehicleTypeId: string }, { user }: GraphQLContext) =>
      vehicleService.deleteType(user.companyId, vehicleTypeId),
  },
};
