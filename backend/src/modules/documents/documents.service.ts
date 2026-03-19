import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { extname } from 'path';
import { PDFParse } from 'pdf-parse';
import { DocumentStorageService } from './document-storage.service';
import { DocumentOcrService } from './document-ocr.service';
import { DocumentIntelligenceService } from './document-intelligence.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private documentStorageService: DocumentStorageService,
    private documentOcrService: DocumentOcrService,
    private documentIntelligenceService: DocumentIntelligenceService,
  ) {}

  async create(orgId: string, patientId: string, file: Express.Multer.File) {
    await this.ensurePatientInOrganization(patientId, orgId);

    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Invalid file upload');
    }

    const storedUpload = await this.documentStorageService.storeUploadedFile(
      patientId,
      file,
    );

    const document = await this.prisma.document.create({
      data: {
        patientId,
        type: storedUpload.mimeType,
        filePath: storedUpload.reference,
        status: 'PROCESSING',
        metadata: {
          originalFileName: storedUpload.originalName,
          uploadedMimeType: storedUpload.mimeType,
          sizeBytes: storedUpload.sizeBytes,
          storageRef: storedUpload.reference,
        },
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
      let extractedText: string | null = null;
      let extractionMethod:
        | 'PDF_TEXT'
        | 'TEXT_FILE'
        | 'IMAGE_OCR'
        | 'BINARY_STORED' = 'BINARY_STORED';
      let ocrConfidence: number | null = null;
      let extractionEngine: string | null = null;
      const fileBuffer = await this.documentStorageService.readFileBuffer(
        doc.filePath,
      );

      if (this.isPdfFile(doc.filePath, doc.type)) {
        extractedText = await this.extractPdfText(fileBuffer);
        extractionMethod = 'PDF_TEXT';
        extractionEngine = 'pdf-parse';
      } else if (this.isTextFile(doc.filePath, doc.type)) {
        extractedText = fileBuffer.toString('utf8');
        extractionMethod = 'TEXT_FILE';
        extractionEngine = 'native-text';
      } else if (this.isImageFile(doc.filePath, doc.type)) {
        const ocr =
          await this.documentOcrService.extractTextFromImage(fileBuffer);
        if (ocr?.text) {
          extractedText = ocr.text;
          extractionMethod = 'IMAGE_OCR';
          extractionEngine = ocr.engine;
          ocrConfidence = ocr.confidence;
        }
      }

      const normalizedExtractedText =
        this.normalizeExtractedText(extractedText);
      if (normalizedExtractedText) {
        const structuredExtraction =
          await this.documentIntelligenceService.extractStructuredClinicalData(
            normalizedExtractedText,
          );

        await this.prisma.document.update({
          where: { id: documentId },
          data: {
            metadata: this.mergeMetadata(doc.metadata, {
              processing: 'TEXT_EXTRACTED',
              extractionMethod,
              extractionEngine: extractionEngine || structuredExtraction.engine,
              searchableText: normalizedExtractedText.slice(0, 30000),
              searchableTextLength: normalizedExtractedText.length,
              ocrConfidence,
              structuredExtraction: structuredExtraction.data,
              processedAt: new Date().toISOString(),
            }) as Prisma.InputJsonValue,
            status: 'COMPLETED',
          },
        });
      } else {
        await this.prisma.document.update({
          where: { id: documentId },
          data: {
            status: 'COMPLETED',
            metadata: this.mergeMetadata(doc.metadata, {
              processing: 'BINARY_STORED',
              message:
                'Binary file stored successfully. OCR/text extraction not available for this file.',
              mimeType: doc.type,
              sizeBytes: fileBuffer.length,
              extractionMethod,
              extractionEngine,
              ocrConfidence,
              processedAt: new Date().toISOString(),
            }) as Prisma.InputJsonValue,
          },
        });
      }

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
        data: {
          status: 'FAILED',
          metadata: this.mergeMetadata(doc.metadata, {
            processing: 'FAILED',
            error:
              error instanceof Error
                ? error.message
                : 'Unknown document processing error',
          }) as Prisma.InputJsonValue,
        },
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

  async getDocumentDownload(
    orgId: string,
    documentId: string,
    patientId?: string,
  ): Promise<{ filePath: string; contentType: string; fileName: string }> {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        patient: {
          organizationId: orgId,
          ...(patientId ? { id: patientId } : {}),
        },
      },
      select: {
        id: true,
        type: true,
        filePath: true,
        patientId: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const download = this.documentStorageService.resolveDownload(
      document.filePath,
    );

    const extension = extname(document.filePath);
    const safeExtension = extension && extension.length <= 8 ? extension : '';

    return {
      filePath: download.absolutePath,
      contentType: document.type || 'application/octet-stream',
      fileName: `report-${document.patientId.slice(0, 8)}-${document.id.slice(0, 8)}${safeExtension}`,
    };
  }

  private isPdfFile(filePath: string, mimeType: string): boolean {
    const normalizedMimeType = mimeType.toLowerCase();
    return (
      normalizedMimeType === 'application/pdf' ||
      normalizedMimeType.endsWith('/pdf') ||
      extname(filePath).toLowerCase() === '.pdf'
    );
  }

  private isTextFile(filePath: string, mimeType: string): boolean {
    const normalizedMimeType = (mimeType || '').toLowerCase();
    if (normalizedMimeType.startsWith('text/')) {
      return true;
    }

    if (
      normalizedMimeType.includes('json') ||
      normalizedMimeType.includes('xml') ||
      normalizedMimeType.includes('csv')
    ) {
      return true;
    }

    const extension = extname(filePath).toLowerCase();
    return ['.txt', '.md', '.json', '.xml', '.csv'].includes(extension);
  }

  private isImageFile(filePath: string, mimeType: string): boolean {
    const normalizedMimeType = String(mimeType || '').toLowerCase();
    if (normalizedMimeType.startsWith('image/')) {
      return true;
    }

    const extension = extname(filePath).toLowerCase();
    return [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.heic',
      '.heif',
      '.bmp',
      '.tiff',
      '.tif',
    ].includes(extension);
  }

  private async extractPdfText(dataBuffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: dataBuffer });

    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  private mergeMetadata(
    existing: unknown,
    patch: Record<string, unknown>,
  ): Record<string, unknown> {
    const base =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? (existing as Record<string, unknown>)
        : {};

    return {
      ...base,
      ...patch,
    };
  }

  private normalizeExtractedText(value: string | null): string | null {
    if (!value) return null;
    const normalized = value
      .split('\0')
      .join(' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return normalized.length >= 8 ? normalized : null;
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
