import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { NotificationsService } from './notifications.service';
import { RunDeliveryDispatchDto } from './dto/run-delivery-dispatch.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.SPECIALIST)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('delivery/recent')
  listRecentDeliveries(
    @Req() req: { user: AuthenticatedUser },
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 100;
    const normalizedLimit =
      Number.isNaN(parsedLimit) || parsedLimit <= 0
        ? 100
        : Math.min(parsedLimit, 500);

    return this.notificationsService.listRecentDeliveries(
      req.user.orgId,
      normalizedLimit,
    );
  }

  @Post('delivery/run')
  runDispatch(
    @Req() req: { user: AuthenticatedUser },
    @Body() body?: RunDeliveryDispatchDto,
  ) {
    return this.notificationsService.processPendingDeliveries(
      req.user.orgId,
      body?.limit ?? 100,
    );
  }
}
