export const MAX_IMAGE_ALLOWED = 1000;
export const TRANSCRIBE_COST: number = 1;

export const IsPublic = 'isPublic';
export const SupabaseStorageId = 'leo';
export const DocumentStoragePath = 'public/documents';

export const FreePlan = {
  monthly_credits: 0,
  lifetime_credits: 10,
  storage_limit: 100,
};

export enum Provides {
  Supabase = 'Supabase',
  Svix = 'Svix',
  Stripe = 'Stripe',
}

export enum Tables {
  Users = 'users',
  Documents = 'documents',
  Images = 'images',
  Transcriptions = 'transcriptions',
  Notes = 'notes',
  Lists = 'lists',
  ListsDocuments = 'lists_documents',
  Subscriptions = 'subscriptions',
  Credits = 'credits',
}

export enum DBFunctions {
  getListWithChildren = 'get_list_with_children',
  fetchDocumentsForLists = 'fetch_documents_for_lists',
  searchDocumentAndList = 'search_documents_and_lists',
  getOrderedImagesByDocumentIds = 'get_ordered_images_by_document_ids',
  getOrderedImagesByDocumentId = 'get_ordered_images_by_document_id',
}

export enum StripeCheckoutMode {
  Subscription = 'subscription',
  Payment = 'payment',
}

export enum SubscriptionStatus {
  Incomplete = 'incomplete',
  IncompleteExpired = 'incomplete_expired',
  Trialing = 'trialing',
  Active = 'active',
  PastDue = 'past_due',
  Canceled = 'canceled',
  Unpaid = 'unpaid',
  Paused = 'paused',
}

export enum SearchMode {
  Item = 'item',
  Transcript = 'transcript',
  Note = 'note',
}
