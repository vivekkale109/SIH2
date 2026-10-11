import {
  PrismaClient,
  UserRole,
  DepartmentType,
  CaseStatus,
  ClassificationLevel,
  CaseMemberRole,
  DocumentStatus,
  ShareScope,
} from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
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

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function main(): Promise<void> {
  /* eslint-disable no-console */
  console.log('Seeding SDMS database with complete realistic demo dataset...');

  // 1. Clean existing records for fresh demo state
  await prisma.auditLedger.deleteMany({});
  await prisma.exportPackage.deleteMany({});
  await prisma.shareGrant.deleteMany({});
  await prisma.ocrResult.deleteMany({});
  await prisma.documentVersion.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.caseMember.deleteMany({});
  await prisma.case.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});

  // 2. Seed Departments
  const departmentsData = [
    {
      code: 'POL-CCB',
      name: 'Central Crime Branch - Police Headquarters',
      type: DepartmentType.POLICE,
      jurisdiction: 'State Capital Zone',
    },
    {
      code: 'POL-CYBER',
      name: 'Cyber Crime Investigation Division',
      type: DepartmentType.POLICE,
      jurisdiction: 'Metropolitan Jurisdiction',
    },
    {
      code: 'PROS-HQ',
      name: 'Directorate of Public Prosecutions - State HQ',
      type: DepartmentType.PROSECUTION,
      jurisdiction: 'State High Court & District Courts',
    },
    {
      code: 'CRT-SESS',
      name: 'Principal District and Sessions Court',
      type: DepartmentType.COURT,
      jurisdiction: 'District Court Complex, Sector 1',
    },
  ];

  const departmentMap = new Map<string, string>();
  for (const dept of departmentsData) {
    const record = await prisma.department.create({ data: dept });
    departmentMap.set(dept.code, record.id);
  }

  // 3. Seed Users across all 6 roles
  const defaultPasswordHash = await hashPassword('Secure#Demo2026!');
  const usersData = [
    {
      email: 'admin@sdms.gov.in',
      fullName: 'Chief Systems Administrator',
      badgeNumber: 'ADMIN-001',
      role: UserRole.ADMIN,
      deptCode: 'POL-CCB',
    },
    {
      email: 'investigator@police.gov.in',
      fullName: 'Inspector Rajesh Sharma',
      badgeNumber: 'POL-INV-4412',
      role: UserRole.INVESTIGATOR,
      deptCode: 'POL-CCB',
    },
    {
      email: 'prosecutor@prosecution.gov.in',
      fullName: 'Senior Public Prosecutor Meera Sen',
      badgeNumber: 'PROS-OFF-208',
      role: UserRole.PROSECUTOR,
      deptCode: 'PROS-HQ',
    },
    {
      email: 'court.officer@court.gov.in',
      fullName: 'Registrar K. V. Raman',
      badgeNumber: 'CRT-REG-104',
      role: UserRole.COURT_OFFICER,
      deptCode: 'CRT-SESS',
    },
    {
      email: 'records@sdms.gov.in',
      fullName: 'Chief Records Officer Sunita Das',
      badgeNumber: 'REC-MGR-319',
      role: UserRole.RECORDS_MANAGER,
      deptCode: 'POL-CCB',
    },
    {
      email: 'auditor@vigilance.gov.in',
      fullName: 'Senior Vigilance Auditor Amit Patel',
      badgeNumber: 'AUD-VIG-502',
      role: UserRole.AUDITOR,
      deptCode: 'PROS-HQ',
    },
  ];

  const userMap = new Map<string, string>();
  for (const user of usersData) {
    const record = await prisma.user.create({
      data: {
        email: user.email,
        passwordHash: defaultPasswordHash,
        fullName: user.fullName,
        badgeNumber: user.badgeNumber,
        role: user.role,
        departmentId: departmentMap.get(user.deptCode)!,
        isActive: true,
        mfaEnabled: false,
      },
    });
    userMap.set(user.email, record.id);
  }

  const investigatorId = userMap.get('investigator@police.gov.in')!;
  const prosecutorId = userMap.get('prosecutor@prosecution.gov.in')!;
  const courtOfficerId = userMap.get('court.officer@court.gov.in')!;
  const adminId = userMap.get('admin@sdms.gov.in')!;

  // 4. Seed Cases
  const case1 = await prisma.case.create({
    data: {
      caseNumber: 'CR-2026-DEL-0419',
      title: 'State vs. Quantum Syndicate — Cross-Border Cyber Phishing & Wire Fraud',
      description:
        'Coordinated syndicate targeting public sector financial transfers via spoofed domains and SIM swap fraud. Offence u/s 318(4) BNS 2023 & Sec 66D IT Act 2000.',
      status: CaseStatus.OPEN,
      classification: ClassificationLevel.SECRET,
      departmentId: departmentMap.get('POL-CCB')!,
      createdById: investigatorId,
    },
  });

  const case2 = await prisma.case.create({
    data: {
      caseNumber: 'CR-2026-MUM-1102',
      title: 'Narcotics Interception & Contraband Seizure — International Container Terminal',
      description:
        'Interception of 45kg suspected high-grade contraband concealed within commercial shipping crates. Offence u/s 8(c), 20(b)(ii)(C), 29 NDPS Act 1985.',
      status: CaseStatus.UNDER_REVIEW,
      classification: ClassificationLevel.CONFIDENTIAL,
      departmentId: departmentMap.get('POL-CCB')!,
      createdById: investigatorId,
    },
  });

  const case3 = await prisma.case.create({
    data: {
      caseNumber: 'CR-2025-ND-0881',
      title: 'Corporate Insolvency & Asset Diversion Dossier — Apex Logistics Holdings',
      description:
        'Investigation into fraudulent siphoning of institutional lending capital and shell company layering.',
      status: CaseStatus.CLOSED,
      classification: ClassificationLevel.RESTRICTED,
      departmentId: departmentMap.get('PROS-HQ')!,
      createdById: prosecutorId,
    },
  });

  const case4 = await prisma.case.create({
    data: {
      caseNumber: 'CR-2024-DEL-0054',
      title: 'Archived Cultural Heritage Theft & Smuggling Inquiry — Antiquities Cell',
      description:
        'Historical recovery of 11th century temple bronze sculptures seized during interstate transport.',
      status: CaseStatus.ARCHIVED,
      classification: ClassificationLevel.PUBLIC,
      departmentId: departmentMap.get('CRT-SESS')!,
      createdById: courtOfficerId,
    },
  });

  // 5. Case Memberships
  await prisma.caseMember.createMany({
    data: [
      { caseId: case1.id, userId: investigatorId, caseRole: CaseMemberRole.LEAD_INVESTIGATOR },
      { caseId: case1.id, userId: prosecutorId, caseRole: CaseMemberRole.PROSECUTOR },
      { caseId: case2.id, userId: investigatorId, caseRole: CaseMemberRole.LEAD_INVESTIGATOR },
      { caseId: case2.id, userId: prosecutorId, caseRole: CaseMemberRole.PROSECUTOR },
      { caseId: case3.id, userId: prosecutorId, caseRole: CaseMemberRole.LEAD_INVESTIGATOR },
      { caseId: case4.id, userId: courtOfficerId, caseRole: CaseMemberRole.LEAD_INVESTIGATOR },
    ],
  });

  // 6. Case 1 Documents
  const doc1 = await prisma.document.create({
    data: {
      caseId: case1.id,
      title: 'First Information Report (FIR No. 419/2026)',
      type: 'FIR',
      classification: ClassificationLevel.SECRET,
      status: DocumentStatus.READY,
      createdById: investigatorId,
    },
  });

  const doc1Sha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const ver1 = await prisma.documentVersion.create({
    data: {
      documentId: doc1.id,
      versionNo: 1,
      storageKey: `cases/${case1.id}/documents/${doc1.id}/v1/fir_419.pdf`,
      sizeBytes: BigInt(245812),
      mimeType: 'application/pdf',
      sha256: doc1Sha256,
      uploadedById: investigatorId,
    },
  });

  await prisma.document.update({
    where: { id: doc1.id },
    data: { currentVersionId: ver1.id },
  });

  await prisma.ocrResult.create({
    data: {
      versionId: ver1.id,
      extractedText: `SPECIAL REPORT FIRST INFORMATION REPORT (Under Section 173 BNSS 2023 / Sec 154 CrPC)
Police Station: Cyber Crime Investigation Division, Special Cell
FIR Number: 0419/2026 Date & Time of Occurrence: 14-Jan-2026 03:45 AM
Acts and Sections: Section 318(4) Bharatiya Nyaya Sanhita 2023, Section 66D Information Technology Act 2000
Complainant: National Unified Payment Gateway Security Division
Suspect Identified: Alias 'CipherZero', Quantum Syndicate operator
Brief Facts: Unauthorized intrusion detected exploiting forged electronic tokens resulting in diversion of statutory escrow assets. Digital artifacts preserved in volatile RAM dumps and network firewall transaction logs.`,
      confidence: 0.96,
      extractedMetadata: {
        firNumber: '0419/2026',
        sections: ['318(4) BNS 2023', '66D IT Act 2000'],
        station: 'Cyber Crime Investigation Division',
        date: '2026-01-14',
      },
    },
  });

  const doc2 = await prisma.document.create({
    data: {
      caseId: case1.id,
      title: 'Digital Forensic Inspection & Hardware Seizure Memo',
      type: 'SEIZURE_MEMO',
      classification: ClassificationLevel.SECRET,
      status: DocumentStatus.READY,
      createdById: investigatorId,
    },
  });

  const doc2Sha256 = '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b';
  const ver2 = await prisma.documentVersion.create({
    data: {
      documentId: doc2.id,
      versionNo: 1,
      storageKey: `cases/${case1.id}/documents/${doc2.id}/v1/seizure_memo.pdf`,
      sizeBytes: BigInt(184510),
      mimeType: 'application/pdf',
      sha256: doc2Sha256,
      uploadedById: investigatorId,
    },
  });

  await prisma.document.update({
    where: { id: doc2.id },
    data: { currentVersionId: ver2.id },
  });

  await prisma.ocrResult.create({
    data: {
      versionId: ver2.id,
      extractedText: `EVIDENTIARY SEIZURE MEMO (Panchnama) Under Section 105 BNSS 2023
Case Reference: CR-2026-DEL-0419 FIR: 419/2026
Location of Seizure: Server Rack Unit B-12, Datacenter Enclave, Sector 62
Seized Articles:
Item 1: 1x Dell PowerEdge 1U Server S/N: CN-0H755K-70821-654
Item 2: 2x 4TB NVMe SSD encrypted with LUKS partition
Item 3: Hardware Security Key YubiKey 5C NFC
Hash Computed on Acquisition (SHA-256): 4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b
Seizure Panch Witnesses:
1. Ramesh Chandra, Independent IT Auditor
2. Vikramjit Singh, Cyber Forensics Examiner`,
      confidence: 0.94,
      extractedMetadata: {
        seizureType: 'Digital Hardware & Media',
        witnesses: ['Ramesh Chandra', 'Vikramjit Singh'],
        hash: doc2Sha256,
      },
    },
  });

  // 7. Case 2 Documents
  const doc3 = await prisma.document.create({
    data: {
      caseId: case2.id,
      title: 'Final Police Report / Charge Sheet (Sec 193 BNSS 2023)',
      type: 'CHARGE_SHEET',
      classification: ClassificationLevel.CONFIDENTIAL,
      status: DocumentStatus.READY,
      createdById: investigatorId,
    },
  });

  const doc3Sha256 = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
  const ver3 = await prisma.documentVersion.create({
    data: {
      documentId: doc3.id,
      versionNo: 1,
      storageKey: `cases/${case2.id}/documents/${doc3.id}/v1/chargesheet_1102.pdf`,
      sizeBytes: BigInt(512040),
      mimeType: 'application/pdf',
      sha256: doc3Sha256,
      uploadedById: investigatorId,
    },
  });

  await prisma.document.update({
    where: { id: doc3.id },
    data: { currentVersionId: ver3.id },
  });

  await prisma.ocrResult.create({
    data: {
      versionId: ver3.id,
      extractedText: `CHARGE SHEET (FINAL REPORT UNDER SECTION 193 BNSS 2023 / 173 CrPC)
In the Court of Metropolitan Magistrate, Fort Court Mumbai
Case Crime No: 1102/2026 PS Central Crime Branch
Accused: Tariq Mansoor, Age 42, S/o Abdul Mansoor (In Judicial Custody)
Charges Framed: Section 8(c) read with 20(b)(ii)(C) and Section 29 NDPS Act 1985
Substantive Evidence: Chemical analysis report confirming high-purity contraband in commercial quantities. Forensic bill of lading falsification established through carrier database audits.`,
      confidence: 0.98,
      extractedMetadata: {
        chargeSheetNo: 'CS-1102/2026',
        accused: 'Tariq Mansoor',
        statute: 'NDPS Act 1985',
      },
    },
  });

  // 8. Controlled Share Grant
  const shareExpiry = new Date();
  shareExpiry.setDate(shareExpiry.getDate() + 7);
  await prisma.shareGrant.create({
    data: {
      resourceType: 'CASE',
      resourceId: case1.id,
      granterId: investigatorId,
      granteeId: prosecutorId,
      scope: ShareScope.DOWNLOAD,
      expiresAt: shareExpiry,
    },
  });

  // 9. Signed Export Package
  await prisma.exportPackage.create({
    data: {
      caseId: case1.id,
      createdById: investigatorId,
      manifestHash: 'c4ca4238a0b923820dcc509a6f75849b2dcacc1abe9050b3452a561f848f222c',
      signature: '30450221008d17b203c94541334c2ab99015949d08dd85444b0d061cff9c279313',
    },
  });

  // 10. Generate Valid Cryptographic Audit Ledger Chain
  const auditEvents = [
    {
      actorId: adminId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: investigatorId,
      metadata: { email: 'investigator@police.gov.in', role: 'INVESTIGATOR' },
    },
    {
      actorId: adminId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: prosecutorId,
      metadata: { email: 'prosecutor@prosecution.gov.in', role: 'PROSECUTOR' },
    },
    {
      actorId: investigatorId,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: investigatorId,
      metadata: { ip: '10.0.1.15', mfaUsed: false },
    },
    {
      actorId: investigatorId,
      action: 'CASE_CREATED',
      entityType: 'Case',
      entityId: case1.id,
      metadata: { caseNumber: case1.caseNumber, classification: 'SECRET' },
    },
    {
      actorId: investigatorId,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: doc1.id,
      metadata: { filename: 'fir_419.pdf', sha256: doc1Sha256, version: 1 },
    },
    {
      actorId: investigatorId,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: doc2.id,
      metadata: { filename: 'seizure_memo.pdf', sha256: doc2Sha256, version: 1 },
    },
    {
      actorId: investigatorId,
      action: 'CASE_CREATED',
      entityType: 'Case',
      entityId: case2.id,
      metadata: { caseNumber: case2.caseNumber, classification: 'CONFIDENTIAL' },
    },
    {
      actorId: investigatorId,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: doc3.id,
      metadata: { filename: 'chargesheet_1102.pdf', sha256: doc3Sha256, version: 1 },
    },
    {
      actorId: investigatorId,
      action: 'SHARE_GRANTED',
      entityType: 'Case',
      entityId: case1.id,
      metadata: { grantee: 'prosecutor@prosecution.gov.in', scope: 'DOWNLOAD', watermark: true },
    },
    {
      actorId: investigatorId,
      action: 'EXPORT_PACKAGE_GENERATED',
      entityType: 'Case',
      entityId: case1.id,
      metadata: { algorithm: 'Ed25519', standard: 'BSA 2023 §61-63', exhibits: 2 },
    },
  ];

  let prevHash = '0'.repeat(64);
  let sequence = BigInt(1);
  const baseTime = Date.now() - 3600000 * 5; // 5 hours ago

  for (let i = 0; i < auditEvents.length; i++) {
    const event = auditEvents[i];
    const eventTime = new Date(baseTime + i * 180000); // 3-min increments

    const payload = {
      action: event.action,
      actorId: event.actorId,
      entityId: event.entityId,
      entityType: event.entityType,
      metadata: event.metadata,
      prevHash,
      sequence: Number(sequence),
      timestamp: eventTime.toISOString(),
    };

    const payloadCanonicalJson = canonicalJson(payload);
    const entryHash = sha256Hex(prevHash + payloadCanonicalJson);

    await prisma.auditLedger.create({
      data: {
        sequence,
        timestamp: eventTime,
        actorId: event.actorId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: event.metadata,
        prevHash,
        entryHash,
      },
    });

    prevHash = entryHash;
    sequence += BigInt(1);
  }

  console.log(`✅ Database successfully seeded with:
  • 4 Government Departments (Police, Prosecution, Court)
  • 6 Role Users (Admin, Investigator, Prosecutor, Court Officer, Records Manager, Auditor)
  • 4 Full Investigation Cases (Cyber Fraud, Narcotics, Corporate Siphoning, Antiquities)
  • 3 Document Records with 3 Versions, Extracted OCR Texts & Metadata
  • 1 Controlled Watermarked Cross-Department Share Grant
  • 1 Ed25519 Signed Export Package (BSA 2023 §61–63)
  • ${auditEvents.length} Cryptographically Chained Tamper-Evident Audit Ledger Transactions`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
