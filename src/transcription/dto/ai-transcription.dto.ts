import { IsArray, IsNumber } from 'class-validator';

export class AiTranscriptionDto {
  @IsArray()
  @IsNumber({}, { each: true })
  imageIds: number[];
}
