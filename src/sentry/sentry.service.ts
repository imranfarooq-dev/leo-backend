import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class SentryService implements OnApplicationBootstrap {
  constructor(private configService: ConfigService) {}

  onApplicationBootstrap() {
    const dsn = this.configService.get('SENTRY_DSN');
    try {
      const packageJsonPath = path.resolve(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const release = `leo-backend@${packageJson.version}`;

      Sentry.init({
        dsn,
        release,
        environment: this.configService.get('NODE_ENV') || 'development',
        enabled: true,
        debug: false,
        integrations: [nodeProfilingIntegration()],
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
      });
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
      // Initialize Sentry with a fallback release version
      Sentry.init({
        dsn,
        release: 'leo-backend@dev',
        environment: this.configService.get('NODE_ENV') || 'development',
        enabled: true,
        debug: false,
        integrations: [nodeProfilingIntegration()],
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
      });
    }
  }
}
