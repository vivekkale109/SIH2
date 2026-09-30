import { PasswordUtil } from './password.util';

describe('PasswordUtil', () => {
  describe('validatePolicy', () => {
    it('should reject passwords shorter than 12 characters', () => {
      const result = PasswordUtil.validatePolicy('Short1!Aa');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should reject passwords missing uppercase', () => {
      const result = PasswordUtil.validatePolicy('alllowercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords missing lowercase', () => {
      const result = PasswordUtil.validatePolicy('ALLUPPERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords missing numbers', () => {
      const result = PasswordUtil.validatePolicy('NoNumbersHere!Aa');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject passwords missing special characters', () => {
      const result = PasswordUtil.validatePolicy('NoSpecialChars123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should accept a compliant password', () => {
      const result = PasswordUtil.validatePolicy('StrongP@ssw0rd2026!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('hash and verify', () => {
    it('should hash a password with argon2id and verify correctly', async () => {
      const password = 'StrongP@ssw0rd2026!';
      const hash = await PasswordUtil.hash(password);

      expect(hash).toContain('$argon2id$');
      const isValid = await PasswordUtil.verify(hash, password);
      expect(isValid).toBe(true);

      const isInvalid = await PasswordUtil.verify(hash, 'WrongPassword123!');
      expect(isInvalid).toBe(false);
    });
  });
});
