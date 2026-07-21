/**
 * Aarogya360 / MediLifecycle demo seed
 *
 * Creates one demo hospital org with all portal roles, multi-stage Indian
 * patients, care-team links, clinical work, leads, and family consent data.
 *
 * Usage:
 *   npm run seed
 *   npm run seed:railway          # uses Railway Postgres public URL
 *   SEED_RESET=true npm run seed  # wipe demo org first, then reseed
 *
 * Default password for every demo user: Demo@Aarogya360
 */

import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_ORG_NAME = 'Sunrise Multispeciality Hospital';
const DEMO_PASSWORD = 'Demo@Aarogya360';
const PRIMARY_DOCTOR_EXTENSION_URL =
  'https://aarogya360.app/fhir/StructureDefinition/primary-doctor-user-id';
const PREFERRED_SPECIALIST_EXTENSION_URL =
  'https://aarogya360.app/fhir/StructureDefinition/preferred-specialist-user-id';
const MRN_SYSTEM = 'https://aarogya360.app/fhir/identifier/mrn';

type StaffSeed = {
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
};

type PatientSeed = {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  birthDate: string;
  phone: string;
  city: string;
  state: string;
  mrn: string;
  stage: number;
  condition: string;
  assignDoctor: boolean;
  assignSpecialist: boolean;
  familyEmail?: string;
  familyName?: string;
  familyAccess?: 'VIEW_ONLY' | 'FULL_UPDATES' | 'EMERGENCY_CONTACT';
  familyPendingInvite?: boolean;
};

const staff: StaffSeed[] = [
  {
    email: 'admin.demo@aarogya360.demo',
    displayName: 'Ananya Sharma',
    role: UserRole.ADMIN,
    phone: '+91-98100-11001',
  },
  {
    email: 'coord.iyer@aarogya360.demo',
    displayName: 'Priya Iyer',
    role: UserRole.CARE_COORDINATOR,
    phone: '+91-98100-11002',
  },
  {
    email: 'dr.mehta@aarogya360.demo',
    displayName: 'Dr. Rajesh Mehta',
    role: UserRole.DOCTOR,
    phone: '+91-98100-11003',
  },
  {
    email: 'dr.nair@aarogya360.demo',
    displayName: 'Dr. Kavita Nair',
    role: UserRole.DOCTOR,
    phone: '+91-98100-11004',
  },
  {
    email: 'dr.reddy@aarogya360.demo',
    displayName: 'Dr. Arjun Reddy',
    role: UserRole.SPECIALIST,
    phone: '+91-98100-11005',
  },
  {
    email: 'dr.banerjee@aarogya360.demo',
    displayName: 'Dr. Sneha Banerjee',
    role: UserRole.SPECIALIST,
    phone: '+91-98100-11006',
  },
];

