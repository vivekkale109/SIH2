import fs from 'fs';
import JSZip from 'jszip';
import {
  ExportManifest,
  PackageVerificationResult,
  PackageVerificationDocumentCheck,
} from '@sdms/shared-types';
import { canonicalJsonStringify } from './canonical';
import { sha256Digest, verifyEd25519Signature } from './crypto';

export interface VerifyPackageOptions {
  trustedPublicKey?: string;
}

/**
 * Validates an SDMS court evidence export package completely offline.
 * Re-computes SHA-256 for all embedded documents, verifies the Ed25519 signature
 * on the manifest, and validates the immutable audit trail hash links.
 *
 * @param zipInput File path (string) or raw Buffer/Uint8Array/ArrayBuffer of the ZIP package.
 * @param options Optional configuration, including trusted public key override.
 */
export async function verifyExportPackage(
  zipInput: string | Buffer | Uint8Array | ArrayBuffer,
  options: VerifyPackageOptions = {},
): Promise<PackageVerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const documentsChecked: PackageVerificationDocumentCheck[] = [];

  // 1. Resolve raw bytes from input
  let rawZipBytes: Buffer | Uint8Array | ArrayBuffer;
  if (typeof zipInput === 'string') {
    if (!fs.existsSync(zipInput)) {
      return {
        verified: false,
        status: 'CORRUPTED_PACKAGE',
        signatureValid: false,
        manifestHashValid: false,
        documentsChecked: [],
        auditChainValid: false,
        errors: [`Specified export package file '${zipInput}' does not exist on disk`],
        warnings: [],
      };
    }
    rawZipBytes = fs.readFileSync(zipInput);
  } else {
    rawZipBytes = zipInput;
  }

  // 2. Unpack ZIP
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(rawZipBytes);
  } catch (err: any) {
    return {
      verified: false,
      status: 'CORRUPTED_PACKAGE',
      signatureValid: false,
      manifestHashValid: false,
      documentsChecked: [],
      auditChainValid: false,
      errors: [`Failed to unpack ZIP archive: ${err.message || 'Corrupted archive'}`],
      warnings: [],
    };
  }

  // 3. Locate and extract manifest.json
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    return {
      verified: false,
      status: 'CORRUPTED_PACKAGE',
      signatureValid: false,
      manifestHashValid: false,
      documentsChecked: [],
      auditChainValid: false,
      errors: ["Export package is missing required root descriptor 'manifest.json'"],
      warnings: [],
    };
  }

  let manifest: ExportManifest;
  try {
    const manifestStr = await manifestFile.async('text');
    manifest = JSON.parse(manifestStr);
  } catch (err: any) {
    return {
      verified: false,
      status: 'TAMPERED_MANIFEST',
      signatureValid: false,
      manifestHashValid: false,
      documentsChecked: [],
      auditChainValid: false,
      errors: [`'manifest.json' could not be parsed as valid JSON: ${err.message}`],
      warnings: [],
    };
  }

  // 4. Verify canonical manifestHash
  // Manifest hash is computed over canonical JSON of manifest excluding `signature` and `manifestHash`
  const {
    manifestHash: claimedHash,
    signature,
    publicKey: manifestPubKey,
    ...manifestPayload
  } = manifest;
  const canonicalPayload = canonicalJsonStringify(manifestPayload);
  const computedManifestHash = sha256Digest(canonicalPayload);

  let manifestHashValid = false;
  if (claimedHash && claimedHash.toLowerCase() === computedManifestHash.toLowerCase()) {
    manifestHashValid = true;
  } else {
    errors.push(
      `Manifest hash verification failed. Claimed '${claimedHash || 'none'}', computed '${computedManifestHash}'. Manifest has been altered.`,
    );
  }

  // 5. Verify Ed25519 digital signature
  const publicKeyToUse = options.trustedPublicKey || manifestPubKey;
  let signatureValid = false;

  if (!publicKeyToUse) {
    errors.push('No public key provided in manifest or verification options to verify signature');
  } else if (!signature) {
    errors.push("Missing Ed25519 digital signature in 'manifest.json'");
  } else {
    // Verify signature against canonical manifest hash or payload
    const sigVerifiedOnHash = verifyEd25519Signature(
      computedManifestHash,
      signature,
      publicKeyToUse,
    );
    const sigVerifiedOnClaimed = claimedHash
      ? verifyEd25519Signature(claimedHash, signature, publicKeyToUse)
      : false;
    const sigVerifiedOnRaw = verifyEd25519Signature(canonicalPayload, signature, publicKeyToUse);

    if (sigVerifiedOnHash || sigVerifiedOnClaimed || sigVerifiedOnRaw) {
      signatureValid = true;
    } else {
      errors.push(
        'Ed25519 cryptographic signature is INVALID. Package origin and authenticity cannot be confirmed.',
      );
    }
  }

  // 6. Verify each embedded document against stored SHA-256
  let allDocumentsMatched = true;
  if (Array.isArray(manifest.documents)) {
    for (const doc of manifest.documents) {
      // Normalize path (handle documents/filename or filename)
      const cleanPath = doc.relativePath.replace(/^\//, '');
      const zipEntry =
        zip.file(cleanPath) ||
        zip.file(`documents/${cleanPath}`) ||
        zip.file(cleanPath.replace(/^documents\//, ''));

      if (!zipEntry) {
        allDocumentsMatched = false;
        errors.push(
          `Document '${doc.title}' (${doc.relativePath}) is declared in manifest but missing from ZIP package`,
        );
        documentsChecked.push({
          title: doc.title,
          relativePath: doc.relativePath,
          expectedHash: doc.sha256,
          computedHash: 'MISSING_FILE',
          match: false,
        });
        continue;
      }

      const fileBuffer = await zipEntry.async('nodebuffer');
      const computedHash = sha256Digest(fileBuffer);

      if (computedHash.toLowerCase() === doc.sha256.toLowerCase()) {
        documentsChecked.push({
          title: doc.title,
          relativePath: doc.relativePath,
          expectedHash: doc.sha256,
          computedHash,
          match: true,
        });
      } else {
        allDocumentsMatched = false;
        errors.push(
          `Document '${doc.title}' (${doc.relativePath}) SHA-256 hash mismatch. Expected '${doc.sha256}', computed '${computedHash}'. File content has been modified.`,
        );
        documentsChecked.push({
          title: doc.title,
          relativePath: doc.relativePath,
          expectedHash: doc.sha256,
          computedHash,
          match: false,
        });
      }
    }
  } else {
    warnings.push("No documents declared under 'manifest.documents'");
  }

  // 7. Verify audit trail extract hash-chain continuity
  let auditChainValid = true;
  if (Array.isArray(manifest.auditTrail) && manifest.auditTrail.length > 0) {
    for (let i = 0; i < manifest.auditTrail.length; i++) {
      const entry = manifest.auditTrail[i];
      if (i > 0 && entry) {
        const prevEntry = manifest.auditTrail[i - 1];
        if (prevEntry && entry.prevHash !== prevEntry.entryHash) {
          auditChainValid = false;
          errors.push(
            `Broken audit ledger link between sequence #${prevEntry.sequence} and #${entry.sequence}`,
          );
        }
      }
    }
  }

  // 8. Determine overall status
  let status: PackageVerificationResult['status'] = 'VALID';
  if (!manifestHashValid) {
    status = 'TAMPERED_MANIFEST';
  } else if (!signatureValid) {
    status = 'INVALID_SIGNATURE';
  } else if (!allDocumentsMatched) {
    status = 'TAMPERED_DOCUMENT';
  }

  const verified =
    manifestHashValid &&
    signatureValid &&
    allDocumentsMatched &&
    auditChainValid &&
    errors.length === 0;

  return {
    verified,
    status,
    packageId: manifest.packageId,
    caseNumber: manifest.case?.caseNumber,
    caseTitle: manifest.case?.title,
    exportedAt: manifest.exportedAt,
    exportedBy: manifest.exportedBy
      ? `${manifest.exportedBy.fullName} (${manifest.exportedBy.role}) • ${manifest.exportedBy.email}`
      : undefined,
    signerPublicKey: publicKeyToUse,
    signatureValid,
    manifestHashValid,
    documentsChecked,
    auditChainValid,
    certificateText: manifest.evidenceCertificate?.statement,
    errors,
    warnings,
  };
}
