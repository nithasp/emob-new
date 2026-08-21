export const environment = {
    production: false,
    enableLogging: false,
    msalConfig: {
        auth: {
          clientId: '28457c33-e067-4e7b-a362-3fdd2ff2fc1b',
          authority: 'https://bnextnprodemobextportal.ciamlogin.com/',
          knownAuthorities: ['bnextnprodemobextportal.ciamlogin.com'],
        },
      },
      apiConfig: {
        scopes: ['api://28457c33-e067-4e7b-a362-3fdd2ff2fc1b/Read'],
        uri: '/api/',
      },
      graphqlConfig: {
        scopes: ['api://28457c33-e067-4e7b-a362-3fdd2ff2fc1b/Read'],
        uri: '/api/v1/graphql',
      },
      roles : {
        AdminRole: "Admin",
        UserRole: "BRS"
      }
};
