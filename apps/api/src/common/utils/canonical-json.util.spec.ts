import { canonicalJson, sha256Hex, secureTimingCompare } from './canonical-json.util';

describe('canonicalJson', () => {
  it('should sort object keys in lexicographical order', () => {
    const obj1 = { z: 1, a: 2, m: 3 };
    const obj2 = { a: 2, m: 3, z: 1 };
    expect(canonicalJson(obj1)).toBe('{"a":2,"m":3,"z":1}');
    expect(canonicalJson(obj2)).toBe('{"a":2,"m":3,"z":1}');
    expect(canonicalJson(obj1)).toBe(canonicalJson(obj2));
  });

  it('should sort nested object keys recursively', () => {
    const nested = {
      b: { y: 'bar', x: 'foo' },
      a: [3, 2, 1],
    };
    expect(canonicalJson(nested)).toBe('{"a":[3,2,1],"b":{"x":"foo","y":"bar"}}');
  });

  it('should omit undefined values from objects', () => {
    const obj = { a: 1, b: undefined, c: 'test' };
    expect(canonicalJson(obj)).toBe('{"a":1,"c":"test"}');
  });

  it('should handle primitives and arrays correctly', () => {
    expect(canonicalJson('hello')).toBe('"hello"');
    expect(canonicalJson(42)).toBe('42');
    expect(canonicalJson(true)).toBe('true');
    expect(canonicalJson(false)).toBe('false');
    expect(canonicalJson(null)).toBe('null');
    expect(canonicalJson([1, 'a', false])).toBe('[1,"a",false]');
  });

  it('should serialize Date objects to ISO 8601 strings', () => {
    const d = new Date('2026-09-30T10:00:00.000Z');
    expect(canonicalJson({ date: d })).toBe('{"date":"2026-09-30T10:00:00.000Z"}');
  });
});

describe('sha256Hex', () => {
  it('should compute consistent SHA-256 hex digest', () => {
    const hash = sha256Hex('test payload');
    expect(hash).toHaveLength(64);
    expect(hash).toBe(sha256Hex('test payload'));
    expect(hash).not.toBe(sha256Hex('different payload'));
  });
});

describe('secureTimingCompare', () => {
  it('should return true for identical strings', () => {
    const a = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const b = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(secureTimingCompare(a, b)).toBe(true);
  });

  it('should return false for differing strings of same length', () => {
    const a = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const b = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b854';
    expect(secureTimingCompare(a, b)).toBe(false);
  });

  it('should return false for strings of differing length', () => {
    expect(secureTimingCompare('abc', 'abcd')).toBe(false);
  });
});
