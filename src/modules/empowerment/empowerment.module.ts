import { Module } from '@nestjs/common';
import { EmpowermentService } from './empowerment.service';
import { EmpowermentController } from './empowerment.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, ActivityLogsModule, AuthModule],
  controllers: [EmpowermentController],
  providers: [EmpowermentService],
  exports: [EmpowermentService],
})
export class EmpowermentModule {}

