import { AlertCircle, BookMarked, Check, Plus, Search, Trash2, UserCheck } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { ActionResult, Book, BookCopy, BorrowRecord, Reader } from '../types/library';
import { addDaysISO, formatDateVN, getTodayISO } from '../utils/dateUtils';

interface BorrowPageProps {
  books: Book[];
  bookCopies: BookCopy[];
  readers: Reader[];
  borrowRecords: BorrowRecord[];
  onCreateBorrowRecord: (input: {
    readerId: string;
    copyIds: string[];
    borrowDate: string;
    dueDate: string;
    notes?: string;
  }) => ActionResult;
  onNotify: (res: ActionResult) => void;
}

export function BorrowPage({
  books,
  bookCopies,
  readers,
  borrowRecords,
  onCreateBorrowRecord,
  onNotify,
}: BorrowPageProps) {
  const today = getTodayISO();
  const [selectedReaderId, setSelectedReaderId] = useState<string>('');
  const [borrowDate, setBorrowDate] = useState<string>(today);
  const [dueDate, setDueDate] = useState<string>(addDaysISO(today, 14));
  const [notes, setNotes] = useState<string>('');
  const [selectedCopyIds, setSelectedCopyIds] = useState<string[]>([]);

  const [copySearch, setCopySearch] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  const isDateInvalid = Boolean(borrowDate && dueDate && dueDate < borrowDate);

  const selectedReader = readers.find((r) => r.id === selectedReaderId) || null;
  const isCardExpired = Boolean(
    selectedReader && selectedReader.cardExpiry && borrowDate && selectedReader.cardExpiry < borrowDate
  );
  const totalAvailableCount = useMemo(
    () => bookCopies.filter((c) => c.status === 'available').length,
    [bookCopies]
  );

  const readerActiveLoansCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of borrowRecords) {
      if (r.status !== 'returned') {
        map.set(r.readerId, (map.get(r.readerId) || 0) + 1);
      }
    }
    return map;
  }, [borrowRecords]);

  const enrichedCopies = useMemo(() => {
    const q = copySearch.trim().toLowerCase();
    return bookCopies
      .map((copy) => {
        const book = books.find((b) => b.id === copy.bookId);
        return { copy, book };
      })
      .filter(({ copy, book }) => {
        if (!book) return false;
        if (showOnlyAvailable && copy.status !== 'available') return false;
        if (!q) return true;
        return (
          book.title.toLowerCase().includes(q) ||
          book.author.toLowerCase().includes(q) ||
          copy.copyCode.toLowerCase().includes(q) ||
          book.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Available copies first
        if (a.copy.status === 'available' && b.copy.status !== 'available') return -1;
        if (a.copy.status !== 'available' && b.copy.status === 'available') return 1;
        return a.copy.copyCode.localeCompare(b.copy.copyCode);
      });
  }, [bookCopies, books, copySearch, showOnlyAvailable]);

  const toggleCopy = (copy: BookCopy) => {
    if (copy.status !== 'available') {
      onNotify({
        ok: false,
        message: `Bản sao "${copy.copyCode}" hiện không còn sẵn, không thể chọn mượn.`,
      });
      return;
    }
    setSelectedCopyIds((prev) =>
      prev.includes(copy.id) ? prev.filter((id) => id !== copy.id) : [...prev, copy.id]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = onCreateBorrowRecord({
      readerId: selectedReaderId,
      copyIds: selectedCopyIds,
      borrowDate,
      dueDate,
      notes,
    });
    onNotify(res);
    if (res.ok) {
      setSelectedCopyIds([]);
      setNotes('');
    }
  };

  const applyDurationPreset = (days: number) => {
    if (!borrowDate) return;
    setDueDate(addDaysISO(borrowDate, days));
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column: Reader, Dates, Copy Selection */}
      <div className="space-y-6 lg:col-span-8">
        {/* Step 1: Reader & Dates */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">
            1. Thông tin độc giả và thời hạn mượn
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Chọn độc giả đang hoạt động và thiết lập ngày mượn, hạn trả hợp lệ
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                Độc giả mượn sách <span className="text-red-600">*</span>
              </label>
              <select
                required
                value={selectedReaderId}
                onChange={(e) => setSelectedReaderId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="">-- Chọn độc giả --</option>
                {readers.map((reader) => {
                  const activeCount = readerActiveLoansCount.get(reader.id) || 0;
                  const locked = reader.status === 'locked';
                  const expired = Boolean(reader.cardExpiry && borrowDate && reader.cardExpiry < borrowDate);
                  return (
                    <option key={reader.id} value={reader.id} disabled={locked || expired}>
                      {reader.readerCode} — {reader.fullName} ({reader.phone})
                      {locked
                        ? ' [Thẻ đang tạm khóa]'
                        : expired
                        ? ` [Thẻ hết hạn ${formatDateVN(reader.cardExpiry)}]`
                        : activeCount > 0
                        ? ` [Đang mượn ${activeCount} phiếu]`
                        : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Ngày mượn <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                required
                value={borrowDate}
                onChange={(e) => setBorrowDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Hạn trả <span className="text-red-600">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => applyDurationPreset(d)}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      +{d} ngày
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm tabular-nums focus:outline-none ${
                  isDateInvalid
                    ? 'border-red-400 bg-red-50/40 focus:border-red-600'
                    : 'border-slate-200 focus:border-blue-600'
                }`}
              />
            </div>
          </div>

          {isDateInvalid && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Hạn trả không được trước ngày mượn. Vui lòng chọn hạn trả hợp lệ.</span>
            </div>
          )}

          {isCardExpired && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Thẻ của độc giả &quot;{selectedReader?.fullName}&quot; đã hết hạn (
                {formatDateVN(selectedReader?.cardExpiry)}), không thể mượn sách.
              </span>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-700">Ghi chú phiếu mượn</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú thêm (tùy chọn)..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
        </section>

        {/* Step 2: Select Available Copies */}
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  2. Chọn bản sao sách còn sẵn ({totalAvailableCount}/{bookCopies.length})
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Chỉ các bản sao ở trạng thái Còn sẵn mới được phép đưa vào phiếu mượn
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={showOnlyAvailable}
                  onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span>Chỉ hiện bản còn sẵn</span>
              </label>
            </div>

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={copySearch}
                onChange={(e) => setCopySearch(e.target.value)}
                placeholder="Tìm theo tên sách, tác giả, mã bản sao..."
                className="w-full rounded-lg border border-slate-200 py-2 pr-3 pl-9 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
            {enrichedCopies.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500">
                Không tìm thấy bản sao phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              enrichedCopies.map(({ copy, book }) => {
                if (!book) return null;
                const isAvailable = copy.status === 'available';
                const isSelected = selectedCopyIds.includes(copy.id);

                return (
                  <div
                    key={copy.id}
                    className={`flex items-center justify-between gap-4 px-5 py-3 transition-colors ${
                      isSelected
                        ? 'bg-blue-50/70'
                        : isAvailable
                        ? 'hover:bg-slate-50'
                        : 'bg-slate-50/60 opacity-75'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {copy.copyCode}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {book.title}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {book.author} · {book.category} · {book.shelfLocation} · Tình trạng:{' '}
                        {copy.condition}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-xs font-semibold ${
                          copy.status === 'available'
                            ? 'text-emerald-700'
                            : copy.status === 'borrowed'
                            ? 'text-blue-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {copy.status === 'available'
                          ? 'Còn sẵn'
                          : copy.status === 'borrowed'
                          ? 'Đang mượn'
                          : copy.status === 'damaged'
                          ? 'Hư hỏng'
                          : 'Đã mất'}
                      </span>

                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => toggleCopy(copy)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                          isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : isAvailable
                            ? 'border border-blue-200 bg-white text-blue-700 hover:bg-blue-50'
                            : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Đã chọn</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>Chọn mượn</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Right Column: Live Summary Slip */}
      <div className="lg:col-span-4">
        <div className="sticky top-22 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <BookMarked className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Phiếu mượn dự kiến</h2>
              <p className="text-xs text-slate-500">Kiểm tra thông tin trước khi xác nhận</p>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500">Độc giả:</span>
              {selectedReader ? (
                <div className="text-right">
                  <p className="font-semibold text-slate-900 flex items-center justify-end gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>{selectedReader.fullName}</span>
                  </p>
                  <p className="font-mono text-xs text-slate-500">{selectedReader.readerCode}</p>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Chưa chọn độc giả</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Ngày mượn:</span>
              <span className="font-medium tabular-nums text-slate-900">
                {formatDateVN(borrowDate)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Hạn trả:</span>
              <span
                className={`font-semibold tabular-nums ${
                  isDateInvalid ? 'text-red-600' : 'text-blue-700'
                }`}
              >
                {formatDateVN(dueDate)}
              </span>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Danh sách bản sao ({selectedCopyIds.length})
              </span>
              {selectedCopyIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCopyIds([])}
                  className="text-xs text-slate-500 hover:text-red-600"
                >
                  Xóa hết
                </button>
              )}
            </div>

            {selectedCopyIds.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                Chưa có bản sao nào được chọn. Hãy chọn ở danh sách bên trái.
              </p>
            ) : (
              <ul className="mt-2.5 max-h-60 space-y-2 overflow-y-auto">
                {selectedCopyIds.map((cid) => {
                  const copy = bookCopies.find((c) => c.id === cid);
                  const book = copy ? books.find((b) => b.id === copy.bookId) : null;
                  if (!copy || !book) return null;
                  return (
                    <li
                      key={cid}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          {book.title}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500">{copy.copyCode}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCopyIds((prev) => prev.filter((id) => id !== cid))
                        }
                        aria-label={`Bỏ chọn ${copy.copyCode}`}
                        className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={
              !selectedReaderId || selectedCopyIds.length === 0 || isDateInvalid || isCardExpired
            }
            className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 transition-colors"
          >
            Xác nhận lập phiếu mượn
          </button>
        </div>
      </div>
    </form>
  );
}
