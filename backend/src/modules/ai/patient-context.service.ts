import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface PatientContext {
  patientId: string;
  displayName: string;
  demographics: {
    gender?: string | null;
    birthDate?: string | null;
    age?: number | null;
  };
  lifecycleStage: number;
  lifecycleStageLabel: string;
  openAlerts: Array<{ priority: string; title: string; message: string }>;
  activeMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    route?: string | null;
    instructions?: string | null;
  }>;
  activeOrders: Array<{
    type: string;
    priority: string;
    status: string;
    title: string;
    dueAt?: string | null;
  }>;
  openTasks: Array<{
    type: string;
    status: string;
    title: string;
    dueAt?: string | null;
  }>;
  recentEvents: Array<{
    severity: string;
    type: string;
    title: string;
    description?: string | null;
    occurredAt: string;
  }>;
  documents: Array<{
    type: string;
    status: string;
    reportType?: string | null;
    summary?: string | null;
    diagnoses: string[];
    medications: string[];
    criticalFlags: string[];
    createdAt: string;
  }>;
}

const LIFECYCLE_STAGE_LABELS: Record<number, string> = {
  1: 'Pre-Arrival & Referral',
  2: 'Registration & Intake',
  3: 'Triage & Assessment',
  4: 'Diagnosis & Care Planning',
  5: 'Active Treatment',
  6: 'Monitoring & Response',
  7: 'Stabilization',
  8: 'Discharge Planning',
  9: 'Discharge & Handoff',
  10: 'Post-Discharge & Follow-Up',
};

type FhirName = { text?: string; given?: string[]; family?: string };

@Injectable()
export class PatientContextService {
  constructor(private readonly prisma: PrismaService) {}

  stageLabel(stage: number): string {
    return LIFECYCLE_STAGE_LABELS[stage] ?? `Stage ${stage}`;
  }

  private resolveName(fhirResource: unknown, fallbackId: string): string {
    const resource = (fhirResource ?? {}) as { name?: FhirName[] };
    const primary = Array.isArray(resource.name) ? resource.name[0] : undefined;
    if (primary) {
      if (typeof primary.text === 'string' && primary.text.trim()) {
        return primary.text.trim();
      }
      const given = Array.isArray(primary.given)
        ? primary.given.join(' ').trim()
        : '';
      const family = typeof primary.family === 'string' ? primary.family : '';
      const full = [given, family].filter(Boolean).join(' ').trim();
      if (full) return full;
    }
    return `Patient ${fallbackId.slice(0, 8)}`;
  }

  private computeAge(birthDate?: string | null): number | null {
    if (!birthDate) return null;
    const dob = new Date(birthDate);
    if (Number.isNaN(dob.getTime())) return null;
    const diff = Date.now() - dob.getTime();
    const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    return age >= 0 && age < 150 ? age : null;
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .slice(0, 8);
  }

