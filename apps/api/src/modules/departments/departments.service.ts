import { Injectable, NotFoundException } from '@nestjs/common';
import { Department } from '@prisma/client';
import { DepartmentSummary, DepartmentType } from '@sdms/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(type?: DepartmentType): Promise<DepartmentSummary[]> {
    const departments = await this.prisma.department.findMany({
      where: type ? { type } : undefined,
      orderBy: { name: 'asc' },
    });

    return departments.map((d) => this.toSummary(d));
  }

  async findById(id: string): Promise<DepartmentSummary> {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID '${id}' not found`);
    }

    return this.toSummary(department);
  }

  private toSummary(department: Department): DepartmentSummary {
    return {
      id: department.id,
      name: department.name,
      code: department.code,
      type: department.type as unknown as DepartmentType,
      jurisdiction: department.jurisdiction || undefined,
      createdAt: department.createdAt.toISOString(),
      updatedAt: department.updatedAt.toISOString(),
    };
  }
}
