import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { recognize } from 'tesseract.js';

export type OcrExtractionResult = {
  text: string;
  confidence: number | null;
  engine: string;
};

const DEFAULT_OCR_TIMEOUT_MS = 45_000;

@Injectable()
export class DocumentOcrService {
  private readonly logger = new Logger(DocumentOcrService.name);
  private readonly enabled: boolean;
  private readonly language: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    const rawEnabled =
      this.configService.get<string>('DOCUMENT_OCR_ENABLED') ?? 'true';
    this.enabled = String(rawEnabled).toLowerCase() !== 'false';

    this.language =
      this.configService.get<string>('DOCUMENT_OCR_LANGUAGE') || 'eng';

    const rawTimeout = Number(
      this.configService.get<string>('DOCUMENT_OCR_TIMEOUT_MS') ||
        DEFAULT_OCR_TIMEOUT_MS,
    );
    this.timeoutMs =
      Number.isFinite(rawTimeout) && rawTimeout > 0
        ? Math.floor(rawTimeout)
        : DEFAULT_OCR_TIMEOUT_MS;
  }

  async extractTextFromImage(
    imageBuffer: Buffer,
  ): Promise<OcrExtractionResult | null> {
    if (!this.enabled) {
      return null;
    }

    if (!imageBuffer?.length) {
      return null;
    }

    try {
      const recognition = (await this.withTimeout(
        recognize(imageBuffer, this.language),
      )) as {
        data?: {
          text?: string;
          confidence?: number;
        };
      };

      const text = String(recognition?.data?.text || '')
        .replace(/\r/g, '')
        .trim();

      if (!text) {
        return null;
      }

      const confidence = Number(recognition?.data?.confidence);
      return {
        text,
        confidence: Number.isFinite(confidence) ? confidence : null,
        engine: `tesseract.js:${this.language}`,
      };
    } catch (error) {
      this.logger.warn(
        `OCR extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new Error(
            `OCR extraction timed out after ${Math.floor(this.timeoutMs / 1000)} seconds`,
          ),
        );
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
}
