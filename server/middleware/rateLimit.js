// middleware/rateLimit.js - tiny dependency-free fixed-window rate limiter.
//
// NOTE: state is held in an in-process Map, so it is per-process only. This is
// fine for a single-instance prototype. When scaling to multiple instances,
// swap this for a shared store (e.g. Redis) so limits are enforced globally.

/**
 * Fixed-window in-memory rate limiter factory.
 *
 * @param {Object} opts
 * @param {number} opts.windowMs - window length in milliseconds
 * @param {number} opts.max - max requests allowed per IP per window
 * @param {string} [opts.message] - message returned in the 429 body
 * @returns {import("express").RequestHandler}
 */
function rateLimit({ windowMs, max, message = "Too many requests, please try again later." }) {
  // key (req.ip) -> { count, resetAt }
  const hits = new Map();

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const key = req.ip;
    let entry = hits.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfterSec = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({ detail: message });
    }

    return next();
  };
}

module.exports = { rateLimit };
