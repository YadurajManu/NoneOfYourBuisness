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
  const numberConfig = (key: string, fallback: number) => {
    const parsed = Number(configService.get<string | number>(key) ?? fallback);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, '');
  const originConfig = configService.get<string>('CORS_ALLOWED_ORIGINS') ?? '';
  const allowedOrigins = originConfig
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
  const allowAllLocal = process.env.NODE_ENV !== 'production';

  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      const requestOrigin = origin ? normalizeOrigin(origin) : undefined;

      if (!requestOrigin && allowAllLocal) {
        callback(null, true);
        return;
      }

      if (
        !requestOrigin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(requestOrigin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  app.use(helmet());
  app.use(cookieParser());
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));
  app.use(
    '/api/public',
    rateLimit({
      windowMs: numberConfig('PUBLIC_RATE_LIMIT_WINDOW_MS', 60_000),
      max: numberConfig('PUBLIC_RATE_LIMIT_MAX', 30),
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Railway (and most PaaS) inject PORT; bind 0.0.0.0 so the proxy can reach the process
  const port = Number(configService.get<string | number>('PORT') ?? 3005) || 3005;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend is running on: http://0.0.0.0:${port}/api`);
}
void bootstrap();
