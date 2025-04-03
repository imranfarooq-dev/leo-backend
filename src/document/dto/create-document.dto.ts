import { IsString, IsOptional, IsNotEmpty, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDocumentDto {
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return [value];
    }
    return value;
  })
  @IsString({ each: true })
  list_ids?: string[];

  @IsString()
  @IsNotEmpty()
  document_name: string;

  @IsString()
  @IsOptional()
  creator_name?: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  archive?: string;

  @IsString()
  @IsOptional()
  collection?: string;

  @IsString()
  @IsOptional()
  box?: string;

  @IsString()
  @IsOptional()
  folder?: string;

  @IsString()
  @IsOptional()
  identifier?: string;

  @IsString()
  @IsOptional()
  rights?: string;
}
