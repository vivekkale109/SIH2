import crypto from 'crypto';

/**
 * Computes SHA-256 hash in lowercase hex encoding.
 */
export function sha256Digest(data: Buffer | Uint8Array | string): string {
  const hash = crypto.createHash('sha256');
  if (typeof data === 'string') {
    hash.update(data, 'utf-8');
  } else {
    hash.update(data);
  }
  return hash.digest('hex');
}

/**
 * Verifies an Ed25519 digital signature against data bytes.
 * Supports public key in PEM format, SPKI DER hex/base64, or raw Ed25519 public key.
 */
export function verifyEd25519Signature(
  data: Buffer | Uint8Array | string,
  signatureHex: string,
  publicKeyPemOrDer: string,
): boolean {
  try {
    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : Buffer.from(data);
    const signatureBuffer = Buffer.from(signatureHex, 'hex');

    let keyObject: crypto.KeyObject;

    if (publicKeyPemOrDer.includes('BEGIN PUBLIC KEY')) {
      keyObject = crypto.createPublicKey({
        key: publicKeyPemOrDer,
        format: 'pem',
      });
    } else {
      // Hex or base64 DER/SPKI format
      const isHex = /^[0-9a-fA-F]+$/.test(publicKeyPemOrDer.trim());
      const keyBuffer = isHex
        ? Buffer.from(publicKeyPemOrDer.trim(), 'hex')
        : Buffer.from(publicKeyPemOrDer.trim(), 'base64');

      try {
        keyObject = crypto.createPublicKey({
          key: keyBuffer,
          format: 'der',
          type: 'spki',
        });
      } catch {
        // If raw 32-byte Ed25519 public key, wrap in standard SPKI header:
        // ASN.1 prefix for Ed25519: 302a300506032b6570032100 <32-byte-key>
        if (keyBuffer.length === 32) {
          const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');
          const fullSpki = Buffer.concat([spkiPrefix, keyBuffer]);
          keyObject = crypto.createPublicKey({
            key: fullSpki,
            format: 'der',
            type: 'spki',
          });
        } else {
          return false;
        }
      }
    }

    return crypto.verify(null, dataBuffer, keyObject, signatureBuffer);
  } catch (err) {
    return false;
  }
}
