import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateImagesDto {
  @IsNotEmpty()
  @IsString()
  document_id: string;

  @IsArray()
  @IsString({ each: true })
  image_names: string[];
}
