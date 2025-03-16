const proxyConfig = {
  "/api": {
    target: "http://127.0.0.1:4000",
    secure: false,
    logLevel: 'debug',
    configure(proxy) {
      proxy.on("proxyReq", (proxyReq) => {
        proxyReq.setHeader('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJlbW9iIiwiaWQiOiIwMTk0YjQ4OS0yOWQ0LTcyOTYtOGU3My0yZWU1ZjkxZTg2Y2MiLCJ1c2VybmFtZSI6InVzZXIxIiwicm9sZXMiOiJ1c2VyIiwiaWF0IjoxNzQyMDQ5NDg0LCJleHAiOjE3NDIwODU0ODR9.LMwE1RBiBoUbxm6umzCRrdUIowZua9PzBfQL0QGajnE');
      });
    },
  },
};
module.exports = proxyConfig;