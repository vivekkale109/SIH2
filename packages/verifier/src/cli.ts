#!/usr/bin/env node

import path from 'path';
import { verifyExportPackage } from './verifier';

async function runCli(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
======================================================================
  SDMS Standalone Evidence Package Verifier (BSA 2023 §61-63)
======================================================================
Usage:
  npx @sdms/verifier <path-to-export-package.zip> [options]

Options:
  --key <pubkey>       Specify a trusted Ed25519 public key (PEM/Hex)
  --json               Output full verification report as JSON
  -h, --help           Show this help text

Examples:
  npx @sdms/verifier FIR-2026-DEL-0042_export.zip
  npx @sdms/verifier evidence.zip --json
======================================================================
`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const targetArg = args[0];
  if (!targetArg) {
    console.error('Error: Please provide a valid ZIP archive path.');
    process.exit(1);
  }
  const zipPath = path.resolve(targetArg);
  const isJsonOutput = args.includes('--json');
  let trustedPublicKey: string | undefined;

  const keyIdx = args.indexOf('--key');
  if (keyIdx !== -1 && args[keyIdx + 1]) {
    trustedPublicKey = args[keyIdx + 1];
  }

  try {
    const result = await verifyExportPackage(zipPath, { trustedPublicKey });

    if (isJsonOutput) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.verified ? 0 : 1);
    }

    console.log('\n======================================================================');
    console.log('       SDMS CRYPTOGRAPHIC EVIDENCE VERIFICATION REPORT');
    console.log('======================================================================\n');
    console.log(`Package Target:    ${zipPath}`);
    console.log(`Case Number:       ${result.caseNumber || 'N/A'}`);
    console.log(`Case Title:        ${result.caseTitle || 'N/A'}`);
    console.log(`Package ID:        ${result.packageId || 'N/A'}`);
    console.log(`Exported At:       ${result.exportedAt || 'N/A'}`);
    console.log(`Exported By:       ${result.exportedBy || 'N/A'}`);
    console.log('----------------------------------------------------------------------');

    // Cryptographic Checks
    console.log('\n1. CRYPTOGRAPHIC SIGNATURE & MANIFEST INTEGRITY:');
    if (result.manifestHashValid) {
      console.log('  [PASS] Manifest Canonical SHA-256 Digest is valid and untampered');
    } else {
      console.log('  [FAIL] Manifest Canonical SHA-256 Digest MISMATCH! Content was altered');
    }

    if (result.signatureValid) {
      console.log('  [PASS] Ed25519 Digital Signature is cryptographically VALID');
    } else {
      console.log('  [FAIL] Ed25519 Digital Signature is INVALID or key mismatch');
    }

    if (result.auditChainValid) {
      console.log('  [PASS] Included Audit Ledger Chain verifies gapless and untampered');
    } else {
      console.log('  [FAIL] Audit Ledger Chain integrity link is BROKEN');
    }

    // Document Table
    console.log('\n2. EVIDENCE EXHIBITS SHA-256 HASH VERIFICATION:');
    if (result.documentsChecked.length === 0) {
      console.log('  (No documents attached in package)');
    } else {
      for (const doc of result.documentsChecked) {
        if (doc.match) {
          console.log(`  [PASS] ${doc.title} (${doc.relativePath})`);
          console.log(`         SHA-256: ${doc.computedHash}`);
        } else {
          console.log(`  [FAIL] ${doc.title} (${doc.relativePath}) - HASH MISMATCH!`);
          console.log(`         Expected: ${doc.expectedHash}`);
          console.log(`         Computed: ${doc.computedHash}`);
        }
      }
    }

    // Legal Certificate
    if (result.certificateText) {
      console.log('\n3. BHARATIYA SAKSHYA ADHINIYAM (BSA 2023) §63 CERTIFICATE:');
      console.log('----------------------------------------------------------------------');
      console.log(result.certificateText.trim());
      console.log('----------------------------------------------------------------------');
    }

    // Final Verdict
    console.log('\n======================================================================');
    if (result.verified) {
      console.log('  VERDICT: *** VALID COURT-READY EVIDENCE PACKAGE ***');
      console.log('  The package authenticity, origin, and byte integrity are intact.');
      console.log('======================================================================\n');
      process.exit(0);
    } else {
      console.log(`  VERDICT: *** INVALID / TAMPERED PACKAGE (${result.status}) ***`);
      console.log('  Violations detected:');
      for (const err of result.errors) {
        console.log(`   - ${err}`);
      }
      console.log('======================================================================\n');
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`\n[FATAL ERROR] Verification halted: ${err.message || String(err)}\n`);
    process.exit(1);
  }
}

runCli();
