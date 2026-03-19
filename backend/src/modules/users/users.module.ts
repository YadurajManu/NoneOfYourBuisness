import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserMediaService } from './user-media.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserMediaService],
  exports: [UsersService],
})
export class UsersModule {}
