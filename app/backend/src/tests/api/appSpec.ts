import { api, API } from '../support/api';

describe('App', () => {
  it('reports that the API and its database are reachable', async () => {
    const res = await api.get('/healthz').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('names the GraphQL endpoint and the tools at the root', async () => {
    const res = await api.get('/').expect(200);
    expect(res.body.graphql).toBe('/api/v1/graphql');
    expect(res.body.docs).toBe('/docs');
    expect(res.body.altair).toBe('/altair/');
  });

  it('answers an unknown route with the error envelope', async () => {
    const res = await api.get(`${API}/nowhere`).expect(404);
    expect(res.body).toEqual({
      status: 404,
      message: 'Route GET /api/v1/nowhere not found',
      data: null,
      code: 'not_found',
    });
  });

  it('answers a malformed JSON body with 400, not a server error', async () => {
    const res = await api
      .post(`${API}/auth/login`)
      .set('Content-Type', 'application/json')
      .send('{"username": ')
      .expect(400);
    expect(res.body.message).toBe('Request body must be valid JSON');
    expect(res.body.code).toBe('invalid_request');
  });

  it('tags every response with a request id and the security headers', async () => {
    const res = await api.get('/healthz').expect(200);
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('serves the REST reference and its OpenAPI file', async () => {
    const page = await api.get('/docs').expect(200);
    expect(page.text).toContain('swagger-ui');

    const spec = await api.get('/openapi.yaml').expect(200);
    expect(spec.text).toContain('openapi: 3.0.3');
    expect(spec.text).toContain('/api/v1/auth/login');
  });

  it('serves the Altair explorer pointed at the GraphQL endpoint', async () => {
    await api.get('/altair').expect(301);
    const page = await api.get('/altair/').expect(200);
    expect(page.text).toContain('Altair');

    const options = await api.get('/altair/initial_options.js').expect(200);
    expect(options.text).toContain('/api/v1/graphql');
    expect(options.text).toContain('Bearer {{accessToken}}');
  });
});