const patients: PatientSeed[] = [
  {
    email: 'patient.rahul@aarogya360.demo',
    displayName: 'Rahul Verma',
    firstName: 'Rahul',
    lastName: 'Verma',
    gender: 'male',
    birthDate: '1988-04-12',
    phone: '+91-98765-10001',
    city: 'Bengaluru',
    state: 'Karnataka',
    mrn: 'SMH-1001',
    stage: 1,
    condition: 'New cardiology referral – chest discomfort',
    assignDoctor: false,
    assignSpecialist: false,
  },
  {
    email: 'patient.sneha@aarogya360.demo',
    displayName: 'Sneha Patil',
    firstName: 'Sneha',
    lastName: 'Patil',
    gender: 'female',
    birthDate: '1992-11-03',
    phone: '+91-98765-10002',
    city: 'Pune',
    state: 'Maharashtra',
    mrn: 'SMH-1002',
    stage: 2,
    condition: 'Intake validation – diabetes follow-up pack',
    assignDoctor: true,
    assignSpecialist: false,
    familyEmail: 'family.patil@aarogya360.demo',
    familyName: 'Amit Patil',
    familyPendingInvite: true,
  },
  {
    email: 'patient.vikram@aarogya360.demo',
    displayName: 'Vikram Singh',
    firstName: 'Vikram',
    lastName: 'Singh',
    gender: 'male',
    birthDate: '1975-07-21',
    phone: '+91-98765-10003',
    city: 'Jaipur',
    state: 'Rajasthan',
    mrn: 'SMH-1003',
    stage: 3,
    condition: 'Primary clinical review – hypertension',
    assignDoctor: true,
    assignSpecialist: false,
  },
  {
    email: 'patient.meera@aarogya360.demo',
    displayName: 'Meera Krishnan',
    firstName: 'Meera',
    lastName: 'Krishnan',
    gender: 'female',
    birthDate: '1985-01-18',
    phone: '+91-98765-10004',
    city: 'Chennai',
    state: 'Tamil Nadu',
    mrn: 'SMH-1004',
    stage: 4,
    condition: 'Diagnostics & prior-auth – MRI lumbar spine',
    assignDoctor: true,
    assignSpecialist: true,
  },
  {
    email: 'patient.arjun@aarogya360.demo',
    displayName: 'Arjun Desai',
    firstName: 'Arjun',
    lastName: 'Desai',
    gender: 'male',
    birthDate: '1990-09-09',
    phone: '+91-98765-10005',
    city: 'Ahmedabad',
    state: 'Gujarat',
    mrn: 'SMH-1005',
    stage: 5,
    condition: 'Specialist referral – orthopedics (knee)',
    assignDoctor: true,
    assignSpecialist: true,
    familyEmail: 'family.desai@aarogya360.demo',
    familyName: 'Neha Desai',
    familyAccess: 'FULL_UPDATES',
  },
  {
    email: 'patient.fatima@aarogya360.demo',
    displayName: 'Fatima Khan',
    firstName: 'Fatima',
    lastName: 'Khan',
    gender: 'female',
    birthDate: '1996-05-27',
    phone: '+91-98765-10006',
    city: 'Hyderabad',
    state: 'Telangana',
    mrn: 'SMH-1006',
    stage: 6,
    condition: 'Treatment plan activation – asthma controller',
    assignDoctor: true,
    assignSpecialist: true,
  },
  {
    email: 'patient.karan@aarogya360.demo',
    displayName: 'Karan Malhotra',
    firstName: 'Karan',
    lastName: 'Malhotra',
    gender: 'male',
    birthDate: '1982-12-14',
    phone: '+91-98765-10007',
    city: 'New Delhi',
    state: 'Delhi',
    mrn: 'SMH-1007',
    stage: 7,
    condition: 'Active care – post angioplasty monitoring',
    assignDoctor: true,
    assignSpecialist: true,
    familyEmail: 'family.malhotra@aarogya360.demo',
    familyName: 'Pooja Malhotra',
    familyAccess: 'EMERGENCY_CONTACT',
  },
  {
    email: 'patient.divya@aarogya360.demo',
    displayName: 'Divya Nambiar',
    firstName: 'Divya',
    lastName: 'Nambiar',
    gender: 'female',
    birthDate: '1994-03-08',
    phone: '+91-98765-10008',
    city: 'Kochi',
    state: 'Kerala',
    mrn: 'SMH-1008',
    stage: 8,
    condition: 'Monitoring & follow-up – thyroid panel',
    assignDoctor: true,
    assignSpecialist: false,
  },
  {
    email: 'patient.imran@aarogya360.demo',
    displayName: 'Imran Qureshi',
    firstName: 'Imran',
    lastName: 'Qureshi',
    gender: 'male',
    birthDate: '1970-08-30',
    phone: '+91-98765-10009',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    mrn: 'SMH-1009',
    stage: 9,
    condition: 'Discharge planning – COPD exacerbation',
    assignDoctor: true,
    assignSpecialist: true,
  },
  {
    email: 'patient.anjali@aarogya360.demo',
    displayName: 'Anjali Gupta',
    firstName: 'Anjali',
    lastName: 'Gupta',
    gender: 'female',
    birthDate: '1968-02-22',
    phone: '+91-98765-10010',
    city: 'Indore',
    state: 'Madhya Pradesh',
    mrn: 'SMH-1010',
    stage: 10,
    condition: 'Longitudinal care closure – stable diabetes',
    assignDoctor: true,
    assignSpecialist: false,
    familyEmail: 'family.gupta@aarogya360.demo',
    familyName: 'Rohit Gupta',
    familyAccess: 'VIEW_ONLY',
  },
];

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function buildFhirPatient(
  p: PatientSeed,
  doctorId?: string | null,
  specialistId?: string | null,
) {
  const extensions: Array<{ url: string; valueString: string }> = [];
  if (doctorId) {
    extensions.push({
      url: PRIMARY_DOCTOR_EXTENSION_URL,
      valueString: doctorId,
    });
  }
  if (specialistId) {
    extensions.push({
      url: PREFERRED_SPECIALIST_EXTENSION_URL,
      valueString: specialistId,
    });
  }

  return {
    resourceType: 'Patient',
    active: true,
    name: [
      {
        use: 'official',
        text: p.displayName,
        family: p.lastName,
        given: [p.firstName],
      },
    ],
    gender: p.gender,
    birthDate: p.birthDate,
    telecom: [
      { system: 'phone', value: p.phone, use: 'mobile' },
      { system: 'email', value: p.email, use: 'home' },
    ],
    address: [
      {
        use: 'home',
        city: p.city,
        state: p.state,
        country: 'IN',
      },
    ],
    identifier: [
      {
        system: MRN_SYSTEM,
        value: p.mrn,
      },
    ],
    extension: extensions,
  };
}

