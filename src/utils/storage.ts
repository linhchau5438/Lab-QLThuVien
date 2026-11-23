import {
  SEED_BOOK_COPIES,
  SEED_BOOKS,
  SEED_BORROW_DETAILS,
  SEED_BORROW_RECORDS,
  SEED_READERS,
} from '../data/seedData';
import { Book, BookCopy, BorrowDetail, BorrowRecord, Reader } from '../types/library';

export const STORAGE_KEYS = {
  BOOKS: 'libravn_books_v1',
  COPIES: 'libravn_book_copies_v1',
  READERS: 'libravn_readers_v1',
  RECORDS: 'libravn_borrow_records_v1',
  DETAILS: 'libravn_borrow_details_v1',
  INITIALIZED: 'libravn_initialized_v1',
} as const;

export interface LibrarySnapshot {
  books: Book[];
  bookCopies: BookCopy[];
  readers: Reader[];
  borrowRecords: BorrowRecord[];
  borrowDetails: BorrowDetail[];
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadLibraryData(): LibrarySnapshot {
  const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);

  if (!isInitialized) {
    const seed: LibrarySnapshot = {
      books: SEED_BOOKS,
      bookCopies: SEED_BOOK_COPIES,
      readers: SEED_READERS,
      borrowRecords: SEED_BORROW_RECORDS,
      borrowDetails: SEED_BORROW_DETAILS,
    };
    saveLibraryData(seed);
    return seed;
  }

  return {
    books: safeParse<Book[]>(localStorage.getItem(STORAGE_KEYS.BOOKS), SEED_BOOKS),
    bookCopies: safeParse<BookCopy[]>(localStorage.getItem(STORAGE_KEYS.COPIES), SEED_BOOK_COPIES),
    readers: safeParse<Reader[]>(localStorage.getItem(STORAGE_KEYS.READERS), SEED_READERS),
    borrowRecords: safeParse<BorrowRecord[]>(
      localStorage.getItem(STORAGE_KEYS.RECORDS),
      SEED_BORROW_RECORDS
    ),
    borrowDetails: safeParse<BorrowDetail[]>(
      localStorage.getItem(STORAGE_KEYS.DETAILS),
      SEED_BORROW_DETAILS
    ),
  };
}

export function saveLibraryData(data: LibrarySnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(data.books));
    localStorage.setItem(STORAGE_KEYS.COPIES, JSON.stringify(data.bookCopies));
    localStorage.setItem(STORAGE_KEYS.READERS, JSON.stringify(data.readers));
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(data.borrowRecords));
    localStorage.setItem(STORAGE_KEYS.DETAILS, JSON.stringify(data.borrowDetails));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  } catch {
    // Ignore storage quota / privacy mode errors gracefully
  }
}

export function resetLibraryData(): LibrarySnapshot {
  const seed: LibrarySnapshot = {
    books: SEED_BOOKS,
    bookCopies: SEED_BOOK_COPIES,
    readers: SEED_READERS,
    borrowRecords: SEED_BORROW_RECORDS,
    borrowDetails: SEED_BORROW_DETAILS,
  };
  saveLibraryData(seed);
  return seed;
}
