import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { clearData, createUser } from '../test/helpers.js';

// Kept in its own file so the rate limiter's in-memory counter (module-level state,
// shared for the lifetime of this file's `app` import) starts fresh and isn't affected
// by login attempts made in other test files.
describe('POST /api/auth/login rate limiting', () => {
  beforeEach(() => {
    clearData();
    createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
  });

  it('allows 10 attempts then blocks the 11th within the window', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'wrong-password' });
      expect(res.status).toBe(401);
    }

    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong-password' });
    expect(blocked.status).toBe(429);
  });
});