async function wipeDemoOrg(orgId: string) {
  // Delete in dependency-safe order for this org only
  await prisma.directMessage.deleteMany({
    where: { conversation: { organizationId: orgId } },
  });
  await prisma.directConversationParticipant.deleteMany({
    where: { conversation: { organizationId: orgId } },
  });
  await prisma.directConversation.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.supportMessage.deleteMany({
    where: { ticket: { organizationId: orgId } },
  });
  await prisma.supportTicket.deleteMany({ where: { organizationId: orgId } });
  await prisma.familyQuestion.deleteMany({ where: { organizationId: orgId } });
  await prisma.notificationDelivery.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.notificationEvent.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.notificationChannelPreference.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.familyAccessAudit.deleteMany({
    where: { patient: { organizationId: orgId } },
  });
  await prisma.familyAccessInvite.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.patientFamilyAccess.deleteMany({
    where: { patient: { organizationId: orgId } },
  });
  await prisma.clinicalAlert.deleteMany({ where: { organizationId: orgId } });
  await prisma.clinicalEvent.deleteMany({ where: { organizationId: orgId } });
  await prisma.careTask.deleteMany({ where: { organizationId: orgId } });
  await prisma.medicationPlan.deleteMany({ where: { organizationId: orgId } });
  await prisma.priorAuthorization.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.referralHandoff.deleteMany({ where: { organizationId: orgId } });
  await prisma.clinicalOrder.deleteMany({ where: { organizationId: orgId } });
  await prisma.workflowAudit.deleteMany({ where: { organizationId: orgId } });
  await prisma.lifecycleHookExecution.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.patientLifecycleTransition.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.document.deleteMany({
    where: { patient: { organizationId: orgId } },
  });
  await prisma.refreshSession.deleteMany({ where: { organizationId: orgId } });

  // Unlink patient profiles before deleting patients/users
  await prisma.user.updateMany({
    where: { organizationId: orgId },
    data: { patientProfileId: null },
  });
  await prisma.patient.deleteMany({ where: { organizationId: orgId } });
  await prisma.user.deleteMany({ where: { organizationId: orgId } });
  await prisma.organization.delete({ where: { id: orgId } });
}

async function upsertUser(
  orgId: string,
  email: string,
  displayName: string,
  role: UserRole,
  passwordHash: string,
  patientProfileId?: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        displayName,
        role,
        passwordHash,
        organizationId: orgId,
        isSuspended: false,
        suspendedAt: null,
        ...(patientProfileId ? { patientProfileId } : {}),
      },
    });
  }

  return prisma.user.create({
    data: {
      email,
      displayName,
      role,
      passwordHash,
      organizationId: orgId,
      ...(patientProfileId ? { patientProfileId } : {}),
    },
  });
}

