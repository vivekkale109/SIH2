import { ConfigService } from '@nestjs/config';
import { SignerService } from './signer.service';

describe('SignerService', () => {
  let signerService: SignerService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService();
    signerService = new SignerService(configService);
    signerService.onModuleInit();
  });

  it('should generate an ephemeral Ed25519 keypair when environment keys are not provided', () => {
    const pubKey = signerService.getPublicKeyPem();
    expect(pubKey).toBeDefined();
    expect(pubKey).toContain('BEGIN PUBLIC KEY');
  });

  it('should sign data and produce a verifiable Ed25519 signature', () => {
    const message = 'Investigative Evidence Payload SHA-256 Digest 1234567890';
    const { signature, publicKey } = signerService.signData(message);

    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');
    expect(publicKey).toBe(signerService.getPublicKeyPem());

    // Verify valid signature
    const isValid = signerService.verifySignature(message, signature, publicKey);
    expect(isValid).toBe(true);
  });

  it('should reject signature if signed data has been tampered with', () => {
    const originalMessage = 'Integrity guaranteed statement';
    const tamperedMessage = 'Integrity altered statement';

    const { signature, publicKey } = signerService.signData(originalMessage);

    const isValid = signerService.verifySignature(tamperedMessage, signature, publicKey);
    expect(isValid).toBe(false);
  });

  it('should reject signature if signature bytes have been altered', () => {
    const message = 'Sample legal record';
    const { signature, publicKey } = signerService.signData(message);

    // Corrupt signature hex string
    const corruptedSig = signature.startsWith('0')
      ? 'f' + signature.slice(1)
      : '0' + signature.slice(1);

    const isValid = signerService.verifySignature(message, corruptedSig, publicKey);
    expect(isValid).toBe(false);
  });
});
