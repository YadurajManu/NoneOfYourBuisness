import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../database/prisma.service';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('AdminService', () => {
  let service: AdminService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
    patient: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const usersServiceMock = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    listByOrganization: jest.fn(),
    updateRole: jest.fn(),
    setSuspended: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(
      prismaMock as unknown as PrismaService,
      usersServiceMock as unknown as UsersService,
    );
  });

  it('creates a non-patient user inside the admin organization from DB context', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 'admin-1',
        role: UserRole.ADMIN,
        isSuspended: false,
        organizationId: 'org-real',
      })
      .mockResolvedValueOnce({
        id: 'doctor-1',
        email: 'doctor@example.com',
        role: UserRole.DOCTOR,
        isSuspended: false,
        suspendedAt: null,
        patientProfileId: null,
        createdAt: new Date('2026-03-18T00:00:00.000Z'),
        updatedAt: new Date('2026-03-18T00:00:00.000Z'),
      });
    usersServiceMock.findByEmail.mockResolvedValue(null);
    usersServiceMock.create.mockResolvedValue({ id: 'doctor-1' });

    const result = await service.createUser('admin-1', {
      email: 'doctor@example.com',
      password: 'DoctorPass123!',
      role: UserRole.DOCTOR,
    });

    expect(usersServiceMock.create).toHaveBeenCalledWith({
      email: 'doctor@example.com',
      passwordHash: 'hashed-password',
      role: UserRole.DOCTOR,
      organizationId: 'org-real',
    });
    expect(result).toMatchObject({
      id: 'doctor-1',
      email: 'doctor@example.com',
      role: UserRole.DOCTOR,
    });
  });

  it('creates and links a patient profile when adding a patient user', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 'admin-1',
        role: UserRole.ADMIN,
        isSuspended: false,
        organizationId: 'org-real',
      })
      .mockResolvedValueOnce({
        id: 'patient-user-1',
        email: 'patient@example.com',
        role: UserRole.PATIENT,
        isSuspended: false,
        suspendedAt: null,
        patientProfileId: 'patient-1',
        createdAt: new Date('2026-03-18T00:00:00.000Z'),
        updatedAt: new Date('2026-03-18T00:00:00.000Z'),
      });
    usersServiceMock.findByEmail.mockResolvedValue(null);

    const txMock = {
      patient: {
        create: jest.fn().mockResolvedValue({ id: 'patient-1' }),
      },
      user: {
        create: jest.fn().mockResolvedValue({ id: 'patient-user-1' }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(txMock),
    );

    const result = await service.createUser('admin-1', {
      email: 'patient@example.com',
      password: 'PatientPass123!',
      role: UserRole.PATIENT,
      patientName: 'Portal Patient',
    });

    expect(txMock.patient.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-real',
        fhirResource: {
          resourceType: 'Patient',
          active: true,
          name: [{ text: 'Portal Patient' }],
          telecom: [{ system: 'email', value: 'patient@example.com' }],
        },
      },
      select: { id: true },
    });
    expect(txMock.user.create).toHaveBeenCalledWith({
      data: {
        email: 'patient@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.PATIENT,
        organizationId: 'org-real',
        patientProfileId: 'patient-1',
      },
      select: { id: true },
    });
    expect(result).toMatchObject({
      id: 'patient-user-1',
      email: 'patient@example.com',
      role: UserRole.PATIENT,
      patientProfileId: 'patient-1',
    });
  });

  it('rejects add-user calls when the admin account is suspended', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      role: UserRole.ADMIN,
      isSuspended: true,
      organizationId: 'org-real',
    });

    await expect(
      service.createUser('admin-1', {
        email: 'blocked@example.com',
        password: 'BlockedPass123!',
        role: UserRole.DOCTOR,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects duplicate emails before attempting creation', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      role: UserRole.ADMIN,
      isSuspended: false,
      organizationId: 'org-real',
    });
    usersServiceMock.findByEmail.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.createUser('admin-1', {
        email: 'existing@example.com',
        password: 'ExistingPass123!',
        role: UserRole.DOCTOR,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(usersServiceMock.create).not.toHaveBeenCalled();
  });
});
