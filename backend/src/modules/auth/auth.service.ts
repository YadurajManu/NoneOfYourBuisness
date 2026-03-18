import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import type { UserWithOrganization } from '../../types/jwt.types';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

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
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash: _, ...result } = user;
      void _;
      return result as UserWithOrganization;
    }
    return null;
  }

  login(user: UserWithOrganization) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      orgId: user.organizationId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organization: user.organization.name,
      },
    };
  }

  async register(orgName: string, email: string, pass: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new UnauthorizedException('User already exists');
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
    return this.login(user);
  }
}
