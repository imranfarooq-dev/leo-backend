import { IsNotEmpty, IsString } from 'class-validator';

export class ExportImageDTO {
  @IsString()
  @IsNotEmpty()
  image_id: string;
}
