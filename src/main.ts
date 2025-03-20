import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from '@/src/app.module';
import * as cookieParser from 'cookie-parser';
import { ClerkAuthGuard } from '@/src/comon/guards/clerk.auth.guard';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

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

  const reflector = app.get(Reflector);
  app.use(cookieParser());
  app.useLogger(new Logger());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalGuards(new ClerkAuthGuard(reflector));

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
