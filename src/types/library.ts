export type CopyStatus = 'available' | 'borrowed' | 'damaged' | 'lost';
export type CopyCondition = 'Mới' | 'Tốt' | 'Khá' | 'Cần bảo trì';
export type ReaderStatus = 'active' | 'locked';
export type BorrowRecordStatus = 'borrowing' | 'returned';
export type BorrowDetailStatus = 'borrowed' | 'returned';

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  category: string;
  publisher: string;
  publishYear: number;
  shelfLocation: string;
  description: string;
  createdAt: string;
}

export interface BookCopy {
  id: string;
  bookId: string;
  copyCode: string;
  status: CopyStatus;
  condition: CopyCondition;
  note: string;
  acquiredAt: string;
}

export interface Reader {
  id: string;
  readerCode: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  cardExpiry: string;
  status: ReaderStatus;
  createdAt: string;
}

export interface BorrowRecord {
  id: string;
  recordCode: string;
  readerId: string;
  borrowDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  returnDate: string | null; // YYYY-MM-DD when fully completed
  status: BorrowRecordStatus;
  renewalCount: number;
  notes: string;
  createdAt: string;
}

export interface BorrowDetail {
  id: string;
  borrowRecordId: string;
  bookCopyId: string;
  bookId: string;
  returnDate: string | null; // YYYY-MM-DD
  status: BorrowDetailStatus;
  returnCondition: string | null;
}

export type PageKey =
  | 'dashboard'
  | 'books'
  | 'readers'
  | 'borrow'
  | 'return'
  | 'renew'
  | 'statistics';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}
