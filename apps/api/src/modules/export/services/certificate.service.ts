import { Injectable } from '@nestjs/common';
import { EvidenceCertificate } from '@sdms/shared-types';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

export interface CertificateOptions {
  caseNumber: string;
  caseTitle: string;
  documentCount: number;
  packageId: string;
  manifestHash: string;
  notes?: string;
}

export interface DeclarantInfo {
  fullName: string;
  role: string;
  departmentId: string;
  badgeNumber?: string;
  email: string;
}

@Injectable()
export class CertificateService {
  /**
   * Generates a formal Electronic Evidence Certificate aligned to
   * Sections 61, 62 & 63 of the Bharatiya Sakshya Adhiniyam, 2023 (BSA 2023).
   */
  generateCertificate(declarant: DeclarantInfo, options: CertificateOptions): EvidenceCertificate {
    const certificationDate = new Date().toISOString();
    const systemName =
      'Secure Digital Document Management System (SDMS) • Govt. of India PS ID 26190';
    const hashAlgorithm = 'NIST FIPS 180-4 SHA-256 with Ed25519 Elliptic Curve Signature';

    const statement = `
====================================================================================================
                        CERTIFICATE OF ELECTRONIC EVIDENCE
   [Under Sections 61, 62 and 63 of the Bharatiya Sakshya Adhiniyam, 2023 (Act No. 47 of 2023)]
====================================================================================================

I, ${declarant.fullName}, holding the official designation of ${declarant.role} in ${declarant.departmentId} 
${declarant.badgeNumber ? `[Service / Badge No: ${declarant.badgeNumber}]` : ''}, do hereby solemnly state and certify as follows:

1. PARTICULARS OF ELECTRONIC RECORD:
   - Investigation Case / FIR Reference: ${options.caseNumber}
   - Investigation Subject / Title: ${options.caseTitle}
   - Package Cryptographic Identifier (UUID): ${options.packageId}
   - Manifest Cryptographic SHA-256 Digest: ${options.manifestHash}
   - Total Exhibits & Evidence Documents Anchored: ${options.documentCount} Files
   - Date and Time of Export Generation: ${certificationDate}

2. STATUTORY CONDITIONS UNDER SECTION 63(2) OF BHARATIYA SAKSHYA ADHINIYAM, 2023:
   (a) The electronic records contained in this evidence package were produced by the computer system
       known as "${systemName}" during the period over which the said computer system was used 
       regularly to store and process digital records for the purpose of lawful investigations by the 
       responsible statutory authorities.
   (b) Throughout the said period, information of the kind contained in the electronic record was 
       regularly supplied to and processed by the computer system in the ordinary course of the 
       official investigative activities.
   (c) Throughout the material part of the said period, the computer system was operating properly and 
       within cryptographic security boundaries. No disruption, security breach, or operational failure
       occurred that could affect the production, integrity, or contents of the electronic record.
   (d) The electronic evidence exhibits were generated from information supplied to the computer 
       system in the ordinary course of lawful official duties, scanned against malware, anchored to an
       append-only hash-chained audit ledger, and verified against SHA-256 cryptographic digests.

3. INTEGRITY ASSURANCE AND CHAIN OF CUSTODY:
   Every document exhibit in this package contains an individual SHA-256 fingerprint verified directly
   against live object storage and recorded on the immutable cryptographic audit ledger. Any alteration 
   or substitution of the electronic records or the manifest will immediately invalidate the accompanying
   Ed25519 digital signature.

4. DECLARANT VERIFICATION:
   I certify that the particulars stated above are true and correct to the best of my knowledge, official
   information, and belief, and that I occupy a responsible official position in relation to the operation
   and administration of the relevant computer system and the management of the electronic records.

${options.notes ? `Additional Case Notes: ${options.notes}\n` : ''}
Date: ${certificationDate.split('T')[0]}
Official Declarant: ${declarant.fullName}
Designation: ${declarant.role} (${declarant.departmentId})
System ID: SDMS-NODE-PRIMARY
====================================================================================================
`.trim();

    return {
      statutoryBasis: 'Bharatiya Sakshya Adhiniyam, 2023 (Sections 61, 62 & 63)',
      certificationDate,
      declarantName: declarant.fullName,
      declarantDesignation: declarant.role,
      declarantDepartment: declarant.departmentId,
      declarantBadge: declarant.badgeNumber,
      caseNumber: options.caseNumber,
      systemName,
      hashAlgorithm,
      statement,
    };
  }
}
