import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AIService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as fs from 'fs';
import { extname } from 'path';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    private notificationsService: NotificationsService,
  ) {}

  async create(orgId: string, patientId: string, file: Express.Multer.File) {
    await this.ensurePatientInOrganization(patientId, orgId);

    if (!file.path) {
      throw new BadRequestException('Invalid file upload');
    }

    const document = await this.prisma.document.create({
      data: {
        patientId,
        type: file.mimetype || 'application/octet-stream',
        filePath: file.path,
        status: 'PROCESSING',
      },
    });

    await this.notificationsService.emitToPatientFamily(
      orgId,
      patientId,
      NotificationType.DOCUMENT_UPLOADED,
      {
        documentId: document.id,
        type: document.type,
        status: document.status,
      },
    );

    // Fire and forget processing to keep API responsive
    this.processDocument(document.id).catch((err: unknown) => {
      this.logger.error(
        `Error processing document ${document.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    });

    return document;
  }

  async processDocument(documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        patient: {
          select: {
            organizationId: true,
          },
        },
      },
    });
    if (!doc) return;

    try {
      let extractedText = '';

      if (this.isPdfFile(doc.filePath, doc.type)) {
        extractedText = await this.extractPdfText(doc.filePath);
      } else {
        // Fallback for text files or simple extraction
        extractedText = fs.readFileSync(doc.filePath, 'utf8');
      }

      // Use AI to summarize and classify the clinical data
      const aiResponse = await this.aiService.chat([
        {
          role: 'system',
          content:
            'You are a clinical document parser. Extract the diagnosis, medications, and clinical summary from the following text into a structured JSON format.',
        },
        { role: 'user', content: extractedText },
      ]);

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          metadata: aiResponse.content,
          status: 'COMPLETED',
        },
      });

      await this.notificationsService.emitToPatientFamily(
        doc.patient.organizationId,
        doc.patientId,
        NotificationType.DOCUMENT_PROCESSED,
        {
          documentId,
          type: doc.type,
          status: 'COMPLETED',
        },
      );

      this.logger.log(`Document ${documentId} processed successfully.`);
    } catch (error) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED' },
      });

      await this.notificationsService.emitToPatientFamily(
        doc.patient.organizationId,
        doc.patientId,
        NotificationType.DOCUMENT_FAILED,
        {
          documentId,
          type: doc.type,
          status: 'FAILED',
        },
      );
      throw error;
    }
  }

  async findAllByPatient(orgId: string, patientId: string) {
    await this.ensurePatientInOrganization(patientId, orgId);

    return this.prisma.document.findMany({
      where: {
        patientId,
        patient: {
          organizationId: orgId,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private isPdfFile(filePath: string, mimeType: string): boolean {
    const normalizedMimeType = mimeType.toLowerCase();
    return (
      normalizedMimeType === 'application/pdf' ||
      normalizedMimeType.endsWith('/pdf') ||
      extname(filePath).toLowerCase() === '.pdf'
    );
  }

  private async extractPdfText(filePath: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });

    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  private async ensurePatientInOrganization(
    patientId: string,
    orgId: string,
  ): Promise<void> {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId: orgId,
      },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
  }
}
