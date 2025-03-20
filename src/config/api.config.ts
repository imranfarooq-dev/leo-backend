import { registerAs } from '@nestjs/config';

export default registerAs('api', () => ({
  betaTestCronApiKey: process.env.BETA_TEST_CRON_API_KEY,
}));
