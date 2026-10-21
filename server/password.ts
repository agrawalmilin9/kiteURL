import crypto from 'crypto';

const KEY_LENGTH = 64;

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** Returns "scrypt$<salt hex>$<key hex>". A random salt is used for every password. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

/**
 * Checks a password against a stored hash.
 * Old unsalted SHA-256 hashes (from earlier versions) are still accepted once,
 * and `needsRehash` tells the caller to upgrade them to scrypt.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (stored.startsWith('scrypt$')) {
    const [, saltHex, keyHex] = stored.split('$');
    if (!saltHex || !keyHex) return { valid: false, needsRehash: false };
    const expected = Buffer.from(keyHex, 'hex');
    const actual = await scrypt(password, Buffer.from(saltHex, 'hex'));
    const valid = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    return { valid, needsRehash: false };
  }

  if (/^[0-9a-f]{64}$/i.test(stored)) {
    const legacy = crypto.createHash('sha256').update(password).digest();
    const expected = Buffer.from(stored, 'hex');
    return { valid: crypto.timingSafeEqual(legacy, expected), needsRehash: true };
  }

  return { valid: false, needsRehash: false };
}
