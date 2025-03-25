import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/src/app.module';
import * as cookieParser from 'cookie-parser';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { clerkMiddleware } from '@clerk/express'; // Clerk's Express middleware

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const corsOptions: CorsOptions = {
    origin: [
      'https://leo-app-develop.vercel.app',
      'http://localhost:3000',
      'https://www.tryleo.ai',
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  };

  app.enableCors(corsOptions);

  app.use(cookieParser());
  app.useLogger(new Logger());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.use(
    clerkMiddleware({
      authorizedParties: [
        'http://localhost:3000',
        'https://leo-app-develop.vercel.app',
        'https://www.tryleo.ai',
      ],
    }),
  );

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
