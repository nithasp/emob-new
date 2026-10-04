export const environment = {
    production: true,
    enableLogging: false,
    auth: {
      // true: a visitor with no session enters as the demo account and lands on the experiments page.
      // false: every visitor signs in on the login page first.
      autoDemoLogin: true,
    },
    // Point both at the API origin (e.g. https://api.example.com/api/) when it is not served
    // from the same origin as this app.
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
