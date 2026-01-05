import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RelaxedRateLimitGuard } from './common/guards/relaxed-rate-limit.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { MembersModule } from './modules/members/members.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { DistributionModule } from './modules/distribution/distribution.module';
import { EmpowermentModule } from './modules/empowerment/empowerment.module';
import { MemberLogsModule } from './modules/member-logs/member-logs.module';
import { RequestsModule } from './modules/requests/requests.module';
import { UsersModule } from './modules/users/users.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { ClassesModule } from './modules/classes/classes.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { EventsModule } from './modules/events/events.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EmailModule } from './modules/email/email.module';
import { UploadModule } from './modules/upload/upload.module';
import { HealthModule } from './modules/health/health.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OfferingsModule } from './modules/offerings/offerings.module';
import { ExportModule } from './modules/export/export.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: configService.get<number>('THROTTLE_TTL', 60000), // 1 minute
            limit: configService.get<number>('THROTTLE_LIMIT', 100), // 100 requests per minute (write operations)
          },
          {
            name: 'relaxed',
            ttl: configService.get<number>('THROTTLE_RELAXED_TTL', 60000), // 1 minute
            limit: configService.get<number>('THROTTLE_RELAXED_LIMIT', 500), // 500 requests per minute (read operations)
          },
          {
            name: 'strict',
            ttl: configService.get<number>('THROTTLE_STRICT_TTL', 60000), // 1 minute
            limit: configService.get<number>('THROTTLE_STRICT_LIMIT', 10), // 10 requests per minute
          },
          {
            name: 'auth',
            ttl: configService.get<number>('THROTTLE_AUTH_TTL', 60000), // 1 minute
            limit: configService.get<number>('THROTTLE_AUTH_LIMIT', 5), // 5 requests per minute
          },
        ],
      }),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ClassesModule,
    MembersModule,
    AttendanceModule,
    DistributionModule,
    EmpowermentModule,
    MemberLogsModule,
    RequestsModule,
    KitchenModule,
    EventsModule,
    NotificationsModule,
        EmailModule,
        UploadModule,
        ActivityLogsModule,
        DashboardModule,
        OfferingsModule,
        ExportModule,
  ],
  controllers: [],
  providers: [
    // Rate limiting disabled temporarily
    // {
    //   provide: APP_GUARD,
    //   useClass: RelaxedRateLimitGuard,
    // },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}

