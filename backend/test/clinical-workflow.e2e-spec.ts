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

type ClinicalOrderResponse = {
  id: string;
};

type MedicationPlanResponse = {
  id: string;
};

type WorkflowSummaryResponse = {
  pendingOrders: number;
  openTasks: number;
  overdueTasks: number;
  activeMedications: number;
  pendingPriorAuthorizations: number;
  activeReferrals: number;
  overdueReferrals: number;
};

type DashboardOverviewResponse = {
  totals: {
    pendingClinicalOrders: number;
    overdueCareTasks: number;
    pendingPriorAuthorizations: number;
    activeReferrals: number;
    overdueReferrals: number;
  };
};

type PriorAuthorizationResponse = {
  id: string;
};

type ReferralHandoffResponse = {
  id: string;
};

type NotificationPreferencesResponse = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  emailAddress: string | null;
};

type DeliveryDispatchResponse = {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
};

type LifecycleStatusResponse = {
  currentStage: number;
  transitions: Array<{
    toStage: number;
    allowed: boolean;
    blockers: string[];
  }>;
};

type LifecycleTransitionResponse = {
  fromStage: number;
  toStage: number;
};

describe('Clinical Workflow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.NOTIFY_AUTO_DISPATCH = 'false';

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
      'TRUNCATE TABLE "LifecycleHookExecution", "PatientLifecycleTransition", "ReferralHandoff", "PriorAuthorization", "WorkflowAudit", "CareTask", "MedicationPlan", "ClinicalOrder", "ClinicalAlert", "ClinicalEvent", "FamilyAccessAudit", "NotificationDelivery", "NotificationEvent", "NotificationChannelPreference", "PatientFamilyAccess", "Document", "Patient", "User", "Organization" RESTART IDENTITY CASCADE',
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

    const earlyFamilyLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: familyEmail,
        password: familyPassword,
      })
      .expect(200);

    const earlyFamilyToken = (earlyFamilyLogin.body as AuthResponse)
      .access_token;

    const notificationPrefsRes = await request(app.getHttpServer())
      .get('/family-access/notification-preferences')
      .set('Authorization', `Bearer ${earlyFamilyToken}`)
      .expect(200);
    const notificationPrefsBody =
      notificationPrefsRes.body as NotificationPreferencesResponse;
    expect(notificationPrefsBody.inAppEnabled).toBe(true);
    expect(notificationPrefsBody.emailEnabled).toBe(false);

    await request(app.getHttpServer())
      .patch('/family-access/notification-preferences')
      .set('Authorization', `Bearer ${earlyFamilyToken}`)
      .send({
        emailEnabled: true,
        emailAddress: familyEmail,
      })
      .expect(200);

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

    const lifecycleStatusRes = await request(app.getHttpServer())
      .get(`/patients/${patientId}/lifecycle/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const lifecycleStatusBody =
      lifecycleStatusRes.body as LifecycleStatusResponse;
    expect(lifecycleStatusBody.currentStage).toBe(2);
    expect(
      lifecycleStatusBody.transitions.some(
        (transition) => transition.toStage === 3 && transition.allowed,
      ),
    ).toBe(false);

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

    const orderRes = await request(app.getHttpServer())
      .post(`/clinical-workflows/patient/${patientId}/orders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'LAB_TEST',
        priority: 'HIGH',
        title: 'Urgent blood culture panel',
        description: 'Rule out bacteremia',
        dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        notifyFamily: true,
      })
      .expect(201);

    const orderBody = orderRes.body as ClinicalOrderResponse;
    const orderId = orderBody.id;

    await request(app.getHttpServer())
      .post(`/clinical-workflows/orders/${orderId}/tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'PRE_AUTH',
        title: 'Collect insurance pre-auth',
        dueAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/clinical-workflows/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'ESCALATED',
        note: 'Lab must be completed in next slot',
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/clinical-workflows/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'COMPLETED',
      })
      .expect(200);

    const medicationRes = await request(app.getHttpServer())
      .post(`/clinical-workflows/patient/${patientId}/medications`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clinicalOrderId: orderId,
        medicationName: 'Amoxicillin',
        dosage: '500mg',
        frequency: 'BID',
        startDate: new Date().toISOString(),
      })
      .expect(201);

    const medicationBody = medicationRes.body as MedicationPlanResponse;

    await request(app.getHttpServer())
      .patch(`/clinical-workflows/medications/${medicationBody.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'PAUSED',
      })
      .expect(200);

    const priorAuthRes = await request(app.getHttpServer())
      .post(`/clinical-workflows/patient/${patientId}/prior-auths`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clinicalOrderId: orderId,
        payerName: 'United Health',
        policyNumber: 'UH-98231',
        serviceCodes: ['CPT-123', 'CPT-456'],
        status: 'SUBMITTED',
      })
      .expect(201);

    const priorAuthBody = priorAuthRes.body as PriorAuthorizationResponse;

    await request(app.getHttpServer())
      .patch(`/clinical-workflows/prior-auths/${priorAuthBody.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'APPROVED',
        decisionNote: 'Approved after clinical review',
      })
      .expect(200);

    const referralRes = await request(app.getHttpServer())
      .post(`/clinical-workflows/patient/${patientId}/referrals`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clinicalOrderId: orderId,
        destinationType: 'EXTERNAL_PROVIDER',
        destinationName: 'City Specialty Center',
        reason: 'Specialist cardiology opinion',
        priority: 'HIGH',
        dueAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      })
      .expect(201);

    const referralBody = referralRes.body as ReferralHandoffResponse;

    await request(app.getHttpServer())
      .patch(`/clinical-workflows/referrals/${referralBody.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'IN_PROGRESS',
      })
      .expect(200);

    const automationRes = await request(app.getHttpServer())
      .post('/clinical-workflows/automation/overdue/run')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(
      (automationRes.body as { careTasksEscalated: number }).careTasksEscalated,
    ).toBe(1);
    expect(
      (automationRes.body as { referralsEscalated: number }).referralsEscalated,
    ).toBe(1);

    const workflowSummaryRes = await request(app.getHttpServer())
      .get(`/clinical-workflows/patient/${patientId}/summary`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const workflowSummaryBody =
      workflowSummaryRes.body as WorkflowSummaryResponse;
    expect(workflowSummaryBody.pendingOrders).toBe(0);
    expect(workflowSummaryBody.openTasks).toBe(1);
    expect(workflowSummaryBody.overdueTasks).toBe(1);
    expect(workflowSummaryBody.activeMedications).toBe(0);
    expect(workflowSummaryBody.pendingPriorAuthorizations).toBe(0);
    expect(workflowSummaryBody.activeReferrals).toBe(1);
    expect(workflowSummaryBody.overdueReferrals).toBe(1);

    const dashboardOverviewRes = await request(app.getHttpServer())
      .get('/dashboard/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const dashboardOverviewBody =
      dashboardOverviewRes.body as DashboardOverviewResponse;
    expect(dashboardOverviewBody.totals.pendingClinicalOrders).toBe(0);
    expect(dashboardOverviewBody.totals.overdueCareTasks).toBe(1);
    expect(dashboardOverviewBody.totals.pendingPriorAuthorizations).toBe(0);
    expect(dashboardOverviewBody.totals.activeReferrals).toBe(1);
    expect(dashboardOverviewBody.totals.overdueReferrals).toBe(1);

    const deliveryDispatchRes = await request(app.getHttpServer())
      .post('/notifications/delivery/run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ limit: 200 })
      .expect(201);
    const deliveryDispatchBody =
      deliveryDispatchRes.body as DeliveryDispatchResponse;
    expect(deliveryDispatchBody.processed).toBeGreaterThan(0);
    expect(deliveryDispatchBody.processed).toBe(
      deliveryDispatchBody.sent +
        deliveryDispatchBody.skipped +
        deliveryDispatchBody.failed,
    );

    const recentDeliveriesRes = await request(app.getHttpServer())
      .get('/notifications/delivery/recent?limit=50')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((recentDeliveriesRes.body as unknown[]).length).toBeGreaterThan(0);

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
    expect(notificationTypes).toContain('CLINICAL_ORDER_CREATED');
    expect(notificationTypes).toContain('CLINICAL_ORDER_ESCALATED');
    expect(notificationTypes).toContain('CLINICAL_ORDER_COMPLETED');
    expect(notificationTypes).toContain('MEDICATION_PLAN_UPDATED');
    expect(notificationTypes).toContain('PRIOR_AUTH_SUBMITTED');
    expect(notificationTypes).toContain('PRIOR_AUTH_DECISION');
    expect(notificationTypes).toContain('REFERRAL_CREATED');
    expect(notificationTypes).toContain('REFERRAL_STATUS_UPDATED');
    expect(notificationTypes).toContain('REFERRAL_OVERDUE');

    const lifecycleTransitionsRes = await request(app.getHttpServer())
      .get(`/patients/${patientId}/lifecycle/transitions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const lifecycleTransitionsBody =
      lifecycleTransitionsRes.body as LifecycleTransitionResponse[];
    expect(
      lifecycleTransitionsBody.some(
        (transition) => transition.fromStage === 0 && transition.toStage === 1,
      ),
    ).toBe(true);
    expect(
      lifecycleTransitionsBody.some(
        (transition) => transition.fromStage === 1 && transition.toStage === 2,
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .patch(`/family-access/notifications/${notificationsBody[0].id}/read`)
      .set('Authorization', `Bearer ${familyToken}`)
      .expect(200);
  });
});
