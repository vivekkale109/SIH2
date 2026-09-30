import { PrismaClient, UserRole, DepartmentType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('Seeding SDMS database with initial departments and demo users...');

  // 1. Seed Departments
  const departmentsData = [
    {
      code: 'POL-CCB',
      name: 'Central Crime Branch - Police Headquarters',
      type: DepartmentType.POLICE,
      jurisdiction: 'State Capital Zone',
    },
    {
      code: 'POL-CYBER',
      name: 'Cyber Crime Investigation Division',
      type: DepartmentType.POLICE,
      jurisdiction: 'Metropolitan Jurisdiction',
    },
    {
      code: 'PROS-HQ',
      name: 'Directorate of Public Prosecutions - State HQ',
      type: DepartmentType.PROSECUTION,
      jurisdiction: 'State High Court & District Courts',
    },
    {
      code: 'CRT-SESS',
      name: 'Principal District and Sessions Court',
      type: DepartmentType.COURT,
      jurisdiction: 'District Court Complex, Sector 1',
    },
  ];

  const departmentMap = new Map<string, string>();

  for (const dept of departmentsData) {
    const record = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, type: dept.type, jurisdiction: dept.jurisdiction },
      create: dept,
    });
    departmentMap.set(dept.code, record.id);
  }

  // 2. Default Password (Meets strict policy: 16 chars, uppercase, lowercase, numbers, symbols)
  const defaultPasswordHash = await hashPassword('Secure#Demo2026!');

  // 3. Seed Users across all 6 RBAC roles
  const usersData = [
    {
      email: 'admin@sdms.gov.in',
      fullName: 'Chief Systems Administrator',
      badgeNumber: 'ADMIN-001',
      role: UserRole.ADMIN,
      deptCode: 'POL-CCB',
    },
    {
      email: 'investigator@police.gov.in',
      fullName: 'Inspector Rajesh Sharma',
      badgeNumber: 'POL-INV-4412',
      role: UserRole.INVESTIGATOR,
      deptCode: 'POL-CCB',
    },
    {
      email: 'prosecutor@prosecution.gov.in',
      fullName: 'Senior Public Prosecutor Meera Sen',
      badgeNumber: 'PROS-OFF-208',
      role: UserRole.PROSECUTOR,
      deptCode: 'PROS-HQ',
    },
    {
      email: 'court.officer@court.gov.in',
      fullName: 'Registrar K. V. Raman',
      badgeNumber: 'CRT-REG-104',
      role: UserRole.COURT_OFFICER,
      deptCode: 'CRT-SESS',
    },
    {
      email: 'records@sdms.gov.in',
      fullName: 'Chief Records Officer Sunita Das',
      badgeNumber: 'REC-MGR-319',
      role: UserRole.RECORDS_MANAGER,
      deptCode: 'POL-CCB',
    },
    {
      email: 'auditor@vigilance.gov.in',
      fullName: 'Senior Vigilance Auditor Amit Patel',
      badgeNumber: 'AUD-VIG-502',
      role: UserRole.AUDITOR,
      deptCode: 'PROS-HQ',
    },
  ];

  for (const user of usersData) {
    const deptId = departmentMap.get(user.deptCode);
    if (!deptId) {
      throw new Error(`Department code ${user.deptCode} not found in map`);
    }

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        badgeNumber: user.badgeNumber,
        role: user.role,
        departmentId: deptId,
        isActive: true,
      },
      create: {
        email: user.email,
        passwordHash: defaultPasswordHash,
        fullName: user.fullName,
        badgeNumber: user.badgeNumber,
        role: user.role,
        departmentId: deptId,
        isActive: true,
        mfaEnabled: false,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('✅ Database seeded successfully: 4 departments and 6 role-based users.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
