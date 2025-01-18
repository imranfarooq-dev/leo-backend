import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdateImageDto {
  @IsNotEmpty()
  @IsNumber()
  image_id: number;

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
  @IsNumber()
  documentId: number;
}
