import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/src/app.module';
import * as cookieParser from 'cookie-parser';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { clerkMiddleware } from '@clerk/express'; // Clerk's Express middleware
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const isDevelopment = process.env.NODE_ENV === 'development';

  const corsOptions: CorsOptions = {
    origin: isDevelopment
      ? true
      : ['https://leo-app-develop.vercel.app', 'https://www.tryleo.ai'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  };

  app.enableCors(corsOptions);

  // Configure body parser with proper limits
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.use(cookieParser());
  app.useLogger(new Logger());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.use(
    clerkMiddleware({
      authorizedParties: isDevelopment
        ? undefined
        : ['https://leo-app-develop.vercel.app', 'https://www.tryleo.ai'],
    }),
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}
bootstrap();
