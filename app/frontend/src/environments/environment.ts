export const environment = {
  production: false,
  enableLogging: true,
  auth: {
    autoDemoLogin: true,
  },
  apiConfig: {
    uri: '/api/'
  },
  graphqlConfig: {
    uri: '/api/v1/graphql'
  },
  roles : {
    AdminRole: "Admin",
    UserRole: "BRS"
  }
};
