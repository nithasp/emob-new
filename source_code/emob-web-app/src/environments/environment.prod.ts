export const environment = {
    production: true,
    msalConfig: {
        auth: {
          clientId: '6fcc6a58-25f8-4a0e-be6c-6e4b34243951',
          authority: 'https://testbanpu.ciamlogin.com/',
          knownAuthorities: ['testbanpu.ciamlogin.com'],
        },
      },
      apiConfig: {
        scopes: ['api://6fcc6a58-25f8-4a0e-be6c-6e4b34243951/Read'],
        uri: '/api/',
      },
      graphqlConfig: {
        scopes: ['api://6fcc6a58-25f8-4a0e-be6c-6e4b34243951/Read'],
        uri: '/api/v1/graphql',
      },
      roles : {
        AdminRole: "Admin",
        UserRole: "BRS"
      }
};
