import { AlertTriangle, CheckCircle2, Search, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActionResult,
  Book,
  BookCopy,
  BorrowDetail,
  BorrowRecord,
  CopyCondition,
  Reader,
} from '../types/library';
import {
  formatDateVN,
  getOverdueDays,
  getTodayISO,
  isRecordCurrentlyOverdue,
  wasReturnedLate,
} from '../utils/dateUtils';

interface ReturnPageProps {
  books: Book[];
  bookCopies: BookCopy[];
  readers: Reader[];
  borrowRecords: BorrowRecord[];
  borrowDetails: BorrowDetail[];
  onReturnDetails: (input: {
    recordId: string;
    detailIds: string[];
    returnDate: string;
    returnCondition?: CopyCondition;
    copyFinalStatus?: 'available' | 'damaged' | 'lost';
  }) => ActionResult;
  onNotify: (res: ActionResult) => void;
}

export function ReturnPage({
  books,
  bookCopies,
  readers,
  borrowRecords,
  borrowDetails,
  onReturnDetails,
  onNotify,
}: ReturnPageProps) {
  const today = getTodayISO();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'borrowing' | 'overdue' | 'returned' | 'all'>(
    'borrowing'
  );
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [returnDate, setReturnDate] = useState<string>(today);
  const [returnCondition, setReturnCondition] = useState<CopyCondition>('Tốt');
  const [copyFinalStatus, setCopyFinalStatus] = useState<'available' | 'damaged' | 'lost'>(
    'available'
  );
  const [selectedDetailIds, setSelectedDetailIds] = useState<string[]>([]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return borrowRecords
      .filter((rec) => {
        const overdue = isRecordCurrentlyOverdue(rec, today);
        if (statusFilter === 'borrowing' && rec.status !== 'borrowing') return false;
        if (statusFilter === 'overdue' && !overdue) return false;
        if (statusFilter === 'returned' && rec.status !== 'returned') return false;

        if (!q) return true;
        const reader = readers.find((r) => r.id === rec.readerId);
        const recDetails = borrowDetails.filter((d) => d.borrowRecordId === rec.id);
        const matchesBookOrCopy = recDetails.some((d) => {
          const book = books.find((b) => b.id === d.bookId);
          const copy = bookCopies.find((c) => c.id === d.bookCopyId);
          return (
            (book?.title?.toLowerCase().includes(q) ?? false) ||
            (copy?.copyCode?.toLowerCase().includes(q) ?? false)
          );
        });

        return (
          rec.recordCode.toLowerCase().includes(q) ||
          (reader?.fullName?.toLowerCase().includes(q) ?? false) ||
          (reader?.readerCode?.toLowerCase().includes(q) ?? false) ||
          matchesBookOrCopy
        );
      })
      .sort((a, b) => {
        // Prioritize active overdue, then active, then returned
        if (a.status !== b.status) return a.status === 'borrowing' ? -1 : 1;
        return b.borrowDate.localeCompare(a.borrowDate);
      });
  }, [borrowRecords, borrowDetails, readers, books, bookCopies, search, statusFilter, today]);

  const activeRecord = useMemo(() => {
    if (selectedRecordId) {
      const found = borrowRecords.find((r) => r.id === selectedRecordId);
      if (found) return found;
    }
    return filteredRecords[0] || null;
  }, [borrowRecords, filteredRecords, selectedRecordId]);

  const activeDetails = useMemo(() => {
    if (!activeRecord) return [];
    return borrowDetails.filter((d) => d.borrowRecordId === activeRecord.id);
  }, [borrowDetails, activeRecord]);

  const activeReader = activeRecord
    ? readers.find((r) => r.id === activeRecord.readerId) || null
    : null;

  useEffect(() => {
    if (!activeRecord) {
      setSelectedDetailIds([]);
      return;
    }
    const unreturnedIds = borrowDetails
      .filter((d) => d.borrowRecordId === activeRecord.id && d.status === 'borrowed')
      .map((d) => d.id);
    setSelectedDetailIds(unreturnedIds);
  }, [activeRecord?.id, borrowDetails]);

  const handleSelectRecord = (rec: BorrowRecord) => {
    setSelectedRecordId(rec.id);
    setReturnDate(today);
    setReturnCondition('Tốt');
    setCopyFinalStatus('available');
  };

  const toggleDetail = (detailId: string, alreadyReturned: boolean) => {
    if (alreadyReturned) {
      onNotify({
        ok: false,
        message: 'Bản sao này đã được trả trước đó, không thể trả hai lần.',
      });
      return;
    }
    setSelectedDetailIds((prev) =>
      prev.includes(detailId) ? prev.filter((id) => id !== detailId) : [...prev, detailId]
    );
  };

  const handleConfirmReturn = (detailIdsToReturn: string[]) => {
    if (!activeRecord) return;
    const res = onReturnDetails({
      recordId: activeRecord.id,
      detailIds: detailIdsToReturn,
      returnDate,
      returnCondition,
      copyFinalStatus,
    });
    onNotify(res);
    if (res.ok) {
      setSelectedDetailIds([]);
    }
  };

  const unreturnedDetails = activeDetails.filter((d) => d.status === 'borrowed');
  const isReturnDateBeforeBorrow = Boolean(
    activeRecord && returnDate && returnDate < activeRecord.borrowDate
  );
  const overdueDaysForReturn =
    activeRecord && returnDate > activeRecord.dueDate
      ? getOverdueDays(activeRecord.dueDate, returnDate)
      : 0;

  return (
    <div className="space-y-5">
      {/* Search & Status Filter */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã phiếu, tên độc giả, tên sách, mã bản sao..."
            className="w-full rounded-lg border border-slate-200 py-2 pr-3 pl-9 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              { key: 'borrowing', label: 'Đang mượn' },
              { key: 'overdue', label: 'Quá hạn' },
              { key: 'returned', label: 'Đã hoàn tất' },
              { key: 'all', label: 'Tất cả' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Master-Detail Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Matching Borrow Records */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden lg:col-span-5">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Danh sách phiếu mượn ({filteredRecords.length})
            </h2>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              Không có phiếu mượn nào phù hợp.
            </div>
          ) : (
            <ul className="max-h-[540px] divide-y divide-slate-100 overflow-y-auto">
              {filteredRecords.map((rec) => {
                const reader = readers.find((r) => r.id === rec.readerId);
                const details = borrowDetails.filter((d) => d.borrowRecordId === rec.id);
                const unreturnedCount = details.filter((d) => d.status === 'borrowed').length;
                const overdue = isRecordCurrentlyOverdue(rec, today);
                const isSelected = activeRecord?.id === rec.id;

                return (
                  <li key={rec.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectRecord(rec)}
                      className={`w-full px-4 py-3.5 text-left transition-colors ${
                        isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {rec.recordCode}
                        </span>
                        {rec.status === 'returned' ? (
                          <span className="text-xs font-semibold text-emerald-700">
                            Đã hoàn tất
                          </span>
                        ) : overdue ? (
                          <span className="text-xs font-semibold text-red-600 tabular-nums">
                            Quá hạn {getOverdueDays(rec.dueDate, today)} ngày
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-blue-700">Đang mượn</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {reader?.fullName || '—'}{' '}
                        <span className="font-mono text-xs text-slate-400">
                          ({reader?.readerCode})
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500 tabular-nums">
                        Mượn {formatDateVN(rec.borrowDate)} · Hạn {formatDateVN(rec.dueDate)} ·{' '}
                        {unreturnedCount > 0
                          ? `Còn ${unreturnedCount}/${details.length} cuốn chưa trả`
                          : `Đã trả ${details.length}/${details.length} cuốn`}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right: Return Details Panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
          {!activeRecord ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
              <Undo2 className="h-9 w-9 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-700">
                Chọn một phiếu mượn ở danh sách bên trái để ghi nhận trả sách
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Record Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900 font-mono">
                      {activeRecord.recordCode}
                    </h2>
                    {activeRecord.status === 'returned' ? (
                      <span className="text-xs font-semibold text-emerald-700">
                        · Đã hoàn tất trả
                      </span>
                    ) : isRecordCurrentlyOverdue(activeRecord, today) ? (
                      <span className="text-xs font-semibold text-red-600 tabular-nums">
                        · Đang quá hạn {getOverdueDays(activeRecord.dueDate, today)} ngày
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-blue-700">· Đang mượn</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    Độc giả:{' '}
                    {activeReader ? (
                      <>
                        <strong>{activeReader.fullName}</strong> ({activeReader.readerCode} ·{' '}
                        {activeReader.phone})
                      </>
                    ) : (
                      <span className="text-slate-400 italic">Độc giả không tồn tại hoặc đã xóa</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                    Ngày mượn: {formatDateVN(activeRecord.borrowDate)} · Hạn trả:{' '}
                    {formatDateVN(activeRecord.dueDate)}
                    {activeRecord.returnDate
                      ? ` · Ngày hoàn tất: ${formatDateVN(activeRecord.returnDate)}`
                      : ''}
                  </p>
                </div>
              </div>

              {/* Overdue Warning Banner */}
              {activeRecord.status === 'borrowing' && overdueDaysForReturn > 0 && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div>
                    <p className="font-semibold">
                      Cảnh báo quá hạn: Trễ {overdueDaysForReturn} ngày so với hạn trả (
                      {formatDateVN(activeRecord.dueDate)})
                    </p>
                    <p className="mt-0.5 text-red-700">
                      Hệ thống vẫn cho phép ghi nhận trả sách và sẽ lưu dấu quá hạn vào lịch sử.
                    </p>
                  </div>
                </div>
              )}

              {/* Returned Late Notice for Completed Records */}
              {activeRecord.status === 'returned' &&
                wasReturnedLate(activeRecord.dueDate, activeRecord.returnDate) && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      Phiếu này đã trả trễ{' '}
                      {getOverdueDays(activeRecord.dueDate, activeRecord.returnDate!)} ngày.
                    </span>
                  </div>
                )}

              {/* Copies List */}
              <div>
                <h3 className="text-xs font-semibold text-slate-700">
                  Chi tiết bản sao trong phiếu ({activeDetails.length} cuốn)
                </h3>
                <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {activeDetails.map((detail) => {
                    const book = books.find((b) => b.id === detail.bookId);
                    const copy = bookCopies.find((c) => c.id === detail.bookCopyId);
                    const isReturned = detail.status === 'returned';
                    const checked = selectedDetailIds.includes(detail.id);

                    return (
                      <label
                        key={detail.id}
                        className={`flex items-center justify-between gap-3 px-4 py-3 ${
                          isReturned
                            ? 'bg-slate-50/70 cursor-not-allowed'
                            : 'cursor-pointer hover:bg-blue-50/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            disabled={isReturned}
                            checked={isReturned ? false : checked}
                            onChange={() => toggleDetail(detail.id, isReturned)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 disabled:opacity-40"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {book?.title || 'Sách đã xóa'}
                            </p>
                            <p className="text-xs text-slate-500">
                              Mã bản sao:{' '}
                              <span className="font-mono font-medium text-slate-700">
                                {copy?.copyCode || detail.bookCopyId}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right text-xs">
                          {isReturned ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 tabular-nums">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Đã trả ({formatDateVN(detail.returnDate)})</span>
                            </span>
                          ) : (
                            <span className="font-semibold text-blue-700">Đang mượn</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Return Form Controls (only when unreturned items exist) */}
              {unreturnedDetails.length > 0 ? (
                <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Ngày trả thực tế
                      </label>
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Tình trạng sách khi trả
                      </label>
                      <select
                        value={returnCondition}
                        onChange={(e) => setReturnCondition(e.target.value as CopyCondition)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      >
                        <option value="Mới">Mới</option>
                        <option value="Tốt">Tốt</option>
                        <option value="Khá">Khá</option>
                        <option value="Cần bảo trì">Cần bảo trì</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Cập nhật trạng thái bản sao
                      </label>
                      <select
                        value={copyFinalStatus}
                        onChange={(e) =>
                          setCopyFinalStatus(
                            e.target.value as 'available' | 'damaged' | 'lost'
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      >
                        <option value="available">Còn sẵn (Cho mượn tiếp)</option>
                        <option value="damaged">Hư hỏng (Cần sửa chữa)</option>
                        <option value="lost">Đã mất</option>
                      </select>
                    </div>
                  </div>

                  {isReturnDateBeforeBorrow && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>
                        Ngày trả không được trước ngày mượn ({formatDateVN(activeRecord.borrowDate)}).
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                    <button
                      type="button"
                      disabled={selectedDetailIds.length === 0 || isReturnDateBeforeBorrow}
                      onClick={() => handleConfirmReturn(selectedDetailIds)}
                      className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Trả các bản đã chọn ({selectedDetailIds.length})
                    </button>
                    <button
                      type="button"
                      disabled={unreturnedDetails.length === 0 || isReturnDateBeforeBorrow}
                      onClick={() =>
                        handleConfirmReturn(unreturnedDetails.map((d) => d.id))
                      }
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      Trả tất cả sách chưa trả ({unreturnedDetails.length})
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    Tất cả bản sao trong phiếu này đã được trả đầy đủ. Hệ thống không cho phép trả
                    lại bản sao đã hoàn tất.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
