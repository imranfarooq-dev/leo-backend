import { IsOptional, IsString } from 'class-validator';

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  document_name?: string;

  @IsString()
  @IsOptional()
  creator_name?: string;

  @IsString()
  @IsOptional()
  date?: Date;

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
