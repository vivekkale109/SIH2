import { Injectable, Logger } from '@nestjs/common';

export interface ExtractedEntity {
  role: string;
  name: string;
}

export interface ExtractedMetadata {
  dates: string[];
  caseNumbers: string[];
  sections: string[];
  entities: ExtractedEntity[];
  policeStation?: string;
  courtName?: string;
  confidence: number;
}

@Injectable()
export class MetadataExtractorService {
  private readonly logger = new Logger(MetadataExtractorService.name);

  // Date regex patterns
  private readonly datePatterns: RegExp[] = [
    /\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/g, // 15/08/2024 or 15-08-2024
    /\b(?:\d{4}[./-]\d{1,2}[./-]\d{1,2})\b/g, // 2024-08-15
    /\b(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[.,]?\s+\d{4})\b/gi, // 15th August 2024
    /\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?[.,]?\s+\d{4})\b/gi, // August 15, 2024
  ];

  // Case & FIR number patterns
  private readonly caseNumberPatterns: RegExp[] = [
    /\b(?:FIR\s*(?:No\.?|Number)?\s*[:\-]?\s*(\d+[\w/-]*))\b/gi,
    /\b(?:Crime\s*(?:No\.?|Number)?\s*[:\-]?\s*(\d+[\w/-]*))\b/gi,
    /\b(?:Cr\.?\s*No\.?\s*[:\-]?\s*(\d+[\w/-]*))\b/gi,
    /\b(?:Case\s*(?:No\.?|Number)?\s*[:\-]?\s*([A-Za-z0-9/-]+))\b/gi,
    /\b(?:Sessions\s+Case\s+No\.?\s*[:\-]?\s*([A-Za-z0-9/-]+))\b/gi,
    /\b(?:Bail\s+App(?:lication)?\s+No\.?\s*[:\-]?\s*([A-Za-z0-9/-]+))\b/gi,
  ];

  // Indian statutory legal sections patterns (IPC, CrPC, BNS, BNSS, NDPS, etc.)
  private readonly sectionPatterns: RegExp[] = [
    /\b(?:(?:u\/s|under\s+sec(?:tion)?|sections?)\s*[:\-]?\s*([0-9A-Z,\s&/]+(?:\s*(?:IPC|Cr\.?P\.?C|CrPC|BNS|BNSS|NDPS|Arms\s+Act|IT\s+Act))?))\b/gi,
    /\b(?:Sec(?:tion)?\s*\d+[A-Z]?(?:\s*(?:IPC|CrPC|BNS))?)\b/gi,
  ];

  // Named entity / role patterns in Indian legal records
  private readonly roleEntityPatterns: Array<{ role: string; pattern: RegExp }> = [
    {
      role: 'Complainant',
      pattern: /(?:complainant|informant)\s*[:\-]?\s*([A-Z][a-zA-Z\s.]{2,40})/i,
    },
    {
      role: 'Accused',
      pattern: /(?:accused(?:\s+person)?)\s*[:\-]?\s*([A-Z][a-zA-Z\s.]{2,40})/i,
    },
    {
      role: 'Investigating Officer',
      pattern: /(?:investigating\s+officer|i\.?o\.?)\s*[:\-]?\s*([A-Z][a-zA-Z\s.]{2,40})/i,
    },
    {
      role: 'Victim',
      pattern: /(?:victim)\s*[:\-]?\s*([A-Z][a-zA-Z\s.]{2,40})/i,
    },
    {
      role: 'Judge',
      pattern:
        /(?:before\s+(?:the\s+)?hon(?:['’]|ou)rable\s+(?:mr\.?\s+|mrs\.?\s+|justice\s+)?)([A-Z][a-zA-Z\s.]{2,40})/i,
    },
  ];

  extract(text: string): ExtractedMetadata {
    if (!text || text.trim().length === 0) {
      return {
        dates: [],
        caseNumbers: [],
        sections: [],
        entities: [],
        confidence: 0,
      };
    }

    // 1. Extract dates
    const datesSet = new Set<string>();
    for (const pattern of this.datePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const m of matches) {
          const clean = m.trim().replace(/[.,]$/, '');
          if (clean.length >= 6) {
            datesSet.add(clean);
          }
        }
      }
    }

    // 2. Extract case / FIR numbers
    const caseNumbersSet = new Set<string>();
    for (const pattern of this.caseNumberPatterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) {
          const clean = match[1].trim();
          if (clean.length >= 2 && clean.length <= 30) {
            caseNumbersSet.add(clean);
          }
        }
      }
    }

    // 3. Extract statutory sections
    const sectionsSet = new Set<string>();
    for (const pattern of this.sectionPatterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const val = match[1] || match[0];
        if (val) {
          const clean = val.trim();
          if (clean.length >= 3 && clean.length <= 50) {
            sectionsSet.add(clean);
          }
        }
      }
    }

    // 4. Extract entities
    const entities: ExtractedEntity[] = [];
    const seenNames = new Set<string>();

    for (const item of this.roleEntityPatterns) {
      const match = text.match(item.pattern);
      if (match && match[1]) {
        const name = match[1].split(/[\n,;]|(?:\s+s\/o|\s+w\/o|\s+d\/o|\s+aged)/i)[0].trim();
        if (name.length >= 3 && !seenNames.has(name.toLowerCase())) {
          seenNames.add(name.toLowerCase());
          entities.push({
            role: item.role,
            name,
          });
        }
      }
    }

    // 5. Police Station / Court
    let policeStation: string | undefined;
    const psMatch = text.match(
      /(?:police\s+station|p\.?s\.?|thana)\s*[:\-]?\s*([A-Za-z0-9\s.]{3,35})/i,
    );
    if (psMatch && psMatch[1]) {
      policeStation = psMatch[1].split(/[\n,;]/)[0].trim();
    }

    let courtName: string | undefined;
    const courtMatch = text.match(
      /(?:in\s+the\s+court\s+of|high\s+court\s+of\s+[A-Za-z]+)\s*[:\-]?\s*([A-Za-z0-9\s.]{3,50})/i,
    );
    if (courtMatch && courtMatch[1]) {
      courtName = courtMatch[1].split(/[\n,;]/)[0].trim();
    }

    // Calculate metadata confidence score
    let score = 0.3;
    if (datesSet.size > 0) score += 0.2;
    if (caseNumbersSet.size > 0) score += 0.25;
    if (sectionsSet.size > 0) score += 0.15;
    if (entities.length > 0) score += 0.1;

    const confidence = Math.min(1.0, Math.round(score * 100) / 100);

    return {
      dates: Array.from(datesSet).slice(0, 10),
      caseNumbers: Array.from(caseNumbersSet).slice(0, 10),
      sections: Array.from(sectionsSet).slice(0, 10),
      entities: entities.slice(0, 10),
      policeStation,
      courtName,
      confidence,
    };
  }
}
