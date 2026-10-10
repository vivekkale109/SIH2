import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResultsResponse } from '@sdms/shared-types';

@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Full-text search over evidence documents, OCR text, and case metadata.
   * Results are strictly filtered through ABAC clearance based on the caller's role, department, and memberships.
   */
  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async search(
    @Query() queryDto: SearchQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SearchResultsResponse> {
    return this.searchService.search(queryDto, user);
  }
}
