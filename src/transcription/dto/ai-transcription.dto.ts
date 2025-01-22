import { IsArray, IsString } from 'class-validator';

export class AiTranscriptionDto {
  @IsArray()
  @IsString({ each: true })
  imageIds: string[];
}
