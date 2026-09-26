import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Must be set before the app is imported: the setting is read once at start-up.
process.env.TRUST_PROXY = '1';
const { app } = await import('../index.js');
const { clearData, createUser } = await import('../test/helpers.js');

describe('login rate limit behind a reverse proxy (TRUST_PROXY=1)', () => {
  beforeAll(() => {
    clearData();
    createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
  });

  const login = (forwardedFor, password) =>
    request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', forwardedFor)
      .send({ email: 'admin@test.com', password });

  it('counts attempts per client address from X-Forwarded-For, not per proxy', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect((await login('203.0.113.5', 'wrong')).status).toBe(401);
    }
    expect((await login('203.0.113.5', 'wrong')).status).toBe(429);

    const otherClient = await login('203.0.113.6', 'admin123');
    expect(otherClient.status).toBe(200);
  });
});
