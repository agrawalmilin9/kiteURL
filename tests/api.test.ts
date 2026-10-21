import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createApp } from '../server/app.ts';
import { hashPassword, verifyPassword } from '../server/password.ts';
import crypto from 'crypto';

const KEY = 'test-key';
const auth = { Authorization: `Bearer ${KEY}` };

let dir: string;
let dataFile: string;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiteurl-test-'));
  dataFile = path.join(dir, 'db.json');
  app = createApp({ dataFile, apiKey: KEY });
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const create = (body: object) => request(app).post('/api/v1/urls').set(auth).send(body);
const future = () => new Date(Date.now() + 86400000).toISOString();

describe('isolation', () => {
  it('refuses to run in tests without an explicit data file', () => {
    expect(() => createApp()).toThrow();
  });

  it('writes only to the temporary file', async () => {
    await create({ original_url: 'https://example.com' });
    expect(JSON.parse(fs.readFileSync(dataFile, 'utf-8')).links).toHaveLength(1);
  });
});

describe('unauthorized requests', () => {
  const routes: Array<[string, string]> = [
    ['get', '/api/v1/urls'],
    ['post', '/api/v1/urls'],
    ['get', '/api/v1/urls/abc'],
    ['patch', '/api/v1/urls/abc'],
    ['delete', '/api/v1/urls/abc'],
    ['get', '/api/v1/analytics/overview'],
    ['get', '/api/v1/analytics/some-slug'],
    ['get', '/api/v1/export/csv'],
  ];

  it.each(routes)('%s %s returns 401 without a key', async (method, url) => {
    const res = await (request(app) as any)[method](url);
    expect(res.status).toBe(401);
  });

  it('returns 401 with a wrong key and works with the right key', async () => {
    const bad = await request(app).get('/api/v1/urls').set('Authorization', 'Bearer nope');
    expect(bad.status).toBe(401);
    const good = await request(app).get('/api/v1/urls').set(auth);
    expect(good.status).toBe(200);
  });

  it('keeps redirects and health public', async () => {
    expect((await request(app).get('/api/v1/health')).status).toBe(200);
    expect((await request(app).get('/r/missing')).status).toBe(404);
  });
});

describe('URL creation and validation', () => {
  it('creates a link with a generated slug', async () => {
    const res = await create({ original_url: 'https://example.com/page', title: 'Example' });
    expect(res.status).toBe(201);
    expect(res.body.slug).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(res.body.title).toBe('Example');
    expect(res.body.clicks_count).toBe(0);
  });

  it('adds https:// when the scheme is missing', async () => {
    const res = await create({ original_url: 'example.com' });
    expect(res.status).toBe(201);
    expect(res.body.original_url).toBe('https://example.com/');
  });

  it('appends UTM parameters', async () => {
    const res = await create({ original_url: 'https://example.com/?a=1', utm_source: 'news' });
    expect(res.body.original_url).toContain('a=1');
    expect(res.body.original_url).toContain('utm_source=news');
  });

  it.each(['javascript:alert(1)', 'ftp://example.com', 'data:text/html,hi', 'https://user:pw@example.com', 'http://', ''])(
    'rejects bad URL %j',
    async (bad) => {
      expect((await create({ original_url: bad })).status).toBe(400);
    }
  );

  it('rejects missing or non-object bodies', async () => {
    expect((await create({})).status).toBe(400);
    const res = await request(app).post('/api/v1/urls').set(auth).set('Content-Type', 'application/json').send('{bad json');
    expect(res.status).toBe(400);
  });

  it('accepts a valid custom slug and rejects duplicates (case-insensitive)', async () => {
    expect((await create({ original_url: 'https://a.com', custom_slug: 'my-link' })).status).toBe(201);
    expect((await create({ original_url: 'https://b.com', custom_slug: 'MY-LINK' })).status).toBe(409);
  });

  it.each(['ab', 'has space', 'bad/slug', '<script>', 'x'.repeat(33)])('rejects bad slug %j', async (slug) => {
    expect((await create({ original_url: 'https://a.com', custom_slug: slug })).status).toBe(400);
  });

  it('rejects invalid and past expiration dates', async () => {
    expect((await create({ original_url: 'https://a.com', expires_at: 'not-a-date' })).status).toBe(400);
    expect((await create({ original_url: 'https://a.com', expires_at: '2000-01-01T00:00:00Z' })).status).toBe(400);
    expect((await create({ original_url: 'https://a.com', expires_at: future() })).status).toBe(201);
  });

  it('rejects bad field types, short passwords and bad tags', async () => {
    expect((await create({ original_url: 'https://a.com', title: 123 })).status).toBe(400);
    expect((await create({ original_url: 'https://a.com', title: 'x'.repeat(201) })).status).toBe(400);
    expect((await create({ original_url: 'https://a.com', password: 'abc' })).status).toBe(400);
    expect((await create({ original_url: 'https://a.com', tags: 'nope' })).status).toBe(400);
  });

  it('validates PATCH input and changes nothing on error', async () => {
    const { body: link } = await create({ original_url: 'https://a.com', title: 'Keep' });
    const bad = await request(app).patch(`/api/v1/urls/${link.id}`).set(auth).send({ title: 'New', original_url: 'javascript:x' });
    expect(bad.status).toBe(400);
    const same = await request(app).get(`/api/v1/urls/${link.id}`).set(auth);
    expect(same.body.title).toBe('Keep');
    const ok = await request(app).patch(`/api/v1/urls/${link.id}`).set(auth).send({ title: 'New', is_active: false });
    expect(ok.body.title).toBe('New');
    expect(ok.body.is_active).toBe(false);
  });

  it('deletes a link', async () => {
    const { body: link } = await create({ original_url: 'https://a.com' });
    expect((await request(app).delete(`/api/v1/urls/${link.id}`).set(auth)).status).toBe(204);
    expect((await request(app).get(`/r/${link.slug}`)).status).toBe(404);
  });
});

