import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const originConfig = configService.get<string>('CORS_ALLOWED_ORIGINS') ?? '';
  const allowedOrigins = originConfig
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowAllLocal = process.env.NODE_ENV !== 'production';

  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin && allowAllLocal) {
        callback(null, true);
        return;
      }

      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  });

  app.use(helmet());
  app.use(cookieParser());
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));
  app.use(
    '/api/public',
    rateLimit({
      windowMs:
        configService.get<number>('PUBLIC_RATE_LIMIT_WINDOW_MS') ?? 60_000,
      max: configService.get<number>('PUBLIC_RATE_LIMIT_MAX') ?? 30,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = configService.get<number>('PORT') || 3005;
  await app.listen(port);
  console.log(`Backend is running on: http://localhost:${port}/api`);
}
void bootstrap();
