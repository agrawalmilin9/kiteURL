export class ValidationError extends Error {}

export const SLUG_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

function fail(message: string): never {
  throw new ValidationError(message);
}

/** Accepts only http/https URLs. A missing scheme (e.g. "example.com") becomes https. */
export function validateUrl(value: unknown, field = 'original_url'): URL {
  if (typeof value !== 'string' || !value.trim()) fail(`${field} is required`);
  let raw = value.trim();
  if (raw.length > 2048) fail(`${field} is too long (max 2048 characters)`);

  if (!/^https?:\/\//i.test(raw)) {
    // "javascript:...", "ftp://..." etc. are rejected. "example.com:8080" is allowed.
    if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(raw)) fail(`${field} must use http or https`);
    raw = `https://${raw}`;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail(`${field} is not a valid URL`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') fail(`${field} must use http or https`);
  if (!url.hostname) fail(`${field} is not a valid URL`);
  if (url.username || url.password) fail(`${field} must not contain a username or password`);
  return url;
}

export function validateSlug(value: unknown): string {
  if (typeof value !== 'string' || !SLUG_PATTERN.test(value.trim())) {
    fail('custom_slug must be 3-32 characters: letters, numbers, "-" or "_"');
  }
  return value.trim();
}

/** Returns an ISO string, or null when there is no expiry. Must be a valid future date. */
export function validateExpiry(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' && typeof value !== 'number') fail('expires_at must be a date');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail('expires_at is not a valid date');
  if (date.getTime() <= Date.now()) fail('expires_at must be in the future');
  return date.toISOString();
}

export function validateText(value: unknown, field: string, max: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') fail(`${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > max) fail(`${field} is too long (max ${max} characters)`);
  return trimmed || undefined;
}

export function validatePassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 4 || value.length > 128) {
    fail('password must be 4-128 characters');
  }
  return value;
}

export function validateTags(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 20) fail('tags must be a list of at most 20 items');
  return value.map((tag) => {
    if (typeof tag !== 'string' || !tag.trim() || tag.trim().length > 30) {
      fail('each tag must be a non-empty string of at most 30 characters');
    }
    return tag.trim();
  });
}

export function requireObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Request body must be a JSON object');
  return body as Record<string, unknown>;
}
