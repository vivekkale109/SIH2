import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole, UserSummary, PaginatedResult } from '@sdms/shared-types';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReAuthGuard } from '../auth/guards/re-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequireReAuth } from '../auth/decorators/require-reauth.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or password policy not met' })
  @ApiResponse({ status: 403, description: 'Forbidden: requires ADMIN role' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserSummary> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AUDITOR, UserRole.RECORDS_MANAGER)
  @ApiOperation({ summary: 'List and filter users (Admin, Auditor, Records Manager)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: UserRole,
    @Query('departmentId') departmentId?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResult<UserSummary>> {
    return this.usersService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      role,
      departmentId,
      search,
    });
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.AUDITOR,
    UserRole.INVESTIGATOR,
    UserRole.PROSECUTOR,
    UserRole.COURT_OFFICER,
    UserRole.RECORDS_MANAGER,
  )
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserSummary> {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user details (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserSummary> {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/disable')
  @Roles(UserRole.ADMIN)
  @UseGuards(ReAuthGuard)
  @RequireReAuth(300)
  @ApiOperation({
    summary: 'Disable user account and revoke sessions (Admin only, requires re-auth)',
  })
  @ApiResponse({ status: 200, description: 'User disabled and sessions revoked' })
  @ApiResponse({ status: 403, description: 'Forbidden or re-authentication required' })
  async disable(@Param('id', ParseUUIDPipe) id: string): Promise<UserSummary> {
    return this.usersService.disable(id);
  }
}
