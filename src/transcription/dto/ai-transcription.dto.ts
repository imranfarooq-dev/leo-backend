import { IsArray, IsOptional, IsString } from 'class-validator';

export class AiTranscriptionDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documentIds?: string[];
}
