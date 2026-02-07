import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { ThrottlerExceptionFilter } from './common/exceptions/throttler-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS: allow frontend origin(s); allow Railway health checks
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const origins = frontendUrl.split(',').map((u) => u.trim()).filter(Boolean);
  if (origins.length === 0) origins.push('http://localhost:3001');
  app.enableCors({
    origin: (reqOrigin, cb) => {
      // Allow requests with no origin (e.g. Postman, Railway healthcheck)
      if (!reqOrigin) return cb(null, true);
      if (origins.some((o) => reqOrigin === o || reqOrigin.startsWith(o.replace(/\/$/, '')))) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Trust proxy for accurate IP addresses (important for rate limiting)
  // Note: Express trust proxy is handled automatically by NestJS

  // Global exception filters
  app.useGlobalFilters(
    new ThrottlerExceptionFilter(),
    new HttpExceptionFilter(),
  );

  // Global validation pipe with improved error messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const formattedErrors = errors.map((error) => {
          const constraints = error.constraints || {};
          const messages = Object.values(constraints);
          
          // Format nested errors
          const formatted: any = {
            property: error.property,
            value: error.value,
            messages: messages.length > 0 ? messages : [`${error.property} is invalid`],
          };

          // Handle nested validation errors
          if (error.children && error.children.length > 0) {
            formatted.children = error.children.map((child: any) => {
              const childConstraints = child.constraints || {};
              return {
                property: child.property,
                value: child.value,
                messages: Object.values(childConstraints),
              };
            });
          }

          return formatted;
        });

        return new BadRequestException({
          message: 'Validation failed',
          errors: formattedErrors,
        });
      },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // Listen on all interfaces for Railway
  console.log(`Application is running on: http://0.0.0.0:${port}`);
}

bootstrap();

