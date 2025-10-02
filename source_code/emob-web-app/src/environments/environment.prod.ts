export const environment = {
    production: true,
    msalConfig: {
        auth: {
          clientId: '7d8613c1-d724-491a-84a1-2169706a08dd',
          authority: 'https://bnextprodemobextportal.ciamlogin.com/',
          knownAuthorities: ['bnextprodemobextportal.ciamlogin.com'],
        },
      },
      apiConfig: {
        scopes: ['api://7d8613c1-d724-491a-84a1-2169706a08dd/Read'],
        uri: '/api/',
      },
      graphqlConfig: {
        scopes: ['api://7d8613c1-d724-491a-84a1-2169706a08dd/Read'],
        uri: '/api/v1/graphql',
      },
      roles : {
        AdminRole: "Admin",
        UserRole: "BRS"
      }
};
