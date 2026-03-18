import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AIService } from '../src/modules/ai/ai.service';
import { PrismaService } from '../src/modules/database/prisma.service';

type AuthResponse = {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    organization: string;
    orgId: string;
    patientProfileId: string | null;
  };
};

describe('Admin user management (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AIService)
      .useValue({
        chat: jest.fn().mockResolvedValue({
          role: 'assistant',
          content: '{"summary":"ok"}',
        }),
        generateClinicalSummary: jest
          .fn()
          .mockResolvedValue({ role: 'assistant', content: 'summary' }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = new JwtService({
      secret: process.env.JWT_SECRET ?? 'default-secret-change-me',
      signOptions: {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m',
      },
    });
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "RefreshSession", "LifecycleHookExecution", "PatientLifecycleTransition", "ReferralHandoff", "PriorAuthorization", "WorkflowAudit", "CareTask", "MedicationPlan", "ClinicalOrder", "ClinicalAlert", "ClinicalEvent", "FamilyQuestion", "FamilyAccessAudit", "NotificationDelivery", "NotificationEvent", "NotificationChannelPreference", "PatientFamilyAccess", "Document", "DemoLead", "Patient", "User", "Organization" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates organization users from admin context even when the token orgId is stale', async () => {
    const timestamp = Date.now();
    const adminEmail = `admin.${timestamp}@example.com`;
    const adminPassword = 'AdminPass123!';
    const doctorEmail = `doctor.${timestamp}@example.com`;
    const patientEmail = `patient.${timestamp}@example.com`;

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        orgName: 'Admin Flow Test Org',
        email: adminEmail,
        password: adminPassword,
      })
      .expect(201);

    const registerBody = registerRes.body as AuthResponse;
    const adminId = registerBody.user.id;

    const adminRecord = await prisma.user.findUniqueOrThrow({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });

    const staleOrgToken = jwtService.sign({
      sub: adminRecord.id,
      email: adminRecord.email,
      role: adminRecord.role,
      orgId: '00000000-0000-0000-0000-000000000000',
    });

    const doctorCreateRes = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${staleOrgToken}`)
      .send({
        email: doctorEmail,
        password: 'DoctorPass123!',
        role: 'DOCTOR',
      })
      .expect(201);

    expect(doctorCreateRes.body.email).toBe(doctorEmail);
    expect(doctorCreateRes.body.role).toBe('DOCTOR');

    const createdDoctor = await prisma.user.findUniqueOrThrow({
      where: { email: doctorEmail },
      select: {
        organizationId: true,
        role: true,
      },
    });

    expect(createdDoctor.organizationId).toBe(adminRecord.organizationId);
    expect(createdDoctor.role).toBe('DOCTOR');

    const patientCreateRes = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${staleOrgToken}`)
      .send({
        email: patientEmail,
        password: 'PatientPass123!',
        role: 'PATIENT',
        patientName: 'Portal Patient',
      })
      .expect(201);

    expect(patientCreateRes.body.email).toBe(patientEmail);
    expect(patientCreateRes.body.role).toBe('PATIENT');
    expect(patientCreateRes.body.patientProfileId).toEqual(expect.any(String));

    const createdPatientUser = await prisma.user.findUniqueOrThrow({
      where: { email: patientEmail },
      select: {
        organizationId: true,
        patientProfileId: true,
      },
    });

    expect(createdPatientUser.organizationId).toBe(adminRecord.organizationId);
    expect(createdPatientUser.patientProfileId).toBeTruthy();

    const createdPatientProfile = await prisma.patient.findUniqueOrThrow({
      where: { id: createdPatientUser.patientProfileId! },
      select: {
        organizationId: true,
        fhirResource: true,
      },
    });

    expect(createdPatientProfile.organizationId).toBe(
      adminRecord.organizationId,
    );
    expect(createdPatientProfile.fhirResource).toMatchObject({
      resourceType: 'Patient',
      active: true,
      name: [{ text: 'Portal Patient' }],
      telecom: [{ system: 'email', value: patientEmail }],
    });

    const usersRes = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${staleOrgToken}`)
      .expect(200);

    const userEmails = (usersRes.body as Array<{ email: string }>).map(
      (user) => user.email,
    );

    expect(userEmails).toEqual(
      expect.arrayContaining([adminEmail, doctorEmail, patientEmail]),
    );
  });
});
