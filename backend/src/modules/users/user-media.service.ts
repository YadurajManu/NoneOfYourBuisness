import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { dirname, extname, join, resolve } from 'path';

const AVATAR_REF_PREFIX = 'avatar-local://';

type StoredAvatar = {
  reference: string;
  mimeType: string;
};

@Injectable()
export class UserMediaService {
  private readonly localRoot: string;

  constructor(private readonly configService: ConfigService) {
    this.localRoot = resolve(
      this.configService.get<string>('USER_MEDIA_LOCAL_DIR') ||
        './data/user-media',
    );
  }

  async storeAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<StoredAvatar> {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded avatar is empty');
    }

    const extension = this.resolveExtension(file);
    const key = join(
      'avatars',
      userId,
      `${Date.now()}-${randomBytes(6).toString('hex')}${extension}`,
    );

    const absolutePath = resolve(this.localRoot, key);
    await fs.mkdir(dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.buffer);

    return {
      reference: `${AVATAR_REF_PREFIX}${key}`,
      mimeType: file.mimetype || 'application/octet-stream',
    };
  }

  resolveAvatar(reference: string) {
    const absolutePath = this.resolveLocalPath(reference);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Avatar file not found');
    }
    return { absolutePath };
  }

  private resolveLocalPath(reference: string) {
    if (reference.startsWith(AVATAR_REF_PREFIX)) {
      return resolve(this.localRoot, reference.slice(AVATAR_REF_PREFIX.length));
    }
    if (reference.startsWith('/')) {
      return reference;
    }
    return resolve(reference);
  }

  private resolveExtension(file: Express.Multer.File) {
    const fromName = extname(file.originalname || '').toLowerCase();
    if (fromName) return fromName;

    switch ((file.mimetype || '').toLowerCase()) {
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
      default:
        return '.img';
    }
  }
}
