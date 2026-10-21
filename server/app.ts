import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { hashPassword, verifyPassword } from './password.ts';
import {
  ValidationError,
  requireObject,
  validateExpiry,
  validatePassword,
  validateSlug,
  validateTags,
  validateText,
  validateUrl,
} from './validation.ts';

export interface LinkRecord {
  id: string;
  original_url: string;
  slug: string;
  title: string;
  description?: string;
  is_active: boolean;
  is_password_protected: boolean;
  password_hash?: string;
  expires_at?: string | null;
  clicks_count: number;
  last_clicked_at?: string | null;
  created_at: string;
  updated_at: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  tags?: string[];
}

export interface ClickRecord {
  id: string;
  link_id: string;
  slug: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  referer: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
}

interface DatabaseSchema {
  links: LinkRecord[];
  clicks: ClickRecord[];
}

export interface AppOptions {
  /** JSON file used for storage. Required when NODE_ENV=test so tests never touch data/db.json. */
  dataFile?: string;
  /** Admin API key. If missing, a random one is generated (see `app.locals.apiKey`). */
  apiKey?: string;
  /** Add a few sample links when the data file does not exist yet. */
  seed?: boolean;
}

// -------------------------------------------------------------
// In-memory cache (lives inside this Node process; it is NOT Redis)
// -------------------------------------------------------------
class InMemoryCache {
  private cache = new Map<string, { link: LinkRecord; cachedAt: number }>();
  public hits = 0;
  public misses = 0;
  constructor(private ttlMs = 3600 * 1000) {}

