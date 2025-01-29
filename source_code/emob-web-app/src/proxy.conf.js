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
        proxyReq.setHeader('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJlbW9iIiwiaWQiOiIwMTkzNDFlNS0xNTdiLTcwZmMtYTA4OC04ZmJmMjAzOWZmMjciLCJ1c2VybmFtZSI6InVzZXIxIiwicm9sZXMiOiJ1c2VyIiwiaWF0IjoxNzM4MTE3OTU3LCJleHAiOjE3MzgxNTM5NTd9.dt_VSO0bj1nQE-75He28J4EPB4jNj5UrlA4HG8o-x0Q');
      });
    },
  },
};
module.exports = proxyConfig;