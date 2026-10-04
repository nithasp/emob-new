import { FileUpload } from 'graphql-upload-ts';
import { configurationService } from '../../services';
import { GraphQLContext } from '../../types/graphql.types';
import { readUpload } from '../uploads';

export const configurationResolvers = {
  Query: {
    configurations: (_: unknown, __: unknown, { user }: GraphQLContext) =>
      configurationService.list(user.companyId),

    configuration: (_: unknown, { id }: { id: string }, { user }: GraphQLContext) =>
      configurationService.get(user.companyId, id),

    actualLocation: (_: unknown, { blobPath }: { blobPath: string }, { user }: GraphQLContext) =>
      configurationService.actualLocation(user.companyId, blobPath),
  },

  Mutation: {
    uploadActualLocation: async (
      _: unknown,
      { file }: { file: Promise<FileUpload> },
      { user }: GraphQLContext,
    ) => configurationService.uploadActualLocation(user.companyId, await readUpload(file)),

    replaceTypeOfCategory: async (
      _: unknown,
      { input }: { input: { file: Promise<FileUpload>; id: string } },
      { user }: GraphQLContext,
    ) => configurationService.replaceFile(user.companyId, input.id, await readUpload(input.file)),
  },
};
