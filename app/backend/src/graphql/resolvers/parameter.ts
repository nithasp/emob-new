import { experimentService, parameterService } from '../../services';
import { GraphQLContext } from '../../types/graphql.types';
import { Constraint } from '../../types/parameter.types';

export const parameterResolvers = {
  Query: {
    myParameter: (_: unknown, __: unknown, { user }: GraphQLContext) =>
      parameterService.constraintFor(user.companyId, null),

    parameter: async (_: unknown, args: { experimentRunID: string }, { user }: GraphQLContext) => ({
      companyName: user.companyName,
      parameters: await experimentService.constraintOf(user.companyId, args.experimentRunID),
    }),

    dynamicParameters: (_: unknown, { depotId }: { depotId: string }, { user }: GraphQLContext) =>
      parameterService.list(user.companyId, depotId.trim() || null),

    dynamicParameter: (_: unknown, args: { experimentRunID: string }, { user }: GraphQLContext) =>
      experimentService.parametersOf(user.companyId, args.experimentRunID),
  },

  Mutation: {
    updateParameter: (_: unknown, { parameter }: { parameter: Constraint }, { user }: GraphQLContext) =>
      parameterService.updateConstraint(user.companyId, parameter),

    updateDynamicParameter: (_: unknown, { updates }: { updates: unknown }, { user }: GraphQLContext) =>
      parameterService.updateValues(user.companyId, updates),

    deleteDynamicParameter: (_: unknown, { id }: { id: string }, { user }: GraphQLContext) =>
      parameterService.delete(user.companyId, id),
  },
};
