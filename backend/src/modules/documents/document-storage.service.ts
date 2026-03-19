import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { dirname, extname, join, resolve } from 'path';

const LOCAL_REFERENCE_PREFIX = 'local://';

type StoredUpload = {
  reference: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
};

@Injectable()
export class DocumentStorageService {
  private readonly driver: string;
  private readonly localRoot: string;

  constructor(private readonly configService: ConfigService) {
    this.driver = (
      this.configService.get<string>('DOCUMENT_STORAGE_DRIVER') || 'local'
    ).toLowerCase();

    this.localRoot = resolve(
      this.configService.get<string>('DOCUMENT_STORAGE_LOCAL_DIR') ||
        './data/uploads',
    );
  }

  async storeUploadedFile(
    patientId: string,
    file: Express.Multer.File,
  ): Promise<StoredUpload> {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    if (this.driver !== 'local') {
      throw new InternalServerErrorException(
        `Unsupported storage driver '${this.driver}'. Configure DOCUMENT_STORAGE_DRIVER=local until cloud driver is implemented.`,
      );
    }

    const extension = this.resolveExtension(file);
    const now = new Date();
    const relativeKey = join(
      patientId,
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0'),
      `${now.getTime()}-${randomBytes(8).toString('hex')}${extension}`,
    );

    const absolutePath = resolve(this.localRoot, relativeKey);
    await fs.mkdir(dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.buffer);

    return {
      reference: `${LOCAL_REFERENCE_PREFIX}${relativeKey}`,
      mimeType: file.mimetype || 'application/octet-stream',
      originalName: file.originalname || 'report',
      sizeBytes: file.size ?? file.buffer.length,
    };
  }

  async readFileBuffer(reference: string): Promise<Buffer> {
    const absolutePath = this.resolveLocalPath(reference);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Stored document file not found');
    }

    return fs.readFile(absolutePath);
  }

  resolveDownload(reference: string) {
    const absolutePath = this.resolveLocalPath(reference);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Document file is not available');
    }

    return { absolutePath };
  }

  private resolveLocalPath(reference: string) {
    if (reference.startsWith(LOCAL_REFERENCE_PREFIX)) {
      const key = reference.slice(LOCAL_REFERENCE_PREFIX.length);
      return resolve(this.localRoot, key);
    }

    // Backward compatibility for legacy absolute/relative file paths.
    if (reference.startsWith('/')) {
      return reference;
    }

    return resolve(reference);
  }

  private resolveExtension(file: Express.Multer.File) {
    const fromName = extname(file.originalname || '').toLowerCase();

    if (fromName) {
      return fromName;
    }

    switch ((file.mimetype || '').toLowerCase()) {
      case 'application/pdf':
        return '.pdf';
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/heic':
        return '.heic';
      case 'image/heif':
        return '.heif';
      case 'text/plain':
        return '.txt';
      case 'text/csv':
        return '.csv';
      case 'application/json':
        return '.json';
      default:
        return '.bin';
    }
  }
}
