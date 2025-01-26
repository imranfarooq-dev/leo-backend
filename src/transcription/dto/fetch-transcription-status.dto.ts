import { IsNotEmpty, IsString } from 'class-validator';

export class FetchTranscriptionStatusDto {
  @IsNotEmpty()
  @IsString()
  image_id: string;
}
