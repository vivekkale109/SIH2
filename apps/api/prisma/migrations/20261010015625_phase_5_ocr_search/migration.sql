-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "processingError" TEXT;

-- AlterTable
ALTER TABLE "ocr_results" ADD COLUMN     "extractedMetadata" JSONB DEFAULT '{}';

-- Full-Text Search GIN Indexes for Phase 5
CREATE INDEX IF NOT EXISTS "ocr_results_fts_idx" ON "ocr_results" USING gin (to_tsvector('english', "extractedText"));
CREATE INDEX IF NOT EXISTS "documents_title_fts_idx" ON "documents" USING gin (to_tsvector('english', "title"));

