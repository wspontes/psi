const { Redis } = require('@upstash/redis');

const ALLOWED_KEYS = ['articles', 'messages'];
const MAX_VALUE_BYTES = 500 * 1024;

function send(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  const query = req.query || {};

  if (req.method === 'GET') {
    const key = String(query.key || '');
    if (!ALLOWED_KEYS.includes(key)) {
      return send(res, 400, { error: 'invalid key' });
    }
    try {
      const redis = Redis.fromEnv();
      const value = await redis.get(key);
      return send(res, 200, { value: value == null ? null : String(value) });
    } catch (e) {
      return send(res, 500, { error: 'storage unavailable' });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    let body = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (e) {
      return send(res, 400, { error: 'invalid json body' });
    }
    const key = String(body.key || '');
    const value = typeof body.value === 'string' ? body.value : '';
    if (!ALLOWED_KEYS.includes(key)) {
      return send(res, 400, { error: 'invalid key' });
    }
    if (Buffer.byteLength(value, 'utf8') > MAX_VALUE_BYTES) {
      return send(res, 413, { error: 'value too large' });
    }
    try {
      const redis = Redis.fromEnv();
      await redis.set(key, value);
      return send(res, 200, { ok: true });
    } catch (e) {
      return send(res, 500, { error: 'storage unavailable' });
    }
  }

  return send(res, 405, { error: 'method not allowed' });
};