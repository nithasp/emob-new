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
        proxyReq.setHeader('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJlbW9iIiwiaWQiOiIwMTk0YjQ4OS0yOWQ0LTcyOTYtOGU3My0yZWU1ZjkxZTg2Y2MiLCJ1c2VybmFtZSI6InVzZXIxIiwicm9sZXMiOiJ1c2VyIiwiaWF0IjoxNzQwMTI1MDEyLCJleHAiOjE3NDAxNjEwMTJ9.UAaKRaK9Q_jYTtZGG8zzLo61drkFAzR-iH_vfk_8Z-k');
      });
    },
  },
};
module.exports = proxyConfig;