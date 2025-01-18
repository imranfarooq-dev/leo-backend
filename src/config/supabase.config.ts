import { registerAs } from '@nestjs/config';

export default registerAs('supabase', () => ({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SECRET_KEY,
}));
