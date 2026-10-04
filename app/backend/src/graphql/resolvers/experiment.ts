import { config } from '../../config';
import { experimentService } from '../../services';
import { PreOrderUpload } from '../../types/experiment.types';
import { GraphQLContext, PreOrderArgs } from '../../types/graphql.types';
import { AppError } from '../../utils/errors';
import { readUpload } from '../uploads';

export const experimentResolvers = {
  Query: {
    experiments: (_: unknown, __: unknown, { user }: GraphQLContext) =>
      experimentService.list(user.companyId),

    experiment: (_: unknown, { input }: { input: { runId: string } }, { user }: GraphQLContext) =>
      experimentService.get(user.companyId, input.runId),

    downloadResultFile: (_: unknown, args: { experimentRunID: string }, { user }: GraphQLContext) =>
      experimentService.downloadResultFile(user.companyId, args.experimentRunID),
  },

  Mutation: {
    createExperiment: (_: unknown, __: unknown, { user }: GraphQLContext) => experimentService.create(user),

    uploadPreOrder: async (_: unknown, { input }: PreOrderArgs, { user }: GraphQLContext) => {
      if (input.preOrderFiles.length > config.upload.maxFiles) {
        throw new AppError(
          `At most ${config.upload.maxFiles} files can be uploaded at once`,
          400,
          'invalid_request',
        );
      }
      const uploads: PreOrderUpload[] = [];
      for (const item of input.preOrderFiles) {
        uploads.push({ keyName: (item.keyName ?? '').trim(), file: await readUpload(item.file) });
      }
      return experimentService.uploadPreOrder(user, { runId: input.runId, depotId: input.depotId }, uploads);
    },

    validateExperiment: (_: unknown, { input }: { input: unknown }, { user }: GraphQLContext) =>
      experimentService.validate(user, input),

    submitExperiment: (_: unknown, { input }: { input: { runId: string } }, { user }: GraphQLContext) =>
      experimentService.submit(user, input.runId),

    rerunExperiment: (_: unknown, { runId }: { runId: string }, { user }: GraphQLContext) =>
      experimentService.rerun(user.companyId, runId),

    cancelExperiment: (_: unknown, { runId }: { runId: string }, { user }: GraphQLContext) =>
      experimentService.cancel(user.companyId, runId),

    replicateExperiment: (_: unknown, { runId }: { runId: string }, { user }: GraphQLContext) =>
      experimentService.replicate(user, runId),
  },
};
