import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import type { UserWithOrganization } from '../../types/jwt.types';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiryDays: number;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {
    this.accessTokenExpiresIn =
      this.configService.get<string>('ACCESS_TOKEN_EXPIRES_IN') ?? '15m';
    this.refreshTokenExpiryDays =
      this.configService.get<number>('REFRESH_TOKEN_EXPIRES_IN_DAYS') ?? 14;
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<
    | (Omit<UserWithOrganization, 'organization'> & {
        organization: { name: string };
      })
    | null
  > {
    const user = await this.usersService.findByEmail(email);
    if (
      user &&
      !user.isSuspended &&
      (await bcrypt.compare(pass, user.passwordHash))
    ) {
      const { passwordHash: _, ...result } = user;
      void _;
      return result as UserWithOrganization;
    }
    return null;
  }

  async login(
    user: UserWithOrganization,
    meta?: {
      userAgent?: string;
      ipAddress?: string;
      deviceInfo?: string;
    },
  ) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      orgId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiresIn as never,
    });
    const { token: refreshToken } = await this.createRefreshSession(
      user.id,
      user.organizationId,
      meta,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organization: user.organization.name,
        orgId: user.organizationId,
        patientProfileId: user.patientProfileId ?? null,
      },
    };
  }

  async register(
    orgName: string,
    email: string,
    pass: string,
    meta?: {
      userAgent?: string;
      ipAddress?: string;
      deviceInfo?: string;
    },
  ) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('User already exists');
    }
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(pass, salt);
    const org = await this.usersService.createWithOrganization(
      orgName,
      email,
      hash,
    );
    const user = {
      ...org.users[0],
      organization: { name: org.name },
    } as UserWithOrganization;

    return this.login(user, meta);
  }

  async refresh(
    refreshToken: string,
    meta?: {
      userAgent?: string;
      ipAddress?: string;
      deviceInfo?: string;
    },
  ) {
    const hashedToken = this.hashToken(refreshToken);

    const session = await this.prisma.refreshSession.findFirst({
      where: {
        hashedToken,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            organization: true,
            patientProfile: true,
          },
        },
      },
    });

    if (!session || session.user.isSuspended) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { token: nextRefreshToken, sessionId: nextSessionId } =
      await this.createRefreshSession(
        session.userId,
        session.organizationId,
        meta,
      );

    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        replacedBySessionId: nextSessionId,
      },
    });

    const access_token = this.jwtService.sign(
      {
        email: session.user.email,
        sub: session.user.id,
        role: session.user.role,
        orgId: session.user.organizationId,
      },
      { expiresIn: this.accessTokenExpiresIn as never },
    );

    return {
      access_token,
      refresh_token: nextRefreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        organization: session.user.organization.name,
        orgId: session.user.organizationId,
        patientProfileId: session.user.patientProfileId ?? null,
      },
    };
  }

  async logout(refreshToken: string) {
    const hashedToken = this.hashToken(refreshToken);
    await this.prisma.refreshSession.updateMany({
      where: { hashedToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || user.isSuspended) {
      throw new UnauthorizedException('User account unavailable');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.organizationId,
      organization: user.organization.name,
      patientProfileId: user.patientProfileId ?? null,
      isSuspended: user.isSuspended,
    };
  }

  getRefreshTokenMaxAgeMs() {
    return this.refreshTokenExpiryDays * 24 * 60 * 60 * 1000;
  }

  private hashToken(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private async createRefreshSession(
    userId: string,
    organizationId: string,
    meta?: {
      userAgent?: string;
      ipAddress?: string;
      deviceInfo?: string;
    },
  ) {
    const token = randomBytes(48).toString('hex');
    const hashedToken = this.hashToken(token);
    const expiresAt = new Date(
      Date.now() + this.refreshTokenExpiryDays * 24 * 60 * 60 * 1000,
    );

    const session = await this.prisma.refreshSession.create({
      data: {
        userId,
        organizationId,
        hashedToken,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
        deviceInfo: meta?.deviceInfo,
        expiresAt,
      },
      select: { id: true },
    });

    return {
      token,
      sessionId: session.id,
    };
  }
}
