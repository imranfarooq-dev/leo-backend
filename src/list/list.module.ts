import { Module } from '@nestjs/common';
import { ListService } from './list.service';
import { ListController } from './list.controller';
import { DatabaseModule } from '@/src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ListService],
  controllers: [ListController],
})
export class ListModule {}
