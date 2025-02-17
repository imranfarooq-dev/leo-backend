import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SearchRepository } from '@/src/database/repositiories/search.repository';
import {
  SearchDocumentAndList,
  SearchDocumentAndListTypeEnum,
  SearchTranscription,
  SearchUserNote,
} from '@/types/search';


@Injectable()
export class SearchService {
  constructor(private readonly searchRepository: SearchRepository) { }

  async searchDocumentAndList(
    searchKeyword: string,
    userId: string,
  ) {
    try {
      const [itemResults, transcriptResults, notesResults] = await Promise.all([
        this.itemSearch(searchKeyword, userId),
        this.transcriptSearch(searchKeyword, userId),
        this.notesSearch(searchKeyword, userId),
      ]);

      return {
        items: itemResults,
        transcripts: transcriptResults,
        notes: notesResults,
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message ?? 'An error occurred while searching',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async itemSearch(searchKeyword: string, userId: string): Promise<SearchDocumentAndList[]> {
    try {
      const results: SearchDocumentAndList[] = await this.searchRepository.searchListAndDocument(
        searchKeyword,
        userId,
      );

      return this.itemsSort(results, searchKeyword);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while searching document and list',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async transcriptSearch(searchKeyword: string, userId: string): Promise<SearchTranscription[]> {
    try {
      const results: SearchTranscription[] =
        (await this.searchRepository.searchUserTranscription(
          searchKeyword,
          userId,
        ));

      const documentMap = new Map();

      // Process each search result
      results.forEach((item) => {
        const { document } = item.image;
        const documentId = document.id;

        // If document doesn't exist in map, create it
        if (!documentMap.has(documentId)) {
          documentMap.set(documentId, {
            ...document,
            images: [],
          });
        }

        // Add image with its transcription to the document
        documentMap.get(documentId)?.images.push({
          id: item.image.id,
          image_name: item.image.image_name,
          transcription: {
            id: item.id,
            current_transcription_text: item.current_transcription_text,
            ai_transcription_text: item.ai_transcription_text,
            transcription_status: item.transcription_status,
          },
        });
      });

      return Array.from(documentMap.values());
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while searching transcription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async notesSearch(searchKeyword: string, userId: string) {
    try {
      const results: SearchUserNote[] =
        (await this.searchRepository.searchUserNote(
          searchKeyword,
          userId,
        ));

      const documentMap = new Map();

      results.forEach((item) => {
        const { document } = item.image;
        const documentId = document.id;

        if (!documentMap.has(documentId)) {
          documentMap.set(documentId, {
            ...document,
            images: [],
          });
        }

        documentMap.get(documentId)?.images.push({
          id: item.image.id,
          image_name: item.image.image_name,
          note: {
            id: item.id,
            notes_text: item.notes_text,
          },
        });
      });

      return Array.from(documentMap.values());
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while searching notes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private itemsSort(
    results: SearchDocumentAndList[],
    keyword: string,
  ): SearchDocumentAndList[] {
    return results.sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      const keywordLower = keyword.toLowerCase();

      if (aLower === keywordLower && bLower !== keywordLower) return -1;
      if (bLower === keywordLower && aLower !== keywordLower) return 1;
      return a.name.localeCompare(b.name);
    });
  }
}