async function main() {
  const reset = process.env.SEED_RESET === 'true';
  console.log('──────────────────────────────────────────────');
  console.log(' Aarogya360 demo seed');
  console.log(` Org: ${DEMO_ORG_NAME}`);
  console.log(` Reset: ${reset}`);
  console.log('──────────────────────────────────────────────');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  // Avoid printing secrets; show host only
  try {
    const host = new URL(process.env.DATABASE_URL).host;
    console.log(` Database host: ${host}`);
  } catch {
    console.log(' Database host: (unparsed)');
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, await bcrypt.genSalt());

  let org = await prisma.organization.findFirst({
    where: { name: DEMO_ORG_NAME },
  });

  if (org && reset) {
    console.log(' Wiping existing demo organization…');
    await wipeDemoOrg(org.id);
    org = null;
  }

  if (!org) {
    org = await prisma.organization.create({
      data: { name: DEMO_ORG_NAME },
    });
    console.log(` Created organization ${org.id}`);
  } else {
    console.log(` Using existing organization ${org.id}`);
  }

  // Staff users
  const staffByKey: Record<string, { id: string; email: string; role: UserRole }> =
    {};

  for (const s of staff) {
    const user = await upsertUser(
      org.id,
      s.email,
      s.displayName,
      s.role,
      passwordHash,
    );
    const key =
      s.role === UserRole.ADMIN
        ? 'admin'
        : s.role === UserRole.CARE_COORDINATOR
          ? 'coord'
          : s.role === UserRole.DOCTOR
            ? s.email.includes('mehta')
              ? 'doctor1'
              : 'doctor2'
            : s.email.includes('reddy')
              ? 'specialist1'
              : 'specialist2';
    staffByKey[key] = { id: user.id, email: user.email, role: user.role };
    console.log(`  ✓ ${s.role.padEnd(16)} ${s.displayName} <${s.email}>`);
  }

  const doctor1 = staffByKey.doctor1;
  const doctor2 = staffByKey.doctor2;
  const specialist1 = staffByKey.specialist1;
  const specialist2 = staffByKey.specialist2;
  const admin = staffByKey.admin;
  const coord = staffByKey.coord;

  if (!doctor1 || !doctor2 || !specialist1 || !specialist2 || !admin || !coord) {
    throw new Error('Failed to create required staff users');
  }

  const patientRecords: Array<{
    seed: PatientSeed;
    patientId: string;
    userId: string;
  }> = [];

  for (let i = 0; i < patients.length; i++) {
    const p = patients[i];
    const primaryDoctorId = p.assignDoctor
      ? i % 2 === 0
        ? doctor1.id
        : doctor2.id
      : null;
    const preferredSpecialistId = p.assignSpecialist
      ? i % 2 === 0
        ? specialist1.id
        : specialist2.id
      : null;

    const fhir = buildFhirPatient(p, primaryDoctorId, preferredSpecialistId);

    let patient = await prisma.patient.findFirst({
      where: {
        organizationId: org.id,
        fhirResource: {
          path: ['identifier', '0', 'value'],
          equals: p.mrn,
        },
      },
    });

    // Fallback: find by linked user email later if JSON path unsupported
    if (!patient) {
      const linked = await prisma.user.findUnique({
        where: { email: p.email },
        select: { patientProfileId: true },
      });
      if (linked?.patientProfileId) {
        patient = await prisma.patient.findUnique({
          where: { id: linked.patientProfileId },
        });
      }
    }

    if (patient) {
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: {
          lifecycleStage: p.stage,
          fhirResource: fhir,
        },
      });
    } else {
      patient = await prisma.patient.create({
        data: {
          organizationId: org.id,
          lifecycleStage: p.stage,
          fhirResource: fhir,
        },
      });
    }

    const user = await upsertUser(
      org.id,
      p.email,
      p.displayName,
      UserRole.PATIENT,
      passwordHash,
      patient.id,
    );

    // Lifecycle transition history (for activity feed)
    if (p.stage > 1) {
      const existingTransitions = await prisma.patientLifecycleTransition.count({
        where: { patientId: patient.id },
      });
      if (existingTransitions === 0) {
        for (let stage = 1; stage < p.stage; stage++) {
          await prisma.patientLifecycleTransition.create({
            data: {
              organizationId: org.id,
              patientId: patient.id,
              actorUserId: primaryDoctorId || admin.id,
              fromStage: stage,
              toStage: stage + 1,
              reason: `Demo progression: ${p.condition}`,
              transitionType: 'MANUAL',
              createdAt: daysAgo(p.stage - stage),
            },
          });
        }
      }
    }

    patientRecords.push({
      seed: p,
      patientId: patient.id,
      userId: user.id,
    });
    console.log(
      `  ✓ PATIENT stage ${String(p.stage).padStart(2)}  ${p.displayName} (${p.city}) – ${p.condition}`,
    );
  }

  // Family members + access
  for (const rec of patientRecords) {
    const p = rec.seed;
    if (!p.familyEmail || !p.familyName) continue;

    const familyUser = await upsertUser(
      org.id,
      p.familyEmail,
      p.familyName,
      UserRole.FAMILY_MEMBER,
      passwordHash,
    );

    if (p.familyAccess) {
      const existing = await prisma.patientFamilyAccess.findUnique({
        where: {
          patientId_familyUserId: {
            patientId: rec.patientId,
            familyUserId: familyUser.id,
          },
        },
      });
      if (!existing) {
        const access = await prisma.patientFamilyAccess.create({
          data: {
            patientId: rec.patientId,
            familyUserId: familyUser.id,
            grantedByUserId: admin.id,
            accessLevel: p.familyAccess,
            status: 'ACTIVE',
            consentNote: 'Demo consent granted by patient/admin',
            expiresAt: daysFromNow(90),
          },
        });
        await prisma.familyAccessAudit.create({
          data: {
            accessId: access.id,
            actorUserId: admin.id,
            patientId: rec.patientId,
            familyUserId: familyUser.id,
            action: 'GRANTED',
            note: 'Demo seed grant',
          },
        });
      }
      console.log(
        `  ✓ FAMILY grant  ${p.familyName} → ${p.displayName} (${p.familyAccess})`,
      );
    }

    if (p.familyPendingInvite) {
      const pending = await prisma.familyAccessInvite.findFirst({
        where: {
          patientId: rec.patientId,
          familyUserId: familyUser.id,
          status: 'PENDING',
        },
      });
      if (!pending) {
        await prisma.familyAccessInvite.create({
          data: {
            organizationId: org.id,
            patientId: rec.patientId,
            familyUserId: familyUser.id,
            invitedByUserId: doctor1.id,
            accessLevel: 'FULL_UPDATES',
            consentNote: 'Please approve family portal access',
            status: 'PENDING',
            expiresAt: daysFromNow(14),
          },
        });
      }
      console.log(
        `  ✓ FAMILY invite ${p.familyName} → ${p.displayName} (PENDING)`,
      );
    }

    await prisma.notificationChannelPreference.upsert({
      where: {
        organizationId_familyUserId: {
          organizationId: org.id,
          familyUserId: familyUser.id,
        },
      },
      create: {
        organizationId: org.id,
        familyUserId: familyUser.id,
        inAppEnabled: true,
        emailEnabled: true,
        emailAddress: p.familyEmail,
      },
      update: {
        inAppEnabled: true,
        emailEnabled: true,
        emailAddress: p.familyEmail,
      },
    });
  }

  // Clinical richness for dashboard queues
  const arjun = patientRecords.find((r) => r.seed.mrn === 'SMH-1005');
  const karan = patientRecords.find((r) => r.seed.mrn === 'SMH-1007');
  const meera = patientRecords.find((r) => r.seed.mrn === 'SMH-1004');
  const rahul = patientRecords.find((r) => r.seed.mrn === 'SMH-1001');
  const fatima = patientRecords.find((r) => r.seed.mrn === 'SMH-1006');

  if (karan) {
    const event = await prisma.clinicalEvent.create({
      data: {
        organizationId: org.id,
        patientId: karan.patientId,
        actorUserId: doctor1.id,
        type: 'VITAL',
        severity: 'CRITICAL',
        title: 'Elevated BP post angioplasty',
        description: 'Home BP 168/102 mmHg reported by family',
        occurredAt: daysAgo(1),
      },
    });
    await prisma.clinicalAlert.create({
      data: {
        organizationId: org.id,
        patientId: karan.patientId,
        clinicalEventId: event.id,
        priority: 'CRITICAL',
        status: 'OPEN',
        title: 'Critical BP – review required',
        message:
          'Patient Karan Malhotra reported elevated BP. Cardiology follow-up needed within 24h.',
      },
    });
  }

  if (meera) {
    const event = await prisma.clinicalEvent.create({
      data: {
        organizationId: org.id,
        patientId: meera.patientId,
        actorUserId: doctor2.id,
        type: 'LAB',
        severity: 'WARNING',
        title: 'Pending MRI authorization',
        description: 'Payer requested additional documentation',
        occurredAt: daysAgo(2),
      },
    });
    await prisma.clinicalAlert.create({
      data: {
        organizationId: org.id,
        patientId: meera.patientId,
        clinicalEventId: event.id,
        priority: 'HIGH',
        status: 'OPEN',
        title: 'Prior-auth documentation incomplete',
        message: 'Upload clinical notes to unblock MRI prior authorization.',
      },
    });

    await prisma.priorAuthorization.create({
      data: {
        organizationId: org.id,
        patientId: meera.patientId,
        requestedByUserId: doctor2.id,
        payerName: 'Star Health Insurance',
        policyNumber: 'SHI-778812',
        status: 'IN_REVIEW',
        serviceCodes: { codes: ['MRI-LUMBAR'] },
        submittedAt: daysAgo(3),
      },
    });
  }

  if (arjun) {
    const order = await prisma.clinicalOrder.create({
      data: {
        organizationId: org.id,
        patientId: arjun.patientId,
        createdByUserId: doctor1.id,
        assignedToUserId: specialist1.id,
        type: 'CONSULTATION',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        title: 'Orthopedic consult – right knee',
        description: 'Sports injury, MRI recommended',
        dueAt: daysAgo(1),
      },
    });

    await prisma.referralHandoff.create({
      data: {
        organizationId: org.id,
        patientId: arjun.patientId,
        clinicalOrderId: order.id,
        createdByUserId: doctor1.id,
        assignedToUserId: specialist1.id,
        destinationType: 'INTERNAL_PROVIDER',
        destinationName: 'Orthopedics – Dr. Arjun Reddy',
        reason: 'Right knee pain, limited ROM',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        dueAt: daysAgo(1),
        acceptedAt: daysAgo(3),
      },
    });

    await prisma.careTask.create({
      data: {
        organizationId: org.id,
        patientId: arjun.patientId,
        clinicalOrderId: order.id,
        createdByUserId: coord.id,
        assignedToUserId: specialist1.id,
        type: 'FOLLOW_UP',
        status: 'OPEN',
        title: 'Schedule specialist follow-up slot',
        description: 'Patient prefers morning slots in Ahmedabad OPD',
        dueAt: daysAgo(2),
      },
    });
  }

  if (fatima) {
    await prisma.medicationPlan.create({
      data: {
        organizationId: org.id,
        patientId: fatima.patientId,
        prescribedByUserId: doctor2.id,
        medicationName: 'Budesonide-Formoterol inhaler',
        dosage: '160/4.5 mcg',
        frequency: '2 puffs BID',
        route: 'Inhalation',
        instructions: 'Rinse mouth after use',
        startDate: daysAgo(5),
        status: 'ACTIVE',
      },
    });

    await prisma.careTask.create({
      data: {
        organizationId: org.id,
        patientId: fatima.patientId,
        createdByUserId: doctor2.id,
        assignedToUserId: doctor2.id,
        type: 'MEDICATION_REVIEW',
        status: 'IN_PROGRESS',
        title: 'Confirm inhaler technique education',
        dueAt: daysFromNow(2),
      },
    });
  }

  if (rahul) {
    await prisma.careTask.create({
      data: {
        organizationId: org.id,
        patientId: rahul.patientId,
        createdByUserId: coord.id,
        assignedToUserId: coord.id,
        type: 'SCHEDULING',
        status: 'OPEN',
        title: 'Complete referral intake checklist',
        description: 'Collect ECG and prior reports from referring clinic',
        dueAt: daysAgo(1),
      },
    });
  }

  if (karan) {
    await prisma.familyQuestion.create({
      data: {
        organizationId: org.id,
        patientId: karan.patientId,
        askedByUserId: (
          await prisma.user.findUniqueOrThrow({
            where: { email: 'family.malhotra@aarogya360.demo' },
          })
        ).id,
        question: 'When is the next cardiology review scheduled?',
        context: 'Family noticed higher home BP readings',
        status: 'OPEN',
      },
    });
  }

  // Support tickets
  await prisma.supportTicket.create({
    data: {
      organizationId: org.id,
      createdByUserId: doctor1.id,
      assignedToUserId: admin.id,
      category: 'CLINICAL_WORKFLOW',
      priority: 'HIGH',
      status: 'OPEN',
      subject: 'Referral SLA alerts not notifying specialist pool',
      messages: {
        create: {
          senderUserId: doctor1.id,
          body: 'Demo ticket: specialists say they miss escalated referral handoffs.',
        },
      },
    },
  });

  await prisma.supportTicket.create({
    data: {
      organizationId: org.id,
      createdByUserId: coord.id,
      category: 'ACCOUNT_LOGIN',
      priority: 'NORMAL',
      status: 'IN_REVIEW',
      subject: 'Need second care coordinator seat for evening shift',
      messages: {
        create: {
          senderUserId: coord.id,
          body: 'Please provision access for evening OPD coordinator.',
        },
      },
    },
  });

  // Demo leads (landing page pipeline)
  const leadCount = await prisma.demoLead.count({
    where: { email: { endsWith: '@clinic-demo.in' } },
  });
  if (leadCount === 0) {
    await prisma.demoLead.createMany({
      data: [
        {
          name: 'Dr. Suresh Kulkarni',
          org: 'Kulkarni Heart Centre',
          role: 'Medical Director',
          email: 'suresh@kulkarni-heart.clinic-demo.in',
          phone: '+91-98220-11111',
          message: 'Interested in lifecycle coordination for cath-lab patients.',
          status: 'NEW',
          source: 'landing_page',
        },
        {
          name: 'Nisha Agarwal',
          org: 'Agarwal Family Clinics',
          role: 'Operations Head',
          email: 'nisha@agarwal-clinics.clinic-demo.in',
          phone: '+91-98111-22222',
          message: 'Need family portal and consent workflows for multi-city OPDs.',
          status: 'CONTACTED',
          source: 'landing_page',
        },
        {
          name: 'Farhan Siddiqui',
          org: 'CityCare Diagnostics',
          role: 'CEO',
          email: 'farhan@citycare.clinic-demo.in',
          phone: '+91-99000-33333',
          message: 'Demo request for document OCR + referral handoffs.',
          status: 'QUALIFIED',
          source: 'landing_page',
        },
      ],
    });
  }

  // Sample workflow audits for activity feed
  if (arjun) {
    await prisma.workflowAudit.create({
      data: {
        organizationId: org.id,
        patientId: arjun.patientId,
        actorUserId: doctor1.id,
        action: 'ORDER_CREATED',
        entityType: 'ORDER',
        entityId: arjun.patientId,
        note: 'Demo: orthopedic referral order created',
      },
    });
  }

  // Failed document sample (shows in admin cleanup queue)
  if (meera) {
    const failed = await prisma.document.findFirst({
      where: { patientId: meera.patientId, status: 'FAILED' },
    });
    if (!failed) {
      await prisma.document.create({
        data: {
          patientId: meera.patientId,
          filePath: '/tmp/demo/meera-mri-order-failed.pdf',
          type: 'IMAGING_ORDER',
          status: 'FAILED',
          metadata: {
            note: 'Demo seed – simulated OCR failure',
            reason: 'Unreadable scan',
          },
        },
      });
    }
  }

  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log(' Demo seed complete');
  console.log('══════════════════════════════════════════════');
  console.log(` Organization : ${DEMO_ORG_NAME}`);
  console.log(` Password     : ${DEMO_PASSWORD}  (all users)`);
  console.log('');
  console.log(' Staff logins');
  for (const s of staff) {
    console.log(`  ${s.role.padEnd(16)} ${s.email}`);
  }
  console.log('');
  console.log(' Patient logins (stage in parentheses)');
  for (const p of patients) {
    console.log(`  (S${String(p.stage).padStart(2)}) ${p.email}  – ${p.displayName}`);
  }
  console.log('');
  console.log(' Family logins');
  for (const p of patients.filter((x) => x.familyEmail)) {
    console.log(`  ${p.familyEmail}  – ${p.familyName} → ${p.displayName}`);
  }
  console.log('');
  console.log(' Suggested demo path:');
  console.log('  1. Login admin.demo@aarogya360.demo → Operations dashboard');
  console.log('  2. Login dr.mehta@aarogya360.demo → caseload / patient chart');
  console.log('  3. Login patient.karan@aarogya360.demo → care journey');
  console.log('  4. Login family.malhotra@aarogya360.demo → family view');
  console.log('══════════════════════════════════════════════');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
