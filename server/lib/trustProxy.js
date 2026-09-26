// Value for Express's 'trust proxy' setting, read from TRUST_PROXY. Behind a company reverse
// proxy every request arrives from the proxy's address; without this the login rate limiter
// would treat all users as one person. Deliberately no "true": that trusts any X-Forwarded-For
// a client sends, so anyone able to reach the port directly could dodge the limiter.
export function parseTrustProxy(value) {
  const text = (value ?? '').trim();
  if (text === '' || text === 'false') return false;
  if (text === 'true') {
    throw new Error(
      'TRUST_PROXY=true is not allowed. Set it to the number of proxies in front of this app (e.g. 1) or to their IP addresses.',
    );
  }
  if (/^\d+$/.test(text)) return Number(text);
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}
