import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdateImageDto {
  @IsNotEmpty()
  @IsString()
  image_id: string;

  @IsNotEmpty()
  @IsString()
  image_name: string;
}

export class UpdateImageOrderDto {
  @IsNotEmpty()
  @IsNumber()
  oldIndex: number;

  @IsNotEmpty()
  @IsNumber()
  newIndex: number;

  @IsNotEmpty()
  @IsString()
  documentId: string;
}
