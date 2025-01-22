import { IsArray, ArrayNotEmpty } from 'class-validator';

export class ExportDocumentDto {
  @IsArray()
  @ArrayNotEmpty()
  documentIds: Array<string>;
}