  get(slug: string): LinkRecord | null {
    const entry = this.cache.get(slug);
    if (!entry || Date.now() - entry.cachedAt > this.ttlMs) {
      if (entry) this.cache.delete(slug);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.link;
  }

  set(link: LinkRecord): void {
    this.cache.set(link.slug, { link, cachedAt: Date.now() });
  }

  invalidate(slug: string): void {
    this.cache.delete(slug);
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      total_queries: total,
      hit_ratio_percent: total > 0 ? Number(((this.hits / total) * 100).toFixed(1)) : 0,
      cached_keys_count: this.cache.size,
      backend: 'In-memory (this server process only)',
    };
  }
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
const SLUG_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateSlug(length = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) result += SLUG_CHARS[crypto.randomInt(SLUG_CHARS.length)];
  return result;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function csvCell(value: string | number): string {
  let text = String(value);
  // Stop spreadsheet apps from running cells that start like formulas.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Link as returned by the API. Never includes the password hash. */
function toPublicLink(link: LinkRecord) {
  const { password_hash: _hash, ...safe } = link;
  return safe;
}

function parseUserAgent(ua: string) {
  const s = (ua || '').toLowerCase();
  let device_type: ClickRecord['device_type'] = 'desktop';
  if (s.includes('tablet') || s.includes('ipad')) device_type = 'tablet';
  else if (s.includes('mobile') || s.includes('iphone') || s.includes('android')) device_type = 'mobile';

  let browser = 'Unknown';
  if (s.includes('firefox')) browser = 'Firefox';
  else if (s.includes('edg')) browser = 'Edge';
  else if (s.includes('chrome')) browser = 'Chrome';
  else if (s.includes('safari')) browser = 'Safari';

  let os = 'Unknown';
  if (s.includes('android')) os = 'Android';
  else if (s.includes('iphone') || s.includes('ipad') || s.includes('ios')) os = 'iOS';
  else if (s.includes('windows')) os = 'Windows';
  else if (s.includes('mac os') || s.includes('macintosh')) os = 'macOS';
  else if (s.includes('linux')) os = 'Linux';

  return { device_type, browser, os };
}

function messagePage(title: string, heading: string, text: string, color: string, href: string, label: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>${escapeHtml(title)} - KiteURL</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: system-ui, sans-serif; background: #fafafa; color: #0f172a; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .box { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; max-width: 400px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
      h1 { font-size: 20px; margin-bottom: 8px; color: ${color}; }
      p { color: #64748b; font-size: 14px; margin-bottom: 24px; }
      a { display: inline-block; background: #0f172a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>${escapeHtml(heading)}</h1>
      <p>${text}</p>
      <a href="${href}">${escapeHtml(label)}</a>
    </div>
  </body>
</html>`;
}

function isExpired(link: LinkRecord): boolean {
  return Boolean(link.expires_at && new Date(link.expires_at) < new Date());
}

// -------------------------------------------------------------
// App factory (importing this file does NOT start a server)
// -------------------------------------------------------------
export function createApp(options: AppOptions = {}) {
  const dataFile = options.dataFile ?? path.resolve(process.cwd(), 'data', 'db.json');
  if (process.env.NODE_ENV === 'test' && !options.dataFile) {
    throw new Error('createApp needs an explicit dataFile in tests so data/db.json is never touched');
  }

  const apiKey = options.apiKey || process.env.API_KEY || crypto.randomBytes(24).toString('hex');
  const apiKeyDigest = crypto.createHash('sha256').update(apiKey).digest();

  const cache = new InMemoryCache();
  let db: DatabaseSchema = { links: [], clicks: [] };

  // ---- storage ----
  function save(): void {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const tmp = `${dataFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmp, dataFile); // atomic: a crash cannot leave a half-written file
  }

  function seedLinks(): LinkRecord[] {
    const now = new Date().toISOString();
    const make = (n: number, slug: string, url: string, title: string, description: string, tags: string[]): LinkRecord => ({
      id: `lnk-seed-${n}`,
      original_url: url,
      slug,
      title,
      description,
      is_active: true,
      is_password_protected: false,
      expires_at: null,
      clicks_count: 0,
      last_clicked_at: null,
      created_at: now,
      updated_at: now,
      tags,
    });
    return [
      make(1, 'github-fastapi', 'https://github.com/fastapi/fastapi', 'FastAPI Repository', 'Official Python web framework repo', ['open-source', 'python']),
      make(2, 'redis-docs', 'https://redis.io/docs/latest/develop/data-types/', 'Redis Data Types Guide', 'Caching and data structure docs', ['cache']),
      make(3, 'pg-indexes', 'https://www.postgresql.org/docs/current/indexes.html', 'PostgreSQL Indexing', 'Database indexing documentation', ['database']),
    ];
  }

  if (fs.existsSync(dataFile)) {
    // If the file is broken we stop instead of silently replacing it with seed data.
    const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    db = { links: parsed.links ?? [], clicks: parsed.clicks ?? [] };
  } else if (options.seed) {
    db = { links: seedLinks(), clicks: [] };
    save();
  }
  db.links.forEach((l) => cache.set(l));

  function findBySlug(slug: string): LinkRecord | undefined {
    const cached = cache.get(slug);
    if (cached) return cached;
    const link = db.links.find((l) => l.slug === slug);
    if (link) cache.set(link);
    return link;
  }

  function recordClick(link: LinkRecord, req: Request, referer: string): void {
    const userAgent = req.get('user-agent') || '';
    db.clicks.push({
      id: `clk-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      link_id: link.id,
      slug: link.slug,
      timestamp: new Date().toISOString(),
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      user_agent: userAgent.slice(0, 300),
      referer,
      ...parseUserAgent(userAgent),
    });
    link.clicks_count++;
    link.last_clicked_at = new Date().toISOString();
    save();
  }

  // Simple brute-force protection for passcode guesses: 10 wrong tries / 15 min per IP + slug.
  const failedAttempts = new Map<string, { count: number; resetAt: number }>();
  const MAX_FAILS = 10;
  const WINDOW_MS = 15 * 60 * 1000;

  // ---- app + middleware ----
  const app = express();
  app.disable('x-powered-by');
  app.locals.apiKey = apiKey;
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(express.json({ limit: '20kb' }));

  const handle =
    (fn: (req: Request, res: Response) => unknown | Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve()
        .then(() => fn(req, res))
        .catch((err) => {
          if (err instanceof ValidationError) res.status(400).json({ detail: err.message });
          else next(err);
        });
    };

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const header = req.get('authorization') || '';
    const supplied = header.startsWith('Bearer ') ? header.slice(7) : req.get('x-api-key') || '';
    const digest = crypto.createHash('sha256').update(supplied).digest();
    if (!supplied || !crypto.timingSafeEqual(digest, apiKeyDigest)) {
      return res.status(401).json({ detail: 'Authentication required' });
    }
    next();
  };

  // -------------------------------------------------------------
  // Public routes (no API key)
  // -------------------------------------------------------------
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Passcode check for protected links. A successful check counts as the click.
  app.post(
    '/api/v1/urls/:slug/verify',
    handle(async (req, res) => {
      const slug = req.params.slug;
      const body = requireObject(req.body ?? {});
      const link = findBySlug(slug);
      if (!link) return res.status(404).json({ detail: 'Link not found' });
      if (!link.is_active) return res.status(403).json({ detail: 'This link is paused' });
      if (isExpired(link)) return res.status(410).json({ detail: 'This link has expired' });

      if (!link.is_password_protected || !link.password_hash) {
        return res.json({ valid: true, target_url: link.original_url });
      }

      const key = `${req.ip}:${slug}`;
      const attempts = failedAttempts.get(key);
      if (attempts && attempts.resetAt > Date.now() && attempts.count >= MAX_FAILS) {
        return res.status(429).json({ detail: 'Too many wrong attempts. Try again later.' });
      }

      const password = typeof body.password === 'string' ? body.password.slice(0, 128) : '';
      const result = await verifyPassword(password, link.password_hash);
      if (!result.valid) {
        const fresh = attempts && attempts.resetAt > Date.now() ? attempts : { count: 0, resetAt: Date.now() + WINDOW_MS };
        fresh.count++;
        failedAttempts.set(key, fresh);
        return res.status(401).json({ detail: 'Invalid passcode' }); // not counted as a click
      }

      failedAttempts.delete(key);
      if (result.needsRehash) link.password_hash = await hashPassword(password);
      recordClick(link, req, 'Direct');
      res.json({ valid: true, target_url: link.original_url });
    })
  );

  // Short link redirect
  app.get('/r/:slug', (req, res) => {
    const slug = req.params.slug;
    const link = findBySlug(slug);

    if (!link) {
      return res
        .status(404)
        .send(messagePage('Link Not Found', '404 - Link Not Found', `The short link <strong>/r/${escapeHtml(slug)}</strong> does not exist or has been removed.`, '#0f172a', '/', 'Go to KiteURL Dashboard'));
    }
    if (!link.is_active) {
      return res
        .status(403)
        .send(messagePage('Link Paused', 'Link Temporarily Paused', 'This link has been paused by its owner and cannot be accessed at this time.', '#d97706', '/', 'Back to Home'));
    }
    if (isExpired(link)) {
      return res
        .status(410)
        .send(messagePage('Link Expired', 'Link Has Expired', 'The expiration date for this short link has passed.', '#dc2626', '/', 'Create New Link'));
    }

    // Protected links: no click is counted here. It is counted only after the passcode is verified.
    if (link.is_password_protected) {
      return res.redirect(`/?passcode=${encodeURIComponent(link.slug)}`);
    }

    recordClick(link, req, req.get('referer') || 'Direct');
    res.redirect(302, link.original_url);
  });

  // -------------------------------------------------------------
  // Admin routes (API key required)
  // -------------------------------------------------------------
  app.use('/api/v1', requireAuth);

  app.get('/api/v1/analytics/overview', (_req, res) => {
    const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    res.json({
      total_links: db.links.length,
      active_links: db.links.filter((l) => l.is_active).length,
      total_clicks: db.links.reduce((sum, l) => sum + l.clicks_count, 0),
      clicks_last_24h: db.clicks.filter((c) => c.timestamp >= oneDayAgo).length,
      cache_performance: cache.getStats(),
    });
  });

  app.get('/api/v1/urls', (req, res) => {
    const { search, filter_active, tag } = req.query;
    let links = [...db.links];

    if (typeof search === 'string' && search) {
      const q = search.toLowerCase();
      links = links.filter((l) => l.slug.toLowerCase().includes(q) || l.title.toLowerCase().includes(q) || l.original_url.toLowerCase().includes(q));
    }
    if (filter_active === 'true' || filter_active === 'false') {
      links = links.filter((l) => l.is_active === (filter_active === 'true'));
    }
    if (typeof tag === 'string' && tag) {
      links = links.filter((l) => l.tags?.includes(tag));
    }
    links.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(links.map(toPublicLink));
  });

  app.post(
    '/api/v1/urls',
    handle(async (req, res) => {
      const body = requireObject(req.body);
      const url = validateUrl(body.original_url);

      let slug: string;
      if (body.custom_slug !== undefined && body.custom_slug !== null && body.custom_slug !== '') {
        slug = validateSlug(body.custom_slug);
        if (db.links.some((l) => l.slug.toLowerCase() === slug.toLowerCase())) {
          return res.status(409).json({ detail: `The slug '${slug}' is already taken.` });
        }
      } else {
        do slug = generateSlug(6);
        while (db.links.some((l) => l.slug.toLowerCase() === slug.toLowerCase()));
      }

      const utm: Record<string, string | undefined> = {};
      for (const name of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
        utm[name] = validateText(body[name], name, 200);
        if (utm[name]) url.searchParams.set(name, utm[name]!);
      }

      const password = body.password ? validatePassword(body.password) : undefined;
      const expires_at = validateExpiry(body.expires_at);
      const title = validateText(body.title, 'title', 200) || url.hostname;
      const description = validateText(body.description, 'description', 1000);
      const tags = validateTags(body.tags);
      const password_hash = password ? await hashPassword(password) : undefined;

      const now = new Date().toISOString();
      const link: LinkRecord = {
        id: `lnk-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`,
        original_url: url.toString(),
        slug,
        title,
        description,
        is_active: true,
        is_password_protected: Boolean(password_hash),
        password_hash,
        expires_at,
        clicks_count: 0,
        last_clicked_at: null,
        created_at: now,
        updated_at: now,
        ...utm,
        tags,
      };

      db.links.unshift(link);
      save();
      cache.set(link);
      res.status(201).json(toPublicLink(link));
    })
  );

  app.get('/api/v1/urls/:id', (req, res) => {
    const link = db.links.find((l) => l.id === req.params.id);
    if (!link) return res.status(404).json({ detail: 'Link not found' });
    res.json(toPublicLink(link));
  });

  app.patch(
    '/api/v1/urls/:id',
    handle(async (req, res) => {
      const link = db.links.find((l) => l.id === req.params.id);
      if (!link) return res.status(404).json({ detail: 'Link not found' });
      const body = requireObject(req.body);

      // Validate everything first so a bad request changes nothing.
      const changes: Partial<LinkRecord> = {};
      if (body.title !== undefined) changes.title = validateText(body.title, 'title', 200) || link.title;
      if (body.description !== undefined) changes.description = validateText(body.description, 'description', 1000);
      if (body.original_url !== undefined) changes.original_url = validateUrl(body.original_url).toString();
      if (body.is_active !== undefined) {
        if (typeof body.is_active !== 'boolean') throw new ValidationError('is_active must be true or false');
        changes.is_active = body.is_active;
      }
      if (body.expires_at !== undefined) changes.expires_at = validateExpiry(body.expires_at);
      if (body.tags !== undefined) changes.tags = validateTags(body.tags);

      let newHash: string | undefined;
      if (body.remove_password === true) {
        changes.is_password_protected = false;
      } else if (body.password) {
        newHash = await hashPassword(validatePassword(body.password));
        changes.is_password_protected = true;
      }

      Object.assign(link, changes);
      if (body.remove_password === true) delete link.password_hash;
      else if (newHash) link.password_hash = newHash;
      link.updated_at = new Date().toISOString();
      save();
      cache.invalidate(link.slug);
      cache.set(link);
      res.json(toPublicLink(link));
    })
  );

  app.delete('/api/v1/urls/:id', (req, res) => {
    const index = db.links.findIndex((l) => l.id === req.params.id);
    if (index === -1) return res.status(404).json({ detail: 'Link not found' });
    const [removed] = db.links.splice(index, 1);
    db.clicks = db.clicks.filter((c) => c.link_id !== removed.id);
    save();
    cache.invalidate(removed.slug);
    res.status(204).send();
  });

  app.get('/api/v1/analytics/:slug', (req, res) => {
    const link = db.links.find((l) => l.slug === req.params.slug);
    if (!link) return res.status(404).json({ detail: 'Link not found' });

    const clicks = db.clicks.filter((c) => c.link_id === link.id);
    const pct = (n: number) => (clicks.length ? Math.round((n / clicks.length) * 100) : 0);
    const countBy = (fn: (c: ClickRecord) => string) => {
      const counts: Record<string, number> = {};
      clicks.forEach((c) => {
        const k = fn(c);
        counts[k] = (counts[k] || 0) + 1;
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const timeline: Array<{ date: string; label: string; clicks: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split('T')[0];
      timeline.push({
        date,
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        clicks: clicks.filter((c) => c.timestamp.startsWith(date)).length,
      });
    }

    const recent_clicks = [...clicks]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15)
      .map((c) => ({
        id: c.id,
        link_id: c.link_id,
        slug: c.slug,
        timestamp: c.timestamp,
        ip_address: c.ip_address,
        user_agent: c.user_agent,
        referer: c.referer,
        device_type: c.device_type,
        browser: c.browser,
        os: c.os,
      }));

    res.json({
      link_id: link.id,
      slug: link.slug,
      title: link.title,
      original_url: link.original_url,
      is_active: link.is_active,
      created_at: link.created_at,
      total_clicks: link.clicks_count,
      unique_visitors: new Set(clicks.map((c) => c.ip_address)).size,
      today_clicks: clicks.filter((c) => new Date(c.timestamp) >= todayStart).length,
      timeline,
      devices: countBy((c) => c.device_type).map(([device, count]) => ({ device, count, percentage: pct(count) })),
      top_referrers: countBy((c) => (c.referer ? c.referer.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '') || 'Direct')
        .slice(0, 6)
        .map(([referer, count]) => ({ referer, count, percentage: pct(count) })),
      top_browsers: countBy((c) => c.browser).map(([browser, count]) => ({ browser, count, percentage: pct(count) })),
      recent_clicks,
      // Location is not collected: no GeoIP database is configured, so we never guess.
      geo_available: false,
      cache_status: 'In-memory cache',
    });
  });

  app.get('/api/v1/export/csv', (_req, res) => {
    const headers = ['Slug', 'Title', 'Original URL', 'Clicks', 'Active', 'Created At', 'Expires At'];
    const rows = db.links.map((l) =>
      [csvCell(l.slug), csvCell(l.title), csvCell(l.original_url), l.clicks_count, l.is_active ? 'Yes' : 'No', csvCell(l.created_at), l.expires_at ? csvCell(l.expires_at) : 'None'].join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="kiteurl-export.csv"');
    res.send([headers.join(','), ...rows].join('\n'));
  });

  app.use('/api', (_req, res) => res.status(404).json({ detail: 'Not found' }));

  app.use((err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ detail: 'Invalid JSON body' });
    if (err.type === 'entity.too.large') return res.status(413).json({ detail: 'Request body too large' });
    console.error(err);
    res.status(500).json({ detail: 'Internal server error' });
  });

  return app;
}
