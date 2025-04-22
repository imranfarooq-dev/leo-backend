import { TranscriptionStatus } from '@/types/transcription';

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

export type SearchTranscription = {
  document_id: string;
  document_name: string;
  image_id: string;
  image_name: string;
  current_transcription_text: string | null;
  ai_transcription_text: string;
  transcription_status: TranscriptionStatus;
};

export type SearchUserNote = {
  document_id: string;
  document_name: string;
  image_id: string;
  image_name: string;
  notes_text: string;
};

export type TranscriptSearchImage = {
  id: string;
  name: string;
  image_url: string;
  current_transcription_text: string | null;
  ai_transcription_text: string;
  transcription_status: TranscriptionStatus;
};

export type TranscriptSearchByDocument = {
  document_id: string;
  document_name: string;
  images: TranscriptSearchImage[];
};

export type NoteSearchImage = {
  id: string;
  name: string;
  image_url: string;
  notes_text: string;
};

export type NoteSearchByDocument = {
  document_id: string;
  document_name: string;
  images: NoteSearchImage[];
};

export type SearchDocumentByDate = {
  id: string;
  image_name: string;
  created_at: Date;
};
