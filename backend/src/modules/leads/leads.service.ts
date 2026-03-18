import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DemoLeadStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { CreateDemoLeadDto } from './dto/create-demo-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createLead(dto: CreateDemoLeadDto) {
    const enabled =
      (this.configService.get<string>('ENABLE_PUBLIC_LEADS') ?? 'true') !==
      'false';

    if (!enabled) {
      throw new ServiceUnavailableException(
        'Lead intake is currently disabled',
      );
    }

    return this.prisma.demoLead.create({
      data: {
        name: dto.name.trim(),
        org: dto.org.trim(),
        role: dto.role?.trim() || null,
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim() || null,
        message: dto.message?.trim() || null,
        source: dto.source?.trim() || 'landing_page',
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });
  }

  listLeads() {
    return this.prisma.demoLead.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLeadById(id: string) {
    const lead = await this.prisma.demoLead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException('Demo lead not found');
    }
    return lead;
  }

  async updateLeadStatus(id: string, status: DemoLeadStatus) {
    const lead = await this.prisma.demoLead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException('Demo lead not found');
    }

    return this.prisma.demoLead.update({
      where: { id },
      data: { status },
    });
  }
}
