import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let mockPrismaService: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    mockPrismaService = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return live status', () => {
    const liveness = service.isLive();
    expect(liveness.status).toBe('ok');
    expect(typeof liveness.uptime).toBe('number');
  });

  it('should return healthy status when DB responds', async () => {
    mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    const result = await service.check();
    expect(result.status).toBe('ok');
    expect(result.services.database.status).toBe('up');
    expect(typeof result.services.database.latencyMs).toBe('number');
  });

  it('should report down when DB query fails', async () => {
    mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Connection lost'));

    const result = await service.check();
    expect(result.status).toBe('error');
    expect(result.services.database.status).toBe('down');
  });
});
