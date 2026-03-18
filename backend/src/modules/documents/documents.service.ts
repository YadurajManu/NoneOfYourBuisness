import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AIService } from '../ai/ai.service';
import * as fs from 'fs';
import { extname } from 'path';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
  ) {}

  async create(patientId: string, file: Express.Multer.File) {
    const document = await this.prisma.document.create({
      data: {
        patientId,
        type: file.mimetype || 'application/octet-stream',
        filePath: file.path,
        status: 'PROCESSING',
      },
    });

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

      this.logger.log(`Document ${documentId} processed successfully.`);
    } catch (error) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  async findAllByPatient(patientId: string) {
    return this.prisma.document.findMany({
      where: { patientId },
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
}