  async build(orgId: string, patientId: string): Promise<PatientContext> {
    const [patient, alerts, medications, orders, tasks, events, documents] =
      await Promise.all([
        this.prisma.patient.findFirst({
          where: { id: patientId, organizationId: orgId },
          select: { id: true, fhirResource: true, lifecycleStage: true },
        }),
        this.prisma.clinicalAlert.findMany({
          where: { patientId, organizationId: orgId, status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { priority: true, title: true, message: true },
        }),
        this.prisma.medicationPlan.findMany({
          where: { patientId, organizationId: orgId, status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 20,
          select: {
            medicationName: true,
            dosage: true,
            frequency: true,
            route: true,
            instructions: true,
          },
        }),
        this.prisma.clinicalOrder.findMany({
          where: {
            patientId,
            organizationId: orgId,
            status: { in: ['ACTIVE', 'IN_PROGRESS'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: {
            type: true,
            priority: true,
            status: true,
            title: true,
            dueAt: true,
          },
        }),
        this.prisma.careTask.findMany({
          where: {
            patientId,
            organizationId: orgId,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: { type: true, status: true, title: true, dueAt: true },
        }),
        this.prisma.clinicalEvent.findMany({
          where: { patientId, organizationId: orgId },
          orderBy: { occurredAt: 'desc' },
          take: 15,
          select: {
            severity: true,
            type: true,
            title: true,
            description: true,
            occurredAt: true,
          },
        }),
        this.prisma.document.findMany({
          where: { patientId, patient: { organizationId: orgId } },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: {
            type: true,
            status: true,
            metadata: true,
            createdAt: true,
          },
        }),
      ]);

    if (!patient) {
      throw new Error('Patient not found for context building');
    }

    const fhir = (patient.fhirResource ?? {}) as {
      gender?: string;
      birthDate?: string;
    };

    return {
      patientId: patient.id,
      displayName: this.resolveName(patient.fhirResource, patient.id),
      demographics: {
        gender: fhir.gender ?? null,
        birthDate: fhir.birthDate ?? null,
        age: this.computeAge(fhir.birthDate),
      },
      lifecycleStage: patient.lifecycleStage,
      lifecycleStageLabel: this.stageLabel(patient.lifecycleStage),
      openAlerts: alerts.map((a) => ({
        priority: a.priority,
        title: a.title,
        message: a.message,
      })),
      activeMedications: medications.map((m) => ({
        name: m.medicationName,
        dosage: m.dosage,
        frequency: m.frequency,
        route: m.route,
        instructions: m.instructions,
      })),
      activeOrders: orders.map((o) => ({
        type: o.type,
        priority: o.priority,
        status: o.status,
        title: o.title,
        dueAt: o.dueAt ? o.dueAt.toISOString() : null,
      })),
      openTasks: tasks.map((t) => ({
        type: t.type,
        status: t.status,
        title: t.title,
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
      })),
      recentEvents: events.map((e) => ({
        severity: e.severity,
        type: e.type,
        title: e.title,
        description: e.description,
        occurredAt: e.occurredAt.toISOString(),
      })),
      documents: documents.map((d) => {
        const meta = (d.metadata ?? {}) as Record<string, unknown>;
        return {
          type: d.type,
          status: d.status,
          reportType:
            typeof meta.reportType === 'string' ? meta.reportType : null,
          summary: typeof meta.summary === 'string' ? meta.summary : null,
          diagnoses: this.asStringArray(meta.diagnoses),
          medications: this.asStringArray(meta.medications),
          criticalFlags: this.asStringArray(meta.criticalFlags),
          createdAt: d.createdAt.toISOString(),
        };
      }),
    };
  }

  /** Render the structured context as a compact block for the LLM system prompt. */
  render(context: PatientContext): string {
    const lines: string[] = [];
    const { demographics } = context;
    const demo = [
      demographics.age != null ? `${demographics.age}y` : null,
      demographics.gender || null,
    ]
      .filter(Boolean)
      .join(', ');

    lines.push(`PATIENT: ${context.displayName}${demo ? ` (${demo})` : ''}`);
    lines.push(
      `LIFECYCLE STAGE: ${context.lifecycleStage}/10 — ${context.lifecycleStageLabel}`,
    );

    if (context.openAlerts.length) {
      lines.push('\nOPEN CLINICAL ALERTS:');
      for (const a of context.openAlerts) {
        lines.push(`- [${a.priority}] ${a.title}: ${a.message}`);
      }
    }

    if (context.activeMedications.length) {
      lines.push('\nACTIVE MEDICATIONS:');
      for (const m of context.activeMedications) {
        const route = m.route ? ` ${m.route}` : '';
        const instr = m.instructions ? ` — ${m.instructions}` : '';
        lines.push(`- ${m.name} ${m.dosage}, ${m.frequency}${route}${instr}`);
      }
    }

    if (context.activeOrders.length) {
      lines.push('\nACTIVE ORDERS:');
      for (const o of context.activeOrders) {
        const due = o.dueAt ? ` (due ${o.dueAt.slice(0, 10)})` : '';
        lines.push(`- [${o.priority}] ${o.type}: ${o.title}${due}`);
      }
    }

    if (context.openTasks.length) {
      lines.push('\nOPEN CARE TASKS:');
      for (const t of context.openTasks) {
        const due = t.dueAt ? ` (due ${t.dueAt.slice(0, 10)})` : '';
        lines.push(`- ${t.type}: ${t.title}${due}`);
      }
    }

    if (context.recentEvents.length) {
      lines.push('\nRECENT CLINICAL EVENTS:');
      for (const e of context.recentEvents) {
        const when = e.occurredAt.slice(0, 10);
        const desc = e.description ? ` — ${e.description}` : '';
        lines.push(`- ${when} [${e.severity}] ${e.title}${desc}`);
      }
    }

    if (context.documents.length) {
      lines.push('\nUPLOADED REPORTS (AI-extracted):');
      for (const d of context.documents) {
        const bits: string[] = [];
        if (d.reportType) bits.push(d.reportType);
        if (d.summary) bits.push(d.summary);
        if (d.diagnoses.length)
          bits.push(`Diagnoses: ${d.diagnoses.join('; ')}`);
        if (d.medications.length)
          bits.push(`Meds: ${d.medications.join('; ')}`);
        if (d.criticalFlags.length)
          bits.push(`Flags: ${d.criticalFlags.join('; ')}`);
        lines.push(
          `- ${d.createdAt.slice(0, 10)} ${d.type} [${d.status}]${
            bits.length ? `: ${bits.join(' | ')}` : ''
          }`,
        );
      }
    }

    return lines.join('\n');
  }
}
