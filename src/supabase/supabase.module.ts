import { Global, Module } from '@nestjs/common';
import { SupabaseClientProvider } from '@/src/comon/providers/supabase.provider';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  providers: [SupabaseClientProvider, SupabaseService],
  exports: [SupabaseClientProvider, SupabaseService],
})
export class SupabaseModule {}
