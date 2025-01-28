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
  id: string;
  document_name: string;
};

export type SearchImage = {
  id: string;
  image_name: string;
  document: SearchDocument;
};

export type SearchTranscription = {
  id: string;
  current_transcription_text: string | null;
  ai_transcription_text: string;
  transcription_status: string;
  image: SearchImage;
};

export type SearchUserNote = {
  id: string;
  notes_text: string;
  image: SearchImage;
};
