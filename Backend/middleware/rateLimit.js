// Simple in-memory rate limiter (no external dependency).
// Suitable for a single App Service instance; use a shared store if scaled out.

// Azure App Service may forward the client address with a port ("203.0.113.5:54321"),
// which would otherwise give every new connection a fresh key.
const clientIp = (req) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return ip.replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, '$1');
};

const rateLimit = ({
  windowMs = 15 * 60 * 1000,
  max = 20,
  message = 'Too many requests, please try again later',
  keyGenerator = clientIp,
  skipSuccessfulRequests = false
} = {}) => {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    if (entry.count >= max) {
      res.set('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ message });
    }

    entry.count += 1;

    if (skipSuccessfulRequests) {
      // Only failed attempts (e.g. wrong passwords) count towards the limit
      res.on('finish', () => {
        if (res.statusCode < 400 && entry.count > 0) entry.count -= 1;
      });
    }

    next();
  };
};

rateLimit.clientIp = clientIp;

module.exports = rateLimit;
