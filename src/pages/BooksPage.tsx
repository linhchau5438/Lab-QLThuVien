import { BookOpen, Layers, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { BOOK_CATEGORIES } from '../data/seedData';
import {
  ActionResult,
  Book,
  BookCopy,
  CopyCondition,
  CopyStatus,
} from '../types/library';
import { formatDateVN } from '../utils/dateUtils';

interface BooksPageProps {
  books: Book[];
  bookCopies: BookCopy[];
  onAddBook: (
    input: Omit<Book, 'id' | 'createdAt'>,
    initialCopyCount: number
  ) => ActionResult;
  onUpdateBook: (bookId: string, updates: Omit<Book, 'id' | 'createdAt'>) => ActionResult;
  onDeleteBook: (bookId: string) => ActionResult;
  onAddCopy: (
    bookId: string,
    input: { copyCode: string; condition: CopyCondition; status: CopyStatus; note: string }
  ) => ActionResult;
  onUpdateCopy: (
    copyId: string,
    updates: { copyCode: string; condition: CopyCondition; status: CopyStatus; note: string }
  ) => ActionResult;
  onDeleteCopy: (copyId: string) => ActionResult;
  onNotify: (res: ActionResult) => void;
}

const COPY_STATUS_LABEL: Record<CopyStatus, { label: string; colorClass: string }> = {
  available: { label: 'Còn sẵn', colorClass: 'text-emerald-700' },
  borrowed: { label: 'Đang mượn', colorClass: 'text-blue-700' },
  damaged: { label: 'Hư hỏng', colorClass: 'text-amber-700' },
  lost: { label: 'Đã mất', colorClass: 'text-red-700' },
};

const EMPTY_BOOK_FORM = {
  isbn: '',
  title: '',
  author: '',
  category: BOOK_CATEGORIES[0] as string,
  publisher: '',
  publishYear: 2024,
  shelfLocation: '',
  description: '',
};

export function BooksPage({
  books,
  bookCopies,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  onAddCopy,
  onUpdateCopy,
  onDeleteCopy,
  onNotify,
}: BooksPageProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'out'>('all');

  // Add/Edit Book Modal
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [bookForm, setBookForm] = useState(EMPTY_BOOK_FORM);
  const [initialCopiesCount, setInitialCopiesCount] = useState(2);

  // Confirm delete book
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  // Manage Copies Modal
  const [copiesBookId, setCopiesBookId] = useState<string | null>(null);
  const [newCopyCode, setNewCopyCode] = useState('');
  const [newCopyCondition, setNewCopyCondition] = useState<CopyCondition>('Mới');
  const [newCopyStatus, setNewCopyStatus] = useState<CopyStatus>('available');
  const [newCopyNote, setNewCopyNote] = useState('');

  // Inline Edit Copy
  const [editingCopyId, setEditingCopyId] = useState<string | null>(null);
  const [editCopyForm, setEditCopyForm] = useState<{
    copyCode: string;
    condition: CopyCondition;
    status: CopyStatus;
    note: string;
  }>({
    copyCode: '',
    condition: 'Tốt',
    status: 'available',
    note: '',
  });
  const [copyToDelete, setCopyToDelete] = useState<BookCopy | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>([...BOOK_CATEGORIES, ...books.map((b) => b.category)]);
    return Array.from(set);
  }, [books]);

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((b) => {
      const matchesQuery =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q) ||
        b.shelfLocation.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'all' || b.category === selectedCategory;

      const copies = bookCopies.filter((c) => c.bookId === b.id);
      const avail = copies.filter((c) => c.status === 'available').length;
      const matchesAvail =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available' && avail > 0) ||
        (availabilityFilter === 'out' && avail === 0);

      return matchesQuery && matchesCat && matchesAvail;
    });
  }, [books, bookCopies, search, selectedCategory, availabilityFilter]);

  const openAddBook = () => {
    setEditingBook(null);
    setBookForm(EMPTY_BOOK_FORM);
    setInitialCopiesCount(2);
    setBookModalOpen(true);
  };

  const openEditBook = (book: Book) => {
    setEditingBook(book);
    setBookForm({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      category: book.category,
      publisher: book.publisher,
      publishYear: book.publishYear,
      shelfLocation: book.shelfLocation,
      description: book.description,
    });
    setBookModalOpen(true);
  };

  const handleBookSubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = editingBook
      ? onUpdateBook(editingBook.id, bookForm)
      : onAddBook(bookForm, initialCopiesCount);
    onNotify(res);
    if (res.ok) {
      setBookModalOpen(false);
    }
  };

  const getSuggestedCopyCode = (book: Book) => {
    const existingForBook = bookCopies.filter((c) => c.bookId === book.id);
    // Reuse book's numeric prefix if it already has copies, otherwise pick next global prefix
    let prefixNum = 0;
    for (const c of existingForBook) {
      const m = /^BS-(\d+)-/i.exec(c.copyCode);
      if (m) {
        prefixNum = Number(m[1]);
        break;
      }
    }
    if (prefixNum === 0) {
      for (const c of bookCopies) {
        const m = /^BS-(\d+)-/i.exec(c.copyCode);
        if (m && Number(m[1]) > prefixNum) {
          prefixNum = Number(m[1]);
        }
      }
      prefixNum += 1;
    }
    const prefix = String(prefixNum).padStart(3, '0');
    let seq = existingForBook.length + 1;
    let candidate = `BS-${prefix}-${String(seq).padStart(2, '0')}`;
    const existingCodes = new Set(bookCopies.map((c) => c.copyCode.toLowerCase()));
    while (existingCodes.has(candidate.toLowerCase())) {
      seq += 1;
      candidate = `BS-${prefix}-${String(seq).padStart(2, '0')}`;
    }
    return candidate;
  };

  const openCopiesManager = (book: Book) => {
    setCopiesBookId(book.id);
    setNewCopyCode(getSuggestedCopyCode(book));
    setNewCopyCondition('Mới');
    setNewCopyStatus('available');
    setNewCopyNote('');
    setEditingCopyId(null);
  };

  const handleAddCopySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!copiesBookId) return;
    const res = onAddCopy(copiesBookId, {
      copyCode: newCopyCode,
      condition: newCopyCondition,
      status: newCopyStatus,
      note: newCopyNote,
    });
    onNotify(res);
    if (res.ok) {
      const book = books.find((b) => b.id === copiesBookId);
      if (book) {
        const nextNum = bookCopies.filter((c) => c.bookId === copiesBookId).length + 2;
        const m = /^BS-(\d+)-/i.exec(newCopyCode);
        const prefix = m ? m[1] : String(Date.now()).slice(-3);
        setNewCopyCode(`BS-${prefix}-${String(nextNum).padStart(2, '0')}`);
      }
      setNewCopyNote('');
    }
  };

  const startEditCopy = (copy: BookCopy) => {
    setEditingCopyId(copy.id);
    setEditCopyForm({
      copyCode: copy.copyCode,
      condition: copy.condition,
      status: copy.status,
      note: copy.note,
    });
  };

  const saveEditCopy = (copyId: string) => {
    const res = onUpdateCopy(copyId, editCopyForm);
    onNotify(res);
    if (res.ok) {
      setEditingCopyId(null);
    }
  };

  const activeCopiesBook = books.find((b) => b.id === copiesBookId) || null;
  const activeBookCopies = useMemo(
    () => bookCopies.filter((c) => c.bookId === copiesBookId),
    [bookCopies, copiesBookId]
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên sách, tác giả, ISBN, kệ..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Lọc theo thể loại"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="all">Tất cả thể loại</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={availabilityFilter}
            onChange={(e) =>
              setAvailabilityFilter(e.target.value as 'all' | 'available' | 'out')
            }
            aria-label="Lọc theo tình trạng sẵn có"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="all">Tất cả tình trạng</option>
            <option value="available">Còn bản sao sẵn</option>
            <option value="out">Hết bản sao sẵn</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openAddBook}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm đầu sách</span>
        </button>
      </div>

      {/* Books Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <p className="text-sm font-medium text-slate-700">
            Hiển thị <span className="font-semibold tabular-nums">{filteredBooks.length}</span> /{' '}
            <span className="tabular-nums">{books.length}</span> đầu sách
          </p>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <BookOpen className="h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              Không tìm thấy đầu sách phù hợp
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Thử thay đổi từ khóa tìm kiếm, bộ lọc thể loại hoặc thêm đầu sách mới.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3">Đầu sách & Tác giả</th>
                  <th className="px-5 py-3">Thể loại</th>
                  <th className="px-5 py-3">Vị trí kệ</th>
                  <th className="px-5 py-3 text-right">Tổng bản</th>
                  <th className="px-5 py-3 text-right">Còn sẵn</th>
                  <th className="px-5 py-3 text-right">Đang mượn</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBooks.map((book) => {
                  const copies = bookCopies.filter((c) => c.bookId === book.id);
                  const avail = copies.filter((c) => c.status === 'available').length;
                  const borrowed = copies.filter((c) => c.status === 'borrowed').length;

                  return (
                    <tr key={book.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{book.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {book.author} · {book.publisher} ({book.publishYear}) ·{' '}
                          <span className="font-mono">{book.isbn}</span>
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">
                        {book.category}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {book.shelfLocation}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium tabular-nums text-slate-900">
                        {copies.length}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                        <span className={avail > 0 ? 'text-emerald-700' : 'text-red-600'}>
                          {avail}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium tabular-nums text-blue-700">
                        {borrowed}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openCopiesManager(book)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            <span>Bản sao ({copies.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditBook(book)}
                            aria-label={`Sửa sách ${book.title}`}
                            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setBookToDelete(book)}
                            aria-label={`Xóa sách ${book.title}`}
                            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Book Modal */}
      {bookModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingBook ? 'Chỉnh sửa đầu sách' : 'Thêm đầu sách mới'}
              </h2>
              <button
                type="button"
                onClick={() => setBookModalOpen(false)}
                aria-label="Đóng"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleBookSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Tên sách <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  placeholder="Ví dụ: Clean Code — Mã Sạch"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Tác giả <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    placeholder="Tên tác giả"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Thể loại</label>
                  <select
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Mã ISBN</label>
                  <input
                    type="text"
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                    placeholder="978-604-..."
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Nhà xuất bản
                  </label>
                  <input
                    type="text"
                    value={bookForm.publisher}
                    onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                    placeholder="NXB..."
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Năm xuất bản
                  </label>
                  <input
                    type="number"
                    min={1900}
                    max={2030}
                    value={bookForm.publishYear || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBookForm({
                        ...bookForm,
                        publishYear: val === '' ? 0 : Number(val),
                      });
                    }}
                    onBlur={() => {
                      if (!bookForm.publishYear || bookForm.publishYear < 1900) {
                        setBookForm((prev) => ({ ...prev, publishYear: 2024 }));
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Vị trí kệ</label>
                  <input
                    type="text"
                    value={bookForm.shelfLocation}
                    onChange={(e) =>
                      setBookForm({ ...bookForm, shelfLocation: e.target.value })
                    }
                    placeholder="Ví dụ: Kệ A1-05"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {!editingBook && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Số bản sao tạo ban đầu
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={initialCopiesCount}
                      onChange={(e) =>
                        setInitialCopiesCount(Math.max(0, Math.min(50, Number(e.target.value))))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Mô tả ngắn</label>
                <textarea
                  rows={2}
                  value={bookForm.description}
                  onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                  placeholder="Tóm tắt nội dung sách..."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setBookModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {editingBook ? 'Lưu thay đổi' : 'Thêm đầu sách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Copies Modal */}
      {activeCopiesBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Quản lý bản sao: {activeCopiesBook.title}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {activeCopiesBook.author} · {activeCopiesBook.shelfLocation} · Tổng{' '}
                  <span className="font-semibold tabular-nums">{activeBookCopies.length}</span> bản
                  sao
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCopiesBookId(null)}
                aria-label="Đóng quản lý bản sao"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Add New Copy Form */}
            <form
              onSubmit={handleAddCopySubmit}
              className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-12"
            >
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-600">Mã bản sao</label>
                <input
                  type="text"
                  required
                  value={newCopyCode}
                  onChange={(e) => setNewCopyCode(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600">Tình trạng</label>
                <select
                  value={newCopyCondition}
                  onChange={(e) => setNewCopyCondition(e.target.value as CopyCondition)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
                >
                  <option value="Mới">Mới</option>
                  <option value="Tốt">Tốt</option>
                  <option value="Khá">Khá</option>
                  <option value="Cần bảo trì">Cần bảo trì</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600">Trạng thái</label>
                <select
                  value={newCopyStatus}
                  onChange={(e) => setNewCopyStatus(e.target.value as CopyStatus)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
                >
                  <option value="available">Còn sẵn</option>
                  <option value="damaged">Hư hỏng</option>
                  <option value="lost">Đã mất</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-600">Ghi chú</label>
                <input
                  type="text"
                  value={newCopyNote}
                  onChange={(e) => setNewCopyNote(e.target.value)}
                  placeholder="Tùy chọn"
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="flex items-end sm:col-span-2">
                <button
                  type="submit"
                  className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  + Thêm bản
                </button>
              </div>
            </form>

            {/* Copies Table */}
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5">Mã bản sao</th>
                    <th className="px-4 py-2.5">Trạng thái</th>
                    <th className="px-4 py-2.5">Tình trạng</th>
                    <th className="px-4 py-2.5">Ngày nhập</th>
                    <th className="px-4 py-2.5">Ghi chú</th>
                    <th className="px-4 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeBookCopies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                        Chưa có bản sao nào cho đầu sách này. Hãy thêm bản sao ở trên.
                      </td>
                    </tr>
                  ) : (
                    activeBookCopies.map((copy) => {
                      const isEditing = editingCopyId === copy.id;
                      const st = COPY_STATUS_LABEL[copy.status];

                      if (isEditing) {
                        return (
                          <tr key={copy.id} className="bg-blue-50/40">
                            <td className="px-4 py-2.5">
                              <input
                                type="text"
                                value={editCopyForm.copyCode}
                                onChange={(e) =>
                                  setEditCopyForm({ ...editCopyForm, copyCode: e.target.value })
                                }
                                className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <select
                                value={editCopyForm.status}
                                disabled={copy.status === 'borrowed'}
                                onChange={(e) =>
                                  setEditCopyForm({
                                    ...editCopyForm,
                                    status: e.target.value as CopyStatus,
                                  })
                                }
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:bg-slate-100"
                              >
                                <option value="available">Còn sẵn</option>
                                {copy.status === 'borrowed' && (
                                  <option value="borrowed">Đang mượn</option>
                                )}
                                <option value="damaged">Hư hỏng</option>
                                <option value="lost">Đã mất</option>
                              </select>
                            </td>
                            <td className="px-4 py-2.5">
                              <select
                                value={editCopyForm.condition}
                                onChange={(e) =>
                                  setEditCopyForm({
                                    ...editCopyForm,
                                    condition: e.target.value as CopyCondition,
                                  })
                                }
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                              >
                                <option value="Mới">Mới</option>
                                <option value="Tốt">Tốt</option>
                                <option value="Khá">Khá</option>
                                <option value="Cần bảo trì">Cần bảo trì</option>
                              </select>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-500 tabular-nums">
                              {formatDateVN(copy.acquiredAt)}
                            </td>
                            <td className="px-4 py-2.5">
                              <input
                                type="text"
                                value={editCopyForm.note}
                                onChange={(e) =>
                                  setEditCopyForm({ ...editCopyForm, note: e.target.value })
                                }
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap">
                              <div className="inline-flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => saveEditCopy(copy.id)}
                                  className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                  Lưu
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCopyId(null)}
                                  className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                                >
                                  Hủy
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={copy.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-900">
                            {copy.copyCode}
                          </td>
                          <td className={`px-4 py-2.5 text-xs font-semibold ${st.colorClass}`}>
                            {st.label}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-700">{copy.condition}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-500 tabular-nums">
                            {formatDateVN(copy.acquiredAt)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">
                            {copy.note || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditCopy(copy)}
                                className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => setCopyToDelete(copy)}
                                className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-red-600 hover:border-red-200 hover:bg-red-50"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Book Confirm */}
      <ConfirmModal
        open={Boolean(bookToDelete)}
        title="Xác nhận xóa đầu sách"
        message={
          bookToDelete
            ? `Bạn có chắc muốn xóa đầu sách "${bookToDelete.title}" và các bản sao thuộc đầu sách này? Hành động này không thể hoàn tác.`
            : ''
        }
        onCancel={() => setBookToDelete(null)}
        onConfirm={() => {
          if (bookToDelete) {
            onNotify(onDeleteBook(bookToDelete.id));
            setBookToDelete(null);
          }
        }}
      />

      {/* Delete Copy Confirm */}
      <ConfirmModal
        open={Boolean(copyToDelete)}
        title="Xác nhận xóa bản sao"
        message={
          copyToDelete
            ? `Bạn có chắc muốn xóa bản sao "${copyToDelete.copyCode}"?`
            : ''
        }
        onCancel={() => setCopyToDelete(null)}
        onConfirm={() => {
          if (copyToDelete) {
            onNotify(onDeleteCopy(copyToDelete.id));
            setCopyToDelete(null);
          }
        }}
      />
    </div>
  );
}
