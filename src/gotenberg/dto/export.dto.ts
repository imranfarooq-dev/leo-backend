import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum ExportContentType {
  IMAGE = 'images',
  TRANSCRIPTION = 'transcripts',
  BOTH = 'both',
}

export enum ExportFormat {
  PDF = 'pdf',
  JPEG = 'jpeg',
  WORD = 'word',
  TXT = 'txt',
}

export class SelectedImageDto {
  @IsString()
  @IsNotEmpty()
  imgId: string;
}

export class ExportRequestDto {
  @IsEnum(ExportContentType)
  contentType: ExportContentType;

  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsArray()
  selectedImages: SelectedImageDto[];
}
