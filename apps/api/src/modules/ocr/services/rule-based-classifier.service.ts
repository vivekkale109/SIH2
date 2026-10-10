import { Injectable, Logger } from '@nestjs/common';
import { ClassificationLevel } from '@sdms/shared-types';
import { Classifier, ClassificationResult } from '../interfaces/classifier.interface';

interface RuleDefinition {
  type: string;
  weight: number;
  keywords: string[];
  patterns: RegExp[];
  suggestedClassification: ClassificationLevel;
}

@Injectable()
export class RuleBasedClassifierService implements Classifier {
  private readonly logger = new Logger(RuleBasedClassifierService.name);

  private readonly rules: RuleDefinition[] = [
    {
      type: 'FIR',
      weight: 1.0,
      keywords: [
        'first information report',
        'section 154 cr.p.c',
        'section 154 crpc',
        'section 154 of the code',
        'section 173 of bnss',
        'section 173 bnss',
        'date of occurrence',
        'time of occurrence',
        'gd entry',
        'general diary reference',
      ],
      patterns: [
        /\b(?:first\s+information\s+report)\b/i,
        /\b(?:section\s+154\s+(?:cr\.?p\.?c|crpc|bnss))\b/i,
      ],
      suggestedClassification: ClassificationLevel.RESTRICTED,
    },
    {
      type: 'CHARGE_SHEET',
      weight: 1.3,
      keywords: [
        'charge sheet',
        'chargesheet',
        'final report',
        'section 173',
        'sec 173 crpc',
        'sec 173 cr.p.c',
        'section 193 bnss',
        'prosecution witnesses',
        'list of witnesses',
        'articles seized',
        'police report under section 173',
      ],
      patterns: [
        /\b(?:charge\s*sheet|final\s+report\s+under\s+sec(?:tion)?\s*173)\b/i,
        /\b(?:section\s+173\s*(?:\(2\))?\s*(?:cr\.?p\.?c|crpc|bnss))\b/i,
        /\b(?:police\s+report\s+under\s+section\s+173)\b/i,
      ],
      suggestedClassification: ClassificationLevel.CONFIDENTIAL,
    },
    {
      type: 'WITNESS_STATEMENT',
      weight: 0.9,
      keywords: [
        'statement of witness',
        'section 161',
        'sec 161 crpc',
        'section 180 bnss',
        'deposes as follows',
        'statement recorded',
        'stated on oath',
        'examination of witness',
        'recorded under section',
        'statement of victim',
      ],
      patterns: [
        /\b(?:statement\s+(?:of\s+witness|recorded\s+under\s+sec(?:tion)?\s*161))\b/i,
        /\b(?:sec(?:tion)?\s*161\s*(?:cr\.?p\.?c|crpc|bnss))\b/i,
        /\b(?:statement\s+under\s+section\s*164)\b/i,
      ],
      suggestedClassification: ClassificationLevel.RESTRICTED,
    },
    {
      type: 'SEIZURE_MEMO',
      weight: 0.9,
      keywords: [
        'seizure memo',
        'panchnama',
        'panchnama of seizure',
        'recovery memo',
        'punch witnesses',
        'in presence of following witnesses',
        'seized following articles',
        'malkhana',
        'inventory of property',
      ],
      patterns: [
        /\b(?:seizure\s+memo|recovery\s+memo|panch(?:a)?nama)\b/i,
        /\b(?:articles?\s+seized|inventory\s+of\s+seized\s+property)\b/i,
        /\b(?:in\s+presence\s+of\s+panch(?:as)?)\b/i,
      ],
      suggestedClassification: ClassificationLevel.RESTRICTED,
    },
    {
      type: 'FORENSIC_REPORT',
      weight: 1.0,
      keywords: [
        'forensic science laboratory',
        'fsl report',
        'post mortem',
        'post-mortem examination',
        'autopsy report',
        'chemical examiner',
        'ballistics report',
        'dna analysis',
        'medico legal',
        'mlr',
        'cause of death',
        'toxicology',
      ],
      patterns: [
        /\b(?:forensic\s+science\s+laboratory|f\.?s\.?l\.?\s+report)\b/i,
        /\b(?:post[\s\-]mortem\s+(?:examination|report)|autopsy\s+report)\b/i,
        /\b(?:medico[\s\-]legal\s+(?:case|report)|m\.?l\.?r\.?)\b/i,
      ],
      suggestedClassification: ClassificationLevel.SECRET,
    },
    {
      type: 'COURT_ORDER',
      weight: 0.9,
      keywords: [
        'in the high court',
        'in the court of',
        'sessions judge',
        'magistrate',
        'bail application',
        'order dated',
        'operative order',
        'interim bail',
        'anticipatory bail',
        'writ petition',
        'coram:',
        'honourable',
        'honble mr justice',
      ],
      patterns: [
        /\b(?:in\s+the\s+court\s+of\s+(?:sessions|chief\s+judicial|metropolitan)\s+judge)\b/i,
        /\b(?:bail\s+application\s+no\.?|criminal\s+misc\s+application)\b/i,
        /\b(?:before\s+the\s+hon(?:['’]|ou)rable\s+court)\b/i,
      ],
      suggestedClassification: ClassificationLevel.RESTRICTED,
    },
    {
      type: 'IDENTITY_DOCUMENT',
      weight: 0.85,
      keywords: [
        'unique identification authority of india',
        'aadhaar',
        'income tax department',
        'permanent account number',
        'pan card',
        'election commission of india',
        'voter id',
        'republic of india passport',
        'driving licence',
      ],
      patterns: [
        /\b[2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4}\b/, // Aadhaar pattern
        /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/, // Indian PAN pattern
        /\b(?:passport\s+no\.?|election\s+commission\s+of\s+india)\b/i,
      ],
      suggestedClassification: ClassificationLevel.CONFIDENTIAL,
    },
  ];

  classify(text: string, _metadata?: Record<string, unknown>): ClassificationResult {
    if (!text || text.trim().length === 0) {
      return {
        detectedType: 'GENERAL_EVIDENCE',
        confidence: 0.2,
        matchedRules: [],
        suggestedClassification: ClassificationLevel.RESTRICTED,
      };
    }

    const lowerText = text.toLowerCase();
    const scores = new Map<
      string,
      {
        score: number;
        matchedRules: string[];
        suggestedClassification: ClassificationLevel;
      }
    >();

    for (const rule of this.rules) {
      let matchedCount = 0;
      const matches: string[] = [];

      for (const kw of rule.keywords) {
        if (lowerText.includes(kw)) {
          matchedCount += 1;
          matches.push(`keyword:${kw}`);
        }
      }

      for (const pattern of rule.patterns) {
        if (pattern.test(text)) {
          matchedCount += 2; // Patterns carry higher weight
          matches.push(`pattern:${pattern.source}`);
        }
      }

      if (matchedCount > 0) {
        // Calculate bounded confidence score
        const rawScore = Math.min(1.0, 0.4 + matchedCount * 0.15 * rule.weight);
        scores.set(rule.type, {
          score: Math.round(rawScore * 100) / 100,
          matchedRules: matches,
          suggestedClassification: rule.suggestedClassification,
        });
      }
    }

    // Pick best match
    let bestType = 'GENERAL_EVIDENCE';
    let bestScore = 0.3;
    let bestMatches: string[] = [];
    let bestClassification = ClassificationLevel.RESTRICTED;

    for (const [type, data] of scores.entries()) {
      if (data.score > bestScore) {
        bestScore = data.score;
        bestType = type;
        bestMatches = data.matchedRules;
        bestClassification = data.suggestedClassification;
      }
    }

    this.logger.debug(
      `Document classified as '${bestType}' with confidence ${bestScore} (${bestMatches.length} rules matched)`,
    );

    return {
      detectedType: bestType,
      confidence: bestScore,
      matchedRules: bestMatches,
      suggestedClassification: bestClassification,
    };
  }
}