describe('redirects', () => {
  it('redirects with 302 and counts the click', async () => {
    const { body: link } = await create({ original_url: 'https://example.com/target', custom_slug: 'go-now' });
    const res = await request(app).get('/r/go-now').set('User-Agent', 'Mozilla/5.0 (iPhone) Safari');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com/target');
    const after = await request(app).get(`/api/v1/urls/${link.id}`).set(auth);
    expect(after.body.clicks_count).toBe(1);
  });

  it('returns 404 for unknown slugs and escapes the slug in the page', async () => {
    const res = await request(app).get('/r/%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('<script>alert(1)');
  });

  it('returns 403 for paused links and does not count a click', async () => {
    const { body: link } = await create({ original_url: 'https://example.com', custom_slug: 'paused-one' });
    await request(app).patch(`/api/v1/urls/${link.id}`).set(auth).send({ is_active: false });
    expect((await request(app).get('/r/paused-one')).status).toBe(403);
    const stats = await request(app).get('/api/v1/analytics/paused-one').set(auth);
    expect(stats.body.total_clicks).toBe(0);
  });
});

describe('expiration', () => {
  it('returns 410 for expired links and does not count a click', async () => {
    const { body: link } = await create({ original_url: 'https://example.com', custom_slug: 'soon-gone', expires_at: future() });
    // Move the expiry into the past directly in the temp data file, then reload the app.
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    data.links[0].expires_at = new Date(Date.now() - 1000).toISOString();
    fs.writeFileSync(dataFile, JSON.stringify(data));
    app = createApp({ dataFile, apiKey: KEY });

    expect((await request(app).get('/r/soon-gone')).status).toBe(410);
    expect((await request(app).post('/api/v1/urls/soon-gone/verify').send({ password: 'x' })).status).toBe(410);
    const after = await request(app).get(`/api/v1/urls/${link.id}`).set(auth);
    expect(after.body.clicks_count).toBe(0);
  });
});

describe('password protection', () => {
  const makeProtected = async () => {
    const res = await create({ original_url: 'https://example.com/secret', custom_slug: 'locked', password: 'correct-pass' });
    return res.body;
  };

  it('never returns the password hash from any endpoint', async () => {
    const link = await makeProtected();
    expect(link.is_password_protected).toBe(true);
    expect(JSON.stringify(link)).not.toMatch(/password_hash|scrypt/);
    const list = await request(app).get('/api/v1/urls').set(auth);
    const one = await request(app).get(`/api/v1/urls/${link.id}`).set(auth);
    const patched = await request(app).patch(`/api/v1/urls/${link.id}`).set(auth).send({ title: 'T' });
    for (const body of [list.body, one.body, patched.body]) {
      expect(JSON.stringify(body)).not.toMatch(/password_hash|scrypt/);
    }
  });

  it('stores a salted scrypt hash, not SHA-256 or plain text', async () => {
    await makeProtected();
    const stored = JSON.parse(fs.readFileSync(dataFile, 'utf-8')).links[0].password_hash;
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(stored).not.toContain('correct-pass');
    const sha = crypto.createHash('sha256').update('correct-pass').digest('hex');
    expect(stored).not.toContain(sha);
  });

  it('sends visitors to the passcode page without counting a click', async () => {
    const link = await makeProtected();
    const res = await request(app).get('/r/locked');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/?passcode=locked');
    const after = await request(app).get(`/api/v1/urls/${link.id}`).set(auth);
    expect(after.body.clicks_count).toBe(0);
  });

  it('wrong passcode returns 401, hides the URL and does not count a click', async () => {
    const link = await makeProtected();
    const res = await request(app).post('/api/v1/urls/locked/verify').send({ password: 'wrong' });
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain('example.com');
    const after = await request(app).get(`/api/v1/urls/${link.id}`).set(auth);
    expect(after.body.clicks_count).toBe(0);
    const stats = await request(app).get('/api/v1/analytics/locked').set(auth);
    expect(stats.body.recent_clicks).toHaveLength(0);
  });

  it('correct passcode returns the URL and counts exactly one click', async () => {
    const link = await makeProtected();
    const res = await request(app).post('/api/v1/urls/locked/verify').send({ password: 'correct-pass' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true, target_url: 'https://example.com/secret' });
    const after = await request(app).get(`/api/v1/urls/${link.id}`).set(auth);
    expect(after.body.clicks_count).toBe(1);
  });

  it('blocks repeated wrong guesses with 429', async () => {
    await makeProtected();
    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = (await request(app).post('/api/v1/urls/locked/verify').send({ password: `bad${i}` })).status;
    }
    expect(last).toBe(429);
    // Even the right passcode is refused while blocked.
    expect((await request(app).post('/api/v1/urls/locked/verify').send({ password: 'correct-pass' })).status).toBe(429);
  });

  it('can change and remove the password', async () => {
    const link = await makeProtected();
    await request(app).patch(`/api/v1/urls/${link.id}`).set(auth).send({ password: 'brand-new' });
    expect((await request(app).post('/api/v1/urls/locked/verify').send({ password: 'correct-pass' })).status).toBe(401);
    expect((await request(app).post('/api/v1/urls/locked/verify').send({ password: 'brand-new' })).status).toBe(200);
    const removed = await request(app).patch(`/api/v1/urls/${link.id}`).set(auth).send({ remove_password: true });
    expect(removed.body.is_password_protected).toBe(false);
    expect((await request(app).get('/r/locked')).headers.location).toBe('https://example.com/secret');
  });

  it('still accepts an old SHA-256 hash and upgrades it to scrypt', async () => {
    await create({ original_url: 'https://example.com/old', custom_slug: 'legacy' });
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    data.links[0].is_password_protected = true;
    data.links[0].password_hash = crypto.createHash('sha256').update('oldpass').digest('hex');
    fs.writeFileSync(dataFile, JSON.stringify(data));
    app = createApp({ dataFile, apiKey: KEY });

    expect((await request(app).post('/api/v1/urls/legacy/verify').send({ password: 'oldpass' })).status).toBe(200);
    expect(JSON.parse(fs.readFileSync(dataFile, 'utf-8')).links[0].password_hash.startsWith('scrypt$')).toBe(true);
  });
});

