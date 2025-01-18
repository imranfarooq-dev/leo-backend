import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
import { Provides } from '@/src/shared/constant';

export const SupabaseClientProvider: Provider = {
  provide: Provides.Supabase,
  useFactory: (configService: ConfigService): SupabaseClient => {
    const supabaseUrl = configService.get<string>('supabase.supabaseUrl');
    const supabaseKey = configService.get<string>('supabase.supabaseKey');

    if (!supabaseKey || !supabaseUrl) {
      throw new Error('Supabase secret is not defined');
    }

    return createClient<Database>(supabaseUrl, supabaseKey);
  },
  inject: [ConfigService],
};
