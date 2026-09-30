import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DepartmentSummary, DepartmentType } from '@sdms/shared-types';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all departments' })
  @ApiQuery({ name: 'type', required: false, enum: DepartmentType })
  @ApiResponse({ status: 200, description: 'List of departments' })
  async findAll(@Query('type') type?: DepartmentType): Promise<DepartmentSummary[]> {
    return this.departmentsService.findAll(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department details by ID' })
  @ApiResponse({ status: 200, description: 'Department details' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DepartmentSummary> {
    return this.departmentsService.findById(id);
  }
}
