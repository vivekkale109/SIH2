import { CertificateService } from './certificate.service';

describe('CertificateService', () => {
  let certificateService: CertificateService;

  beforeEach(() => {
    certificateService = new CertificateService();
  });

  it('should generate a formal BSA 2023 §61–63 electronic evidence certificate', () => {
    const declarant = {
      fullName: 'Inspector Rajesh Sharma',
      role: 'INVESTIGATOR',
      departmentId: 'POL-CCB',
      badgeNumber: 'POL-INV-4412',
      email: 'investigator@police.gov.in',
    };

    const options = {
      caseNumber: 'FIR-2026-DEL-0042',
      caseTitle: 'Financial Fraud Inquiry',
      documentCount: 3,
      packageId: '00000000-0000-0000-0000-000000000001',
      manifestHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      notes: 'Chain of custody verified by Forensic Science Laboratory.',
    };

    const cert = certificateService.generateCertificate(declarant, options);

    expect(cert).toBeDefined();
    expect(cert.statutoryBasis).toContain('Bharatiya Sakshya Adhiniyam, 2023');
    expect(cert.declarantName).toBe(declarant.fullName);
    expect(cert.declarantBadge).toBe(declarant.badgeNumber);
    expect(cert.caseNumber).toBe(options.caseNumber);
    expect(cert.statement).toContain('CERTIFICATE OF ELECTRONIC EVIDENCE');
    expect(cert.statement).toContain(
      'Sections 61, 62 and 63 of the Bharatiya Sakshya Adhiniyam, 2023',
    );
    expect(cert.statement).toContain(options.caseNumber);
    expect(cert.statement).toContain(options.manifestHash);
    expect(cert.statement).toContain(options.notes);
  });
});
