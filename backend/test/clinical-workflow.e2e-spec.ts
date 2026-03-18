import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';
import { AIService } from '../src/modules/ai/ai.service';

type AuthResponse = {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    organization: string;
  };
};

type PatientResponse = {
  id: string;
  lifecycleStage: number;
};

type NotificationResponse = {
  id: string;
  type: string;
  isRead: boolean;
};

type ClinicalAlertResponse = {
  id: string;
  status: string;
  clinicalEvent: {
    id: string;
  };
};

describe('Clinical Workflow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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

    const uploadsDir = path.resolve(process.cwd(), 'data/uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "FamilyAccessAudit", "NotificationEvent", "PatientFamilyAccess", "Document", "Patient", "User", "Organization" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs full admin to family workflow with notifications', async () => {
    const adminEmail = `admin.${Date.now()}@example.com`;
    const adminPassword = 'AdminPass123!';
    const familyEmail = `family.${Date.now()}@example.com`;
    const familyPassword = 'FamilyPass123!';

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        orgName: 'MediLifecycle Test Org',
        email: adminEmail,
        password: adminPassword,
      })
      .expect(201);

    const registerBody = registerRes.body as AuthResponse;
    const adminToken = registerBody.access_token;

    const patientRes = await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        resourceType: 'Patient',
        name: [{ family: 'Doe', given: ['John'] }],
        gender: 'male',
        birthDate: '1980-01-01',
      })
      .expect(201);

    const patientBody = patientRes.body as PatientResponse;
    const patientId = patientBody.id;

    await request(app.getHttpServer())
      .post('/family-access/family-member')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: familyEmail,
        password: familyPassword,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/family-access/grant/${patientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        familyEmail,
        accessLevel: 'VIEW_ONLY',
        consentNote: 'Approved by patient guardian consent',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/patients/${patientId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stage: 2 })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/documents/upload/${patientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('BP 120/80, pulse 72'), {
        filename: 'report.txt',
        contentType: 'text/plain',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/clinical-events/patient/${patientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'VITAL',
        severity: 'CRITICAL',
        title: 'Acute oxygen desaturation',
        description: 'SpO2 dropped to 84% on room air',
        notifyFamily: true,
      })
      .expect(201);

    const openAlertsRes = await request(app.getHttpServer())
      .get('/clinical-events/alerts/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const openAlertsBody = openAlertsRes.body as ClinicalAlertResponse[];
    expect(openAlertsBody.length).toBe(1);
    expect(openAlertsBody[0].status).toBe('OPEN');

    await request(app.getHttpServer())
      .patch(`/clinical-events/alerts/${openAlertsBody[0].id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'ACKNOWLEDGED',
      })
      .expect(200);

    const familyLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: familyEmail,
        password: familyPassword,
      })
      .expect(200);

    const familyLoginBody = familyLoginRes.body as AuthResponse;
    const familyToken = familyLoginBody.access_token;

    const myPatientsRes = await request(app.getHttpServer())
      .get('/family-access/my-patients')
      .set('Authorization', `Bearer ${familyToken}`)
      .expect(200);

    const myPatientsBody = myPatientsRes.body as Array<{
      patientId: string;
    }>;
    expect(myPatientsBody.length).toBe(1);
    expect(myPatientsBody[0].patientId).toBe(patientId);

    const patientViewRes = await request(app.getHttpServer())
      .get(`/family-access/patient/${patientId}`)
      .set('Authorization', `Bearer ${familyToken}`)
      .expect(200);

    const patientViewBody = patientViewRes.body as {
      patient: { id: string };
    };
    expect(patientViewBody.patient.id).toBe(patientId);

    const notificationsRes = await request(app.getHttpServer())
      .get('/family-access/notifications')
      .set('Authorization', `Bearer ${familyToken}`)
      .expect(200);

    const notificationsBody = notificationsRes.body as NotificationResponse[];
    const notificationTypes = notificationsBody.map((event) => event.type);
    expect(notificationTypes).toContain('ACCESS_GRANTED');
    expect(notificationTypes).toContain('LIFECYCLE_STAGE_CHANGED');
    expect(notificationTypes).toContain('DOCUMENT_UPLOADED');
    expect(notificationTypes).toContain('CLINICAL_ALERT_CREATED');

    await request(app.getHttpServer())
      .patch(`/family-access/notifications/${notificationsBody[0].id}/read`)
      .set('Authorization', `Bearer ${familyToken}`)
      .expect(200);
  });
});
