import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import QRCode from 'qrcode';
import { UserMediaService } from './user-media.service';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private userMediaService: UserMediaService,
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { organization: true, patientProfile: true },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { organization: true, patientProfile: true },
    });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    role: UserRole;
    organizationId: string;
    patientProfileId?: string;
    displayName?: string;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  async listByOrganization(orgId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        avatarPath: true,
        avatarUpdatedAt: true,
        isSuspended: true,
        suspendedAt: true,
        createdAt: true,
        updatedAt: true,
        patientProfileId: true,
      },
    });

    return users.map((user) => this.mapUserForPortal(user));
  }

  async listActiveSpecialistsByOrganization(orgId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: UserRole.SPECIALIST,
        isSuspended: false,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        avatarPath: true,
        avatarUpdatedAt: true,
        createdAt: true,
      },
    });

    return users.map((user) => this.mapUserForPortal(user));
  }

  async listActiveDoctorsByOrganization(orgId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: UserRole.DOCTOR,
        isSuspended: false,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        avatarPath: true,
        avatarUpdatedAt: true,
        createdAt: true,
      },
    });

    return users.map((user) => this.mapUserForPortal(user));
  }

  async updateRole(userId: string, orgId: string, role: UserRole) {
    return this.prisma.user.updateMany({
      where: {
        id: userId,
        organizationId: orgId,
      },
      data: { role },
    });
  }

  async setSuspended(userId: string, orgId: string, suspended: boolean) {
    return this.prisma.user.updateMany({
      where: {
        id: userId,
        organizationId: orgId,
      },
      data: {
        isSuspended: suspended,
        suspendedAt: suspended ? new Date() : null,
      },
    });
  }

  async createWithOrganization(
    orgName: string,
    adminEmail: string,
    passwordHash: string,
  ) {
    return this.prisma.organization.create({
      data: {
        name: orgName,
        users: {
          create: {
            email: adminEmail,
            passwordHash,
            role: UserRole.ADMIN,
            displayName: orgName,
          },
        },
      },
      include: {
        users: true,
      },
    });
  }

  async getMyProfile(orgId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: orgId,
        isSuspended: false,
      },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        avatarPath: true,
        avatarUpdatedAt: true,
        organizationId: true,
        organization: {
          select: { name: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return {
      ...this.mapUserForPortal(user),
      organization: user.organization.name,
    };
  }

  async updateMyProfile(orgId: string, userId: string, dto: UpdateMyProfileDto) {
    const result = await this.prisma.user.updateMany({
      where: {
        id: userId,
        organizationId: orgId,
        isSuspended: false,
      },
      data: {
        displayName: dto.displayName?.trim() || null,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('User profile not found');
    }

    return this.getMyProfile(orgId, userId);
  }

  async updateMyAvatar(
    orgId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: orgId,
        isSuspended: false,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const avatar = await this.userMediaService.storeAvatar(user.id, file);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        avatarPath: avatar.reference,
        avatarMimeType: avatar.mimeType,
        avatarUpdatedAt: new Date(),
      },
    });

    return this.getMyProfile(orgId, userId);
  }

  async getAvatarFileForUser(
    requesterOrgId: string,
    requesterUserId: string,
    targetUserId: string,
  ) {
    const requester = await this.prisma.user.findFirst({
      where: {
        id: requesterUserId,
        organizationId: requesterOrgId,
        isSuspended: false,
      },
      select: { id: true },
    });

    if (!requester) {
      throw new ForbiddenException('Requester account is not active');
    }

    const target = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        organizationId: requesterOrgId,
      },
      select: {
        id: true,
        avatarPath: true,
        avatarMimeType: true,
      },
    });

    if (!target?.avatarPath) {
      throw new NotFoundException('Avatar not available');
    }

    const resolved = this.userMediaService.resolveAvatar(target.avatarPath);
    return {
      absolutePath: resolved.absolutePath,
      contentType: target.avatarMimeType || 'application/octet-stream',
    };
  }

  async getAvatarFileForPublic(targetUserId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        avatarPath: true,
        avatarMimeType: true,
      },
    });

    if (!target?.avatarPath) {
      throw new NotFoundException('Avatar not available');
    }

    const resolved = this.userMediaService.resolveAvatar(target.avatarPath);
    return {
      absolutePath: resolved.absolutePath,
      contentType: target.avatarMimeType || 'application/octet-stream',
    };
  }

  verifyAvatarSignature(userId: string, exp: number, signature: string) {
    if (!userId || !signature || !Number.isFinite(exp)) {
      return false;
    }
    if (exp < Date.now()) {
      return false;
    }

    const expected = this.signAvatarToken(userId, exp);
    const providedBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  }

  async getMyVirtualCard(orgId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: orgId,
        isSuspended: false,
      },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        avatarPath: true,
        avatarUpdatedAt: true,
        organizationId: true,
        organization: {
          select: { name: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const roleTheme = this.roleTheme(user.role);
    const issuedAt = new Date().toISOString();
    const basePayload = {
      version: 1,
      type: 'AAROGYA360_USER_CARD',
      userId: user.id,
      orgId: user.organizationId,
      role: user.role,
      email: user.email,
      issuedAt,
    };
    const payloadString = JSON.stringify(basePayload);
    const signature = createHmac(
      'sha256',
      this.configService.get<string>('JWT_SECRET') || 'dev-secret',
    )
      .update(payloadString)
      .digest('hex')
      .slice(0, 24);
    const qrPayload = JSON.stringify({
      ...basePayload,
      sig: signature,
    });

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
      color: {
        dark: roleTheme.primary,
        light: '#F7FCFF',
      },
    });

    return {
      cardId: `A360-${user.role}-${user.id.slice(0, 8).toUpperCase()}`,
      holderName: user.displayName || this.emailToName(user.email),
      email: user.email,
      role: user.role,
      organization: user.organization.name,
      avatarUrl: this.avatarUrl(user.id, user.avatarPath, user.avatarUpdatedAt),
      roleTheme,
      issuedAt,
      qrDataUrl,
      qrPayload,
    };
  }

  toPortalUserView(user: {
    id: string;
    email: string;
    role: string;
    orgId: string;
    organization: string;
    patientProfileId?: string | null;
    displayName?: string | null;
    avatarPath?: string | null;
    avatarUpdatedAt?: Date | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      organization: user.organization,
      patientProfileId: user.patientProfileId ?? null,
      displayName: user.displayName || null,
      avatarUrl: this.avatarUrl(
        user.id,
        user.avatarPath || null,
        user.avatarUpdatedAt || null,
      ),
    };
  }

  toPortalDirectoryUser<T extends Record<string, unknown>>(user: T) {
    return this.mapUserForPortal(user);
  }

  private avatarUrl(
    userId: string,
    avatarPath: string | null | undefined,
    avatarUpdatedAt?: Date | null,
  ) {
    if (!avatarPath) return null;
    const version = avatarUpdatedAt ? avatarUpdatedAt.getTime() : Date.now();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const sig = this.signAvatarToken(userId, expiresAt);
    const apiBase = this.publicApiBase();
    return `${apiBase}/users/avatar/${userId}?v=${version}&exp=${expiresAt}&sig=${sig}`;
  }

  private publicApiBase() {
    const configured = (
      this.configService.get<string>('PUBLIC_API_BASE_URL') || ''
    ).trim();

    if (!configured) {
      return '/api';
    }

    const normalized = configured.replace(/\/+$/, '');
    return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
  }

  private signAvatarToken(userId: string, exp: number) {
    return createHmac(
      'sha256',
      this.configService.get<string>('JWT_SECRET') || 'dev-secret',
    )
      .update(`${userId}.${exp}`)
      .digest('hex');
  }

  private mapUserForPortal<T extends Record<string, unknown>>(user: T) {
    const userId = String(user.id || '');
    const avatarPath =
      typeof user.avatarPath === 'string' ? user.avatarPath : null;
    const avatarUpdatedAt =
      user.avatarUpdatedAt instanceof Date
        ? user.avatarUpdatedAt
        : user.avatarUpdatedAt
          ? new Date(String(user.avatarUpdatedAt))
          : null;

    return {
      ...user,
      displayName:
        typeof user.displayName === 'string' && user.displayName.trim().length > 0
          ? user.displayName
          : null,
      avatarUrl: this.avatarUrl(userId, avatarPath, avatarUpdatedAt),
    };
  }

  private emailToName(email: string) {
    const local = email.split('@')[0] || email;
    return local
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  private roleTheme(role: string) {
    if (role === UserRole.ADMIN) {
      return {
        label: 'Admin Slate',
        primary: '#14B8A6',
        accent: '#0EA5E9',
      };
    }
    if (role === UserRole.DOCTOR) {
      return {
        label: 'Doctor Emerald',
        primary: '#10B981',
        accent: '#22D3EE',
      };
    }
    if (role === UserRole.SPECIALIST) {
      return {
        label: 'Specialist Amber',
        primary: '#F59E0B',
        accent: '#FB7185',
      };
    }
    if (role === UserRole.PATIENT) {
      return {
        label: 'Patient Sky',
        primary: '#38BDF8',
        accent: '#22D3EE',
      };
    }
    return {
      label: 'Family Violet',
      primary: '#8B5CF6',
      accent: '#14B8A6',
    };
  }
}
