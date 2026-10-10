import { RuleBasedClassifierService } from './rule-based-classifier.service';
import { MetadataExtractorService } from './metadata-extractor.service';
import { ClassificationLevel } from '@sdms/shared-types';

describe('OCR Intelligence & Classification', () => {
  let classifier: RuleBasedClassifierService;
  let extractor: MetadataExtractorService;

  beforeEach(() => {
    classifier = new RuleBasedClassifierService();
    extractor = new MetadataExtractorService();
  });

  describe('RuleBasedClassifierService', () => {
    it('should classify an Indian FIR with high confidence', () => {
      const firText = `
        FIRST INFORMATION REPORT (Under Section 154 Cr.P.C.)
        1. District: South Delhi, Police Station: Hauz Khas
        2. FIR No.: 0142/2024, Date: 14/05/2024
        3. Act: IPC 1860, Sections: 379, 411
        4. Complainant / Informant: Rajesh Kumar
        5. Details of occurrence: Theft reported near market area.
      `;

      const result = classifier.classify(firText);
      expect(result.detectedType).toBe('FIR');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.suggestedClassification).toBe(ClassificationLevel.RESTRICTED);
      expect(result.matchedRules.length).toBeGreaterThan(0);
    });

    it('should classify a Charge Sheet under Section 173 CrPC', () => {
      const chargeSheetText = `
        POLICE REPORT UNDER SECTION 173 CR.P.C. (FINAL REPORT / CHARGE SHEET)
        In the Court of Chief Metropolitan Magistrate, Saket Courts
        FIR No. 89/2023, P.S. Vasant Kunj
        Accused Person: Vikram Malhotra
        List of Witnesses and articles seized attached in annexure.
      `;

      const result = classifier.classify(chargeSheetText);
      expect(result.detectedType).toBe('CHARGE_SHEET');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.suggestedClassification).toBe(ClassificationLevel.CONFIDENTIAL);
    });

    it('should classify a Witness Statement recorded under Section 161 CrPC', () => {
      const statementText = `
        STATEMENT OF WITNESS RECORDED UNDER SECTION 161 CR.P.C.
        Name of Witness: Smt. Sunita Verma, aged 42 years
        Deposes as follows: I was present at the scene of the incident...
      `;

      const result = classifier.classify(statementText);
      expect(result.detectedType).toBe('WITNESS_STATEMENT');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should classify a Seizure Memo / Panchnama', () => {
      const panchnamaText = `
        PANCHNAMA OF SEIZURE (RECOVERY MEMO)
        In presence of the following punch witnesses:
        1. Ramesh Chand, 2. Suresh Patil
        Seized the following articles from the possession of the accused...
      `;

      const result = classifier.classify(panchnamaText);
      expect(result.detectedType).toBe('SEIZURE_MEMO');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should classify a Forensic Science Laboratory or Post Mortem report as SECRET', () => {
      const fslText = `
        FORENSIC SCIENCE LABORATORY (FSL REPORT)
        Post-Mortem Examination Report No. PM-402/2024
        Cause of Death: Asphyxia resulting from ante-mortem hanging.
        Chemical examiner analysis of viscera samples detected no poison.
      `;

      const result = classifier.classify(fslText);
      expect(result.detectedType).toBe('FORENSIC_REPORT');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.suggestedClassification).toBe(ClassificationLevel.SECRET);
    });

    it('should classify Indian Identity Documents (Aadhaar / PAN)', () => {
      const kycText = `
        Government of India
        Income Tax Department
        Permanent Account Number: ABCDE1234F
        Name: Anita Roy
      `;

      const result = classifier.classify(kycText);
      expect(result.detectedType).toBe('IDENTITY_DOCUMENT');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should fallback to GENERAL_EVIDENCE on generic or empty text', () => {
      const genericResult = classifier.classify('Meeting notes and general agenda discussion.');
      expect(genericResult.detectedType).toBe('GENERAL_EVIDENCE');

      const emptyResult = classifier.classify('');
      expect(emptyResult.detectedType).toBe('GENERAL_EVIDENCE');
      expect(emptyResult.confidence).toBeLessThan(0.5);
    });
  });

  describe('MetadataExtractorService', () => {
    it('should extract recognized dates, case numbers, statutory sections, and named entities', () => {
      const text = `
        FIRST INFORMATION REPORT
        FIR No. 204/2024, Dated: 12/08/2024
        Police Station: Connaught Place
        Under Section: 420, 468, 471 IPC
        Complainant: Sunita Mehra, aged 35 years
        Accused: Rameshwar Dayal
        Investigating Officer: SI Alok Kumar
      `;

      const metadata = extractor.extract(text);

      expect(metadata.caseNumbers).toContain('204/2024');
      expect(metadata.dates).toContain('12/08/2024');
      expect(metadata.policeStation?.toLowerCase()).toContain('connaught place');

      const roles = metadata.entities.map((e) => e.role);
      expect(roles).toContain('Complainant');
      expect(roles).toContain('Accused');
      expect(roles).toContain('Investigating Officer');

      const complainant = metadata.entities.find((e) => e.role === 'Complainant');
      expect(complainant?.name).toBe('Sunita Mehra');

      expect(metadata.sections.some((s) => s.includes('420') || s.includes('IPC'))).toBe(true);
      expect(metadata.confidence).toBeGreaterThan(0.7);
    });

    it('should handle text with no dates or case numbers gracefully', () => {
      const metadata = extractor.extract('Random arbitrary text without any legal metadata.');
      expect(metadata.dates).toEqual([]);
      expect(metadata.caseNumbers).toEqual([]);
      expect(metadata.confidence).toBeLessThan(0.5);
    });
  });
});
