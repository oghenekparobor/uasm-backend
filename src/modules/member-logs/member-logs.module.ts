import { Module } from '@nestjs/common';
import { MemberLogsService } from './member-logs.service';
import { MemberLogsController, LogsController } from './member-logs.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, AuthModule, UploadModule],
  controllers: [MemberLogsController, LogsController],
  providers: [MemberLogsService],
  exports: [MemberLogsService],
})
export class MemberLogsModule {}

