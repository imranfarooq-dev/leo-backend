import { Module } from '@nestjs/common';
import { GotenbergController } from './gotenberg.controller';
import { GotenbergService } from './gotenberg.service';
import { DatabaseModule } from '@/src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [GotenbergController],
  providers: [GotenbergService],
})
export class GotenbergModule {}
