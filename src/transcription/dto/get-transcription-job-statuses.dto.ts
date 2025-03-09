import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class GetTranscriptionJobStatusesDto {
  @IsArray()
  @IsString({ each: true })
  imageIds: string[];

  @IsOptional()
  @IsDateString()
  earliestCreatedAt?: Date;
}
