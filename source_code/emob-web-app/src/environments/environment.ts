export const environment = {
  production: false,
  msalConfig: {
    auth: {
      clientId: 'ENTER_CLIENT_ID',
      authority: 'ENTER_AUTHORITY',
      knownAuthorities: ['ENTER_KNOWN_AUTHORITY'],
    },
  },
  apiConfig: {
    scopes: ['ENTER_SCOPE'],
    uri: 'ENTER_URI'
  },
  graphqlConfig: {
    scopes: ['ENTER_SCOPE'],
    uri: 'ENTER_URI'
  },
  roles : {
    AdminRole: "ADMIN",
    UserRole: "USER"
  }
};
