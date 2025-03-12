const proxyConfig = {
  "/api/v1/*": {
    target: "http://localhost:4000",
    secure: false,
    logLevel: 'debug',
    changeOrigin: true,
    ws: true,
    pathRewrite: {
      '^/api/v1/graphql': '/api/v1/graphql'
    },
    configure(proxy) {
      proxy.on("proxyReq", (proxyReq) => {
        proxyReq.setHeader('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJlbW9iIiwiaWQiOiIwMTk0YjQ4OS0yOWQ0LTcyOTYtOGU3My0yZWU1ZjkxZTg2Y2MiLCJ1c2VybmFtZSI6InVzZXIxIiwicm9sZXMiOiJ1c2VyIiwiaWF0IjoxNzQxNzUwMzk1LCJleHAiOjE3NDE3ODYzOTV9.DN26WYZjcUPNW2kgHoey_5WGft_Zt4SLqTyICP3_1L8');
      });
    },
  },
};
module.exports = proxyConfig;