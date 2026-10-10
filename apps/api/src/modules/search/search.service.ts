import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ClassificationLevel,
  DocumentStatus,
  SearchResultItem,
  SearchResultsResponse,
  UserRole,
} from '@sdms/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Performs full-text and metadata search with strict ABAC clearance filtering.
   * Ensures unauthorized cases and documents are NEVER leaked in search results.
   */
  async search(
    queryDto: Partial<SearchQueryDto>,
    user: AuthenticatedUser,
  ): Promise<SearchResultsResponse> {
    const {
      q,
      caseId,
      type,
      classification,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = queryDto;

    const skip = (page - 1) * limit;

    // 1. Compute ABAC clearance scope for the user
    const abacWhere = await this.buildAbacDocumentFilter(user);

    // 2. Build Prisma WHERE conditions
    const whereConditions: Prisma.DocumentWhereInput[] = [abacWhere];

    if (caseId) {
      whereConditions.push({ caseId });
    }

    if (type) {
      whereConditions.push({ type: { equals: type, mode: 'insensitive' } });
    }

    if (classification) {
      whereConditions.push({ classification });
    }

    if (status) {
      whereConditions.push({ status });
    }

    if (startDate || endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      whereConditions.push({ createdAt: dateFilter });
    }

    // Full text search condition across title, type, case number, and OCR extracted text
    const cleanQuery = q ? q.trim() : '';
    if (cleanQuery.length > 0) {
      whereConditions.push({
        OR: [
          { title: { contains: cleanQuery, mode: 'insensitive' } },
          { type: { contains: cleanQuery, mode: 'insensitive' } },
          { case: { caseNumber: { contains: cleanQuery, mode: 'insensitive' } } },
          { case: { title: { contains: cleanQuery, mode: 'insensitive' } } },
          {
            versions: {
              some: {
                ocrResult: {
                  extractedText: { contains: cleanQuery, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      });
    }

    const finalWhere: Prisma.DocumentWhereInput = {
      AND: whereConditions,
    };

    // 3. Execute count and find queries
    const [total, documents] = await Promise.all([
      this.prisma.document.count({ where: finalWhere }),
      this.prisma.document.findMany({
        where: finalWhere,
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
              classification: true,
            },
          },
          versions: {
            orderBy: { versionNo: 'desc' },
            take: 1,
            include: {
              ocrResult: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // 4. Transform results and generate highlighted snippets
    const results: SearchResultItem[] = documents.map((doc) => {
      const latestVersion = doc.versions[0];
      const ocr = latestVersion?.ocrResult;
      const extractedText = ocr?.extractedText || '';

      const { snippet, score } = this.generateSnippetAndScore(
        cleanQuery,
        doc.title,
        doc.type,
        doc.case.caseNumber,
        extractedText,
      );

      return {
        documentId: doc.id,
        caseId: doc.caseId,
        caseNumber: doc.case.caseNumber,
        caseTitle: doc.case.title,
        title: doc.title,
        type: doc.type,
        classification: doc.classification as unknown as ClassificationLevel,
        status: doc.status as unknown as DocumentStatus,
        versionNo: latestVersion?.versionNo || 1,
        sha256: latestVersion?.sha256,
        sizeBytes: latestVersion ? Number(latestVersion.sizeBytes) : undefined,
        createdAt: doc.createdAt.toISOString(),
        snippet,
        matchScore: score,
        extractedMetadata: (ocr?.extractedMetadata as Record<string, unknown>) || null,
        ocrConfidence: ocr?.confidence ?? null,
      };
    });

    // If query provided, sort by match score descending
    if (cleanQuery.length > 0) {
      results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      results,
      total,
      page,
      limit,
      totalPages,
      query: cleanQuery,
    };
  }

  /**
   * Generates a context snippet with <mark> highlighting around matched search terms.
   */
  private generateSnippetAndScore(
    query: string,
    title: string,
    type: string,
    caseNumber: string,
    extractedText: string,
  ): { snippet: string; score: number } {
    if (!query || query.length === 0) {
      const preview =
        extractedText.length > 180
          ? `${extractedText.slice(0, 180)}...`
          : extractedText || `${title} (${type})`;
      return { snippet: preview, score: 1.0 };
    }

    const queryLower = query.toLowerCase();
    let score = 0;

    // Check high priority matches
    if (title.toLowerCase().includes(queryLower)) score += 5;
    if (caseNumber.toLowerCase().includes(queryLower)) score += 4;
    if (type.toLowerCase().includes(queryLower)) score += 3;

    if (!extractedText || extractedText.length === 0) {
      const snippet = this.highlightMatches(title, query);
      return { snippet, score: Math.max(score, 1) };
    }

    const textLower = extractedText.toLowerCase();
    const matchIndex = textLower.indexOf(queryLower);

    if (matchIndex === -1) {
      // Query matched in metadata, case number, or title
      if (title.toLowerCase().includes(queryLower)) {
        return { snippet: this.highlightMatches(title, query), score: Math.max(score, 1) };
      }
      if (caseNumber.toLowerCase().includes(queryLower)) {
        return {
          snippet: `Case: ${this.highlightMatches(caseNumber, query)}`,
          score: Math.max(score, 1),
        };
      }
      const preview =
        extractedText.length > 180 ? `${extractedText.slice(0, 180)}...` : extractedText;
      return { snippet: this.highlightMatches(preview, query), score: Math.max(score, 1) };
    }

    score += 2;

    // Extract surrounding window around first match
    const windowRadius = 75;
    const start = Math.max(0, matchIndex - windowRadius);
    const end = Math.min(extractedText.length, matchIndex + query.length + windowRadius);

    let snippet = extractedText.slice(start, end);
    if (start > 0) snippet = `...${snippet}`;
    if (end < extractedText.length) snippet = `${snippet}...`;

    const highlighted = this.highlightMatches(snippet, query);
    return { snippet: highlighted, score };
  }

  private highlightMatches(text: string, query: string): string {
    if (!query) return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Evaluates user's ABAC permissions and returns a Prisma Document filter
   * ensuring users can only discover documents they have clearance to inspect.
   */
  private async buildAbacDocumentFilter(
    user: AuthenticatedUser,
  ): Promise<Prisma.DocumentWhereInput> {
    // 1. ADMIN and AUDITOR roles have global clearance
    if (user.role === UserRole.ADMIN || user.role === UserRole.AUDITOR) {
      return {};
    }

    // 2. Fetch active share grants for the user or department
    const now = new Date();
    const activeShares = await this.prisma.shareGrant.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: now },
        OR: [{ granteeId: user.id }, { granteeDepartmentId: user.departmentId }],
      },
      select: {
        resourceType: true,
        resourceId: true,
      },
    });

    const sharedCaseIds = activeShares
      .filter((s) => s.resourceType === 'CASE')
      .map((s) => s.resourceId);

    const sharedDocIds = activeShares
      .filter((s) => s.resourceType === 'DOCUMENT')
      .map((s) => s.resourceId);

    // 3. User can access documents:
    //    - If user uploaded/created the document
    //    - If user is assigned to the case (any case role)
    //    - If user created the case
    //    - If case is shared with user
    //    - If document is directly shared with user
    //    - If document is in user's department AND classification is PUBLIC or RESTRICTED
    return {
      OR: [
        { createdById: user.id },
        { id: { in: sharedDocIds } },
        { caseId: { in: sharedCaseIds } },
        { case: { createdById: user.id } },
        { case: { members: { some: { userId: user.id } } } },
        {
          case: { departmentId: user.departmentId },
          classification: {
            in: [ClassificationLevel.PUBLIC, ClassificationLevel.RESTRICTED],
          },
        },
      ],
    };
  }
}
