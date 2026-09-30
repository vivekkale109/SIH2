import { validate, Environment } from './env.validation';

describe('Environment Validation', () => {
  it('should validate valid environment configuration', () => {
    const validConfig = {
      NODE_ENV: 'development',
      PORT: '4000',
      DATABASE_URL: 'postgresql://sdms_user:sdms_password@localhost:5432/sdms_db',
    };

    const result = validate(validConfig);
    expect(result.PORT).toBe(4000);
    expect(result.NODE_ENV).toBe(Environment.Development);
    expect(result.DATABASE_URL).toBe('postgresql://sdms_user:sdms_password@localhost:5432/sdms_db');
  });

  it('should throw an error when DATABASE_URL is missing', () => {
    const invalidConfig = {
      NODE_ENV: 'development',
      PORT: '4000',
    };

    expect(() => validate(invalidConfig)).toThrow(/Environment validation error/);
  });
});
