import { IsArray, IsString } from 'class-validator';

export class GetTranscribableImagesDto {
  @IsArray()
  @IsString({ each: true })
  documentIds: string[];
}
