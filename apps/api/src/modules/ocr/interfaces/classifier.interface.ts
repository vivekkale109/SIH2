import { ClassificationLevel } from '@sdms/shared-types';

export interface ClassificationResult {
  detectedType: string;
  confidence: number;
  matchedRules: string[];
  suggestedClassification?: ClassificationLevel;
}

export interface Classifier {
  classify(
    text: string,
    metadata?: Record<string, unknown>,
  ): Promise<ClassificationResult> | ClassificationResult;
}
