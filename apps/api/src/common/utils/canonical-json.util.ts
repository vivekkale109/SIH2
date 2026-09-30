import * as crypto from 'crypto';

/**
 * Deterministically serializes any JavaScript value to Canonical JSON:
 * - Object keys are sorted lexicographically at all nesting levels
 * - No whitespace between keys, values, or delimiters
 * - Undefined values in objects are omitted (like standard JSON)
 * - Dates are converted to ISO 8601 strings
 */
export function canonicalJson(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'null';
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    const elements = value.map((item) => canonicalJson(item === undefined ? null : item));
    return `[${elements.join(',')}]`;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const pairs: string[] = [];

    for (const key of sortedKeys) {
      const val = record[key];
      if (val !== undefined && typeof val !== 'function' && typeof val !== 'symbol') {
        pairs.push(`${JSON.stringify(key)}:${canonicalJson(val)}`);
      }
    }

    return `{${pairs.join(',')}}`;
  }

  return 'null';
}

/**
 * Computes SHA-256 hash formatted as lowercase hex string.
 */
export function sha256Hex(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Constant-time comparison between two hex strings or buffers.
 */
export function secureTimingCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
