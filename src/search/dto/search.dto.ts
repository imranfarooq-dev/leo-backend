import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { SearchMode } from '@/src/shared/constant';

export class SearchDto {
  @IsNotEmpty()
  @IsString()
  search_keyword: string;

  @IsNotEmpty()
  @IsEnum(SearchMode)
  search_mode: SearchMode;
}
