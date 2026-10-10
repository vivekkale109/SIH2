import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';

@Injectable()
export class SignerService implements OnModuleInit {
  private readonly logger = new Logger(SignerService.name);
  private privateKeyPem!: string;
  private publicKeyPem!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const envPrivKey =
      this.configService.get<string>('EXPORT_SIGNING_PRIVATE_KEY') ||
      this.configService.get<string>('ED25519_PRIVATE_KEY');
    const envPubKey =
      this.configService.get<string>('EXPORT_SIGNING_PUBLIC_KEY') ||
      this.configService.get<string>('ED25519_PUBLIC_KEY');

    if (envPrivKey && envPubKey) {
      this.privateKeyPem = envPrivKey.replace(/\\n/g, '\n');
      this.publicKeyPem = envPubKey.replace(/\\n/g, '\n');
      this.logger.log('Loaded Ed25519 signing keypair from environment configuration');
    } else {
      // Auto-generate a secure Ed25519 keypair for local/demo/staging operation
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      this.privateKeyPem = privateKey;
      this.publicKeyPem = publicKey;
      this.logger.warn(
        'ED25519_PRIVATE_KEY not provided in environment. Generated ephemeral Ed25519 keypair for export signing.',
      );
    }
  }

  /**
   * Signs data bytes using Ed25519 private key.
   * Returns detached signature in hex format and the corresponding public key in PEM format.
   */
  signData(data: Buffer | Uint8Array | string): { signature: string; publicKey: string } {
    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : Buffer.from(data);
    const privateKeyObj = crypto.createPrivateKey({
      key: this.privateKeyPem,
      format: 'pem',
    });

    const signature = crypto.sign(null, dataBuffer, privateKeyObj);

    return {
      signature: signature.toString('hex'),
      publicKey: this.publicKeyPem,
    };
  }

  /**
   * Verifies an Ed25519 signature against data.
   */
  verifySignature(
    data: Buffer | Uint8Array | string,
    signatureHex: string,
    publicKeyPem?: string,
  ): boolean {
    try {
      const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : Buffer.from(data);
      const signatureBuffer = Buffer.from(signatureHex, 'hex');
      const keyPem = publicKeyPem || this.publicKeyPem;

      const publicKeyObj = crypto.createPublicKey({
        key: keyPem,
        format: 'pem',
      });

      return crypto.verify(null, dataBuffer, publicKeyObj, signatureBuffer);
    } catch (err: any) {
      this.logger.warn(`Signature verification failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Returns current active Ed25519 public key in PEM format.
   */
  getPublicKeyPem(): string {
    return this.publicKeyPem;
  }
}
