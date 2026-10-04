import { GraphQLUpload } from 'graphql-upload-ts';
import { companyService } from '../../services';
import { GraphQLContext } from '../../types/graphql.types';
import { DateTimeScalar, JSONScalar } from '../scalars';
import { configurationResolvers } from './configuration';
import { experimentResolvers } from './experiment';
import { parameterResolvers } from './parameter';
import { vehicleResolvers } from './vehicle';

// Every resolver takes the company from the signed-in user in the context. No argument can name
// another company, so one tenant cannot read or change another's data (OWASP API1)
export const resolvers = {
  JSON: JSONScalar,
  DateTime: DateTimeScalar,
  Upload: GraphQLUpload,

  Query: {
    myCompany: (_: unknown, __: unknown, { user }: GraphQLContext) =>
      companyService.getCompany(user.companyId),
    myDepots: (_: unknown, __: unknown, { user }: GraphQLContext) =>
      companyService.listDepots(user.companyId),
    ...experimentResolvers.Query,
    ...parameterResolvers.Query,
    ...configurationResolvers.Query,
    ...vehicleResolvers.Query,
  },

  Mutation: {
    ...experimentResolvers.Mutation,
    ...parameterResolvers.Mutation,
    ...configurationResolvers.Mutation,
    ...vehicleResolvers.Mutation,
  },
};