describe('password hashing', () => {
  it('uses a different salt each time and verifies correctly', async () => {
    const a = await hashPassword('secret123');
    const b = await hashPassword('secret123');
    expect(a).not.toBe(b);
    expect((await verifyPassword('secret123', a)).valid).toBe(true);
    expect((await verifyPassword('wrong', a)).valid).toBe(false);
  });
});

describe('analytics', () => {
  it('records real click data and never invents a location', async () => {
    await create({ original_url: 'https://example.com', custom_slug: 'stats' });
    const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
    await request(app).get('/r/stats').set('User-Agent', chrome).set('Referer', 'https://news.ycombinator.com/item?id=1');
    await request(app).get('/r/stats').set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17) Mobile Safari');

    const res = await request(app).get('/api/v1/analytics/stats').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.total_clicks).toBe(2);
    expect(res.body.recent_clicks).toHaveLength(2);
    expect(res.body.devices.map((d: any) => d.device).sort()).toEqual(['desktop', 'mobile']);
    expect(res.body.top_referrers.map((r: any) => r.referer)).toContain('news.ycombinator.com');
    expect(res.body.timeline).toHaveLength(7);
    expect(res.body.geo_available).toBe(false);
    expect(res.body).not.toHaveProperty('top_countries');
    for (const click of res.body.recent_clicks) {
      expect(click).not.toHaveProperty('country');
      expect(click).not.toHaveProperty('city');
    }
  });

  it('hides fake location fields stored by older versions', async () => {
    await create({ original_url: 'https://example.com', custom_slug: 'oldgeo' });
    await request(app).get('/r/oldgeo');
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    Object.assign(data.clicks[0], { country: 'United States', country_code: 'US', city: 'San Francisco' });
    fs.writeFileSync(dataFile, JSON.stringify(data));
    app = createApp({ dataFile, apiKey: KEY });
    const res = await request(app).get('/api/v1/analytics/oldgeo').set(auth);
    expect(JSON.stringify(res.body)).not.toContain('San Francisco');
  });

  it('has no simulate-click endpoint', async () => {
    await create({ original_url: 'https://example.com', custom_slug: 'nosim' });
    expect((await request(app).post('/api/v1/analytics/nosim/simulate-click').set(auth)).status).toBe(404);
  });

  it('returns 404 for unknown slugs and reports an honest overview', async () => {
    expect((await request(app).get('/api/v1/analytics/none').set(auth)).status).toBe(404);
    const empty = await request(app).get('/api/v1/analytics/overview').set(auth);
    expect(empty.body.total_links).toBe(0);
    expect(empty.body.cache_performance.hit_ratio_percent).toBe(0);
    expect(empty.body.cache_performance.backend).toMatch(/in-memory/i);
    expect(JSON.stringify(empty.body)).not.toMatch(/redis/i);
  });
});

describe('csv export', () => {
  it('neutralises spreadsheet formulas in titles', async () => {
    await create({ original_url: 'https://example.com', title: '=HYPERLINK("http://evil")' });
    const res = await request(app).get('/api/v1/export/csv').set(auth);
    expect(res.status).toBe(200);
    expect(res.text).toContain(`"'=HYPERLINK`);
  });
});
