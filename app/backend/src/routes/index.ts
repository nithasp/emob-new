import { Router } from 'express';
import { graphqlHandler, graphqlUploads } from '../graphql';
import { authenticate } from '../middleware/auth';
import authRoutes from './auth.routes';
import fileRoutes from './files.routes';

const api = Router();

api.use('/auth', authRoutes);
api.use('/files', fileRoutes);

// One endpoint carries every query and mutation. It sits behind the same access-token check as
// the REST routes, so no operation, introspection included, is served to an anonymous caller.
api.use('/graphql', authenticate, graphqlUploads, graphqlHandler);

export default api;
