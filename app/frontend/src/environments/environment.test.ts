export const environment = {
    production: false,
    enableLogging: false,
    auth: {
      // true: a visitor with no session enters as the demo account and lands on the experiments page.
      // false: every visitor signs in on the login page first.
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
