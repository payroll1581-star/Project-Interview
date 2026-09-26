import { describe, it, expect } from 'vitest';
import { parseTrustProxy } from './trustProxy.js';

describe('parseTrustProxy', () => {
  it('trusts no proxy when unset, blank, or "false"', () => {
    for (const value of [undefined, '', '   ', 'false']) {
      expect(parseTrustProxy(value)).toBe(false);
    }
  });

  it('accepts a whole number of proxy hops', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy(' 2 ')).toBe(2);
  });

  it('accepts a comma-separated list of proxy addresses or Express names', () => {
    expect(parseTrustProxy('10.0.0.5, loopback')).toEqual(['10.0.0.5', 'loopback']);
  });

  it('refuses "true", which would believe any client-supplied X-Forwarded-For', () => {
    expect(() => parseTrustProxy('true')).toThrow(/number of proxies/i);
  });
});
