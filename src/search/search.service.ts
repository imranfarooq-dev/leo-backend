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

      return results;
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

      return results;
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
