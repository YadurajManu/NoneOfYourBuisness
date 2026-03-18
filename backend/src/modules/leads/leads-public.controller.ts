import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateDemoLeadDto } from './dto/create-demo-lead.dto';

@Controller('public/leads')
export class LeadsPublicController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(201)
  createLead(@Body() body: CreateDemoLeadDto) {
    return this.leadsService.createLead(body);
  }
}
