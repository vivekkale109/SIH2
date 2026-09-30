import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@sdms/shared-types';
import { UsersService } from './users.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
            },
            department: {
              findUnique: jest.fn(),
            },
            refreshToken: {
              updateMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            record: jest.fn().mockResolvedValue({ id: 'audit-1', sequence: 1 }),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const validDto = {
      email: 'new.officer@police.gov.in',
      password: 'Secure#Officer2026!',
      fullName: 'Officer Ananya Roy',
      role: UserRole.INVESTIGATOR,
      departmentId: 'dept-uuid-1',
    };

    it('should reject password that violates policy', async () => {
      await expect(
        service.create({
          ...validDto,
          password: 'short',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if email is already taken', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'existing' } as never);

      await expect(service.create(validDto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if department does not exist', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.department, 'findUnique').mockResolvedValue(null);

      await expect(service.create(validDto)).rejects.toThrow(NotFoundException);
    });

    it('should create user successfully when data is valid', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.department, 'findUnique').mockResolvedValue({ id: 'dept-uuid-1' } as never);
      jest.spyOn(prisma.user, 'create').mockResolvedValue({
        id: 'new-uuid',
        email: validDto.email,
        fullName: validDto.fullName,
        badgeNumber: null,
        role: validDto.role,
        departmentId: validDto.departmentId,
        isActive: true,
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await service.create(validDto);
      expect(result).toBeDefined();
      expect(result.email).toBe(validDto.email);
      expect(result.role).toBe(UserRole.INVESTIGATOR);
    });
  });

  describe('disable', () => {
    it('should disable user and revoke active sessions in transaction', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@police.gov.in',
        fullName: 'Test User',
        role: UserRole.INVESTIGATOR,
        departmentId: 'dept-1',
        isActive: false,
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'findById').mockResolvedValue(mockUser as never);
      jest.spyOn(prisma, '$transaction').mockResolvedValue([mockUser, { count: 2 }] as never);

      const result = await service.disable('user-uuid');
      expect(result.isActive).toBe(false);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
