import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LeadsService } from './leads.service';
import { UpdateDemoLeadStatusDto } from './dto/update-demo-lead-status.dto';

@Controller('admin/leads')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class LeadsAdminController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  listLeads() {
    return this.leadsService.listLeads();
  }

  @Get(':id')
  getLead(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.getLeadById(id);
  }

  @Patch(':id/status')
  updateLeadStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDemoLeadStatusDto,
  ) {
    return this.leadsService.updateLeadStatus(id, body.status);
  }
}
