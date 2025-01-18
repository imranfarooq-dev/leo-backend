export enum SearchDocumentAndListTypeEnum {
  Document = 'document',
  List = 'list',
}

export type SearchDocumentAndList = {
  id: string;
  name: string;
  type: SearchDocumentAndListTypeEnum;
};

export type SearchDocument = {
  id: number;
  document_name: string;
};

export type SearchImage = {
  id: number;
  image_name: string;
  image_url: string;
  document: SearchDocument;
};

export type SearchTranscription = {
  id: number;
  current_transcription_text: string | null;
  ai_transcription_text: string;
  transcription_status: string;
  image: SearchImage;
};

export type SearchUserNote = {
  id: number;
  notes_text: string;
  image: SearchImage;
};
