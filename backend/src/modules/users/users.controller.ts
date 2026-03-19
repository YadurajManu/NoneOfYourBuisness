import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { UsersService } from './users.service';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { USER_AVATAR_UPLOAD_INTERCEPTOR_OPTIONS } from './user-avatar-upload.config';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('doctors')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.SPECIALIST)
  listDoctors(@Req() req: { user: AuthenticatedUser }) {
    return this.usersService.listActiveDoctorsByOrganization(req.user.orgId);
  }

  @Get('specialists')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.SPECIALIST)
  listSpecialists(@Req() req: { user: AuthenticatedUser }) {
    return this.usersService.listActiveSpecialistsByOrganization(
      req.user.orgId,
    );
  }

  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  myProfile(@Req() req: { user: AuthenticatedUser }) {
    return this.usersService.getMyProfile(req.user.orgId, req.user.userId);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  updateMyProfile(
    @Req() req: { user: AuthenticatedUser },
    @Body() body: UpdateMyProfileDto,
  ) {
    return this.usersService.updateMyProfile(req.user.orgId, req.user.userId, body);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', USER_AVATAR_UPLOAD_INTERCEPTOR_OPTIONS),
  )
  uploadMyAvatar(
    @Req() req: { user: AuthenticatedUser },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Avatar file is required and must be a supported image type within size limit.',
      );
    }

    return this.usersService.updateMyAvatar(req.user.orgId, req.user.userId, file);
  }

  @Get('me/virtual-card')
  @UseGuards(JwtAuthGuard)
  getMyVirtualCard(@Req() req: { user: AuthenticatedUser }) {
    return this.usersService.getMyVirtualCard(req.user.orgId, req.user.userId);
  }

  @Get('avatar/:userId')
  async getAvatar(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('exp') expRaw: string | undefined,
    @Query('sig') sig: string | undefined,
    @Res() res: Response,
  ) {
    const exp = Number(expRaw);
    if (!sig || !Number.isFinite(exp)) {
      throw new ForbiddenException('Invalid avatar signature');
    }

    const allowed = this.usersService.verifyAvatarSignature(userId, exp, sig);
    if (!allowed) {
      throw new ForbiddenException('Invalid avatar signature');
    }

    const avatar = await this.usersService.getAvatarFileForPublic(userId);

    res.setHeader('Content-Type', avatar.contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.sendFile(avatar.absolutePath);
  }
}
