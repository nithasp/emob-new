export const environment = {
    production: true,
    enableLogging: false,
    auth: {
      autoDemoLogin: true,
    },
    apiConfig: {
      uri: '/api/',
    },
    graphqlConfig: {
      uri: '/api/v1/graphql',
    },
    roles : {
      AdminRole: "Admin",
      UserRole: "BRS"
    }
};
