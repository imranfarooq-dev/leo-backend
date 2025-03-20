import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { SvixModule } from '@/src/svix/svix.module';
import { SupabaseModule } from '@/src/supabase/supabase.module';
import { UserModule } from '@/src/user/user.module';
import { DocumentModule } from '@/src/document/document.module';
import { ImageModule } from '@/src/image/image.module';
import { DatabaseModule } from '@/src/database/database.module';
import { TranscriptionModule } from '@/src/transcription/transcription.module';
import { NoteModule } from '@/src/note/note.module';
import { GotenbergModule } from './gotenberg/gotenberg.module';
import { ListModule } from './list/list.module';
import { ListsDocumentsModule } from '@/src/lists-documents/lists-documents.module';
import { SearchModule } from './search/search.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { CreditModule } from './credit/credit.module';
import SupabaseConfig from '@/src/config/supabase.config';
import StripeConfig from '@/src/config/stripe.config';
import ApiConfig from '@/src/config/api.config';
import { BullModule } from '@nestjs/bull';
import { SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [SupabaseConfig, StripeConfig, ApiConfig],
      envFilePath: [
        '.env.local',
        '.env.development',
        '.env.production',
        '.env',
      ],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          redis: {
            host: configService.get('REDISHOST', 'localhost'),
            port: parseInt(configService.get('REDISPORT', '6379')),
            password: configService.get('REDISPASSWORD'),
            username: configService.get('REDISUSER'),
            family: 0,
          },
        };
      },
      inject: [ConfigService],
    }),
    SvixModule,
    SupabaseModule,
    UserModule,
    DocumentModule,
    ImageModule,
    DatabaseModule,
    TranscriptionModule,
    NoteModule,
    GotenbergModule,
    ListModule,
    ListsDocumentsModule,
    SearchModule,
    SubscriptionModule,
    CreditModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ClerkExpressRequireAuth()).forRoutes();
  }
}
