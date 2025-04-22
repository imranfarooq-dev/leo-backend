import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum ExportContentType {
  IMAGE = 'images',
  TRANSCRIPTION = 'transcripts',
  BOTH = 'both',
}

export enum ExportFormat {
  PDF = 'pdf',
  ZIP = 'zip',
  WORD = 'word',
  TXT = 'txt',
}

export class SelectedImageDto {
  @IsString()
  @IsNotEmpty()
  imgId: string;
  documentId: string;
}

export class ExportRequestDto {
  @IsEnum(ExportContentType)
  contentType: ExportContentType;

  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsArray()
  selectedImages: SelectedImageDto[];
}
