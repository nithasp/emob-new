export const environment = {
  production: true,
  enableLogging: false,
  auth: {
    autoDemoLogin: true,
  },
  apiConfig: {
    uri: 'https://emob-api.proxystack.dev/api/',
  },
  graphqlConfig: {
    uri: 'https://emob-api.proxystack.dev/api/v1/graphql',
  },
  roles: {
    AdminRole: 'Admin',
    UserRole: 'BRS',
  },
};
