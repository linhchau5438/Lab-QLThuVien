import { CalendarClock, Search, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import {
  ActionResult,
  Book,
  BookCopy,
  BorrowDetail,
  BorrowRecord,
  Reader,
} from '../types/library';
import {
  addDaysISO,
  formatDateVN,
  getOverdueDays,
  getTodayISO,
  isRecordCurrentlyOverdue,
} from '../utils/dateUtils';

interface RenewPageProps {
  books: Book[];
  bookCopies: BookCopy[];
  readers: Reader[];
  borrowRecords: BorrowRecord[];
  borrowDetails: BorrowDetail[];
  onRenewRecord: (recordId: string, newDueDate: string, note?: string) => ActionResult;
  onNotify: (res: ActionResult) => void;
}

export function RenewPage({
  books,
  bookCopies,
  readers,
  borrowRecords,
  borrowDetails,
  onRenewRecord,
  onNotify,
}: RenewPageProps) {
  const today = getTodayISO();
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'active' | 'overdue' | 'all'>('active');

  const [renewingRecord, setRenewingRecord] = useState<BorrowRecord | null>(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [renewNote, setRenewNote] = useState('');

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return borrowRecords
      .filter((rec) => {
        const overdue = isRecordCurrentlyOverdue(rec, today);
        if (filterMode === 'active' && rec.status !== 'borrowing') return false;
        if (filterMode === 'overdue' && !overdue) return false;

        if (!q) return true;
        const reader = readers.find((r) => r.id === rec.readerId);
        return (
          rec.recordCode.toLowerCase().includes(q) ||
          (reader?.fullName?.toLowerCase().includes(q) ?? false) ||
          (reader?.readerCode?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'borrowing' ? -1 : 1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [borrowRecords, readers, search, filterMode, today]);

  const openRenewModal = (rec: BorrowRecord) => {
    if (rec.status === 'returned') {
      onNotify({
        ok: false,
        message: `Phiếu ${rec.recordCode} đã hoàn tất, không thể gia hạn.`,
      });
      return;
    }
    setRenewingRecord(rec);
    const baseDate = rec.dueDate > today ? rec.dueDate : today;
    setNewDueDate(addDaysISO(baseDate, 7));
    setRenewNote(rec.notes || '');
  };

  const handleRenewSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!renewingRecord) return;
    const res = onRenewRecord(renewingRecord.id, newDueDate, renewNote);
    onNotify(res);
    if (res.ok) {
      setRenewingRecord(null);
    }
  };

  const applyPreset = (days: number) => {
    if (!renewingRecord) return;
    const base = renewingRecord.dueDate > today ? renewingRecord.dueDate : today;
    setNewDueDate(addDaysISO(base, days));
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã phiếu, tên hoặc mã độc giả..."
            className="w-full rounded-lg border border-slate-200 py-2 pr-3 pl-9 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              { key: 'active', label: 'Đang mượn' },
              { key: 'overdue', label: 'Quá hạn' },
              { key: 'all', label: 'Tất cả phiếu' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterMode(tab.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                filterMode === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <p className="text-sm font-medium text-slate-700">
            Danh sách phiếu mượn ({filteredRecords.length}) — Lưu ý: Phiếu đã hoàn tất không thể gia hạn
          </p>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <CalendarClock className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-700">
              Không tìm thấy phiếu mượn phù hợp
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3">Mã phiếu</th>
                  <th className="px-5 py-3">Độc giả</th>
                  <th className="px-5 py-3">Sách trong phiếu</th>
                  <th className="px-5 py-3">Ngày mượn</th>
                  <th className="px-5 py-3">Hạn trả hiện tại</th>
                  <th className="px-5 py-3 text-right">Số lần gia hạn</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => {
                  const reader = readers.find((r) => r.id === rec.readerId);
                  const details = borrowDetails.filter((d) => d.borrowRecordId === rec.id);
                  const activeBooksText = details
                    .filter((d) => rec.status === 'returned' || d.status === 'borrowed')
                    .map((d) => {
                      const b = books.find((bk) => bk.id === d.bookId);
                      const c = bookCopies.find((cp) => cp.id === d.bookCopyId);
                      return `${b?.title || 'Sách'} (${c?.copyCode || ''})`;
                    })
                    .join(', ');
                  const overdue = isRecordCurrentlyOverdue(rec, today);
                  const isCompleted = rec.status === 'returned';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {rec.recordCode}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">{reader?.fullName || '—'}</p>
                        <p className="font-mono text-xs text-slate-400">{reader?.readerCode}</p>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <p className="truncate text-xs text-slate-700" title={activeBooksText}>
                          {activeBooksText || '—'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-xs text-slate-600 whitespace-nowrap">
                        {formatDateVN(rec.borrowDate)}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums whitespace-nowrap">
                        <p className="text-xs font-semibold text-slate-900">
                          {formatDateVN(rec.dueDate)}
                        </p>
                        {isCompleted ? (
                          <span className="text-[11px] font-medium text-emerald-700">
                            Đã hoàn tất ({formatDateVN(rec.returnDate)})
                          </span>
                        ) : overdue ? (
                          <span className="text-[11px] font-semibold text-red-600">
                            Quá hạn {getOverdueDays(rec.dueDate, today)} ngày
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-blue-600">Đang mượn</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-slate-700">
                        {rec.renewalCount}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isCompleted}
                          onClick={() => openRenewModal(rec)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            isCompleted
                              ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                          <span>{isCompleted ? 'Đã hoàn tất' : 'Gia hạn'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Renew Modal */}
      {renewingRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Gia hạn phiếu {renewingRecord.recordCode}
                </h2>
                <p className="text-xs text-slate-500">
                  Hạn trả hiện tại:{' '}
                  <strong className="tabular-nums text-slate-800">
                    {formatDateVN(renewingRecord.dueDate)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRenewingRecord(null)}
                aria-label="Đóng"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRenewSubmit} className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Hạn trả mới <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[7, 14, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => applyPreset(d)}
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
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums focus:border-blue-600 focus:outline-none"
                />
                {newDueDate && newDueDate <= renewingRecord.dueDate && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    Hạn trả mới phải sau hạn trả hiện tại ({formatDateVN(renewingRecord.dueDate)}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Lý do / Ghi chú gia hạn
                </label>
                <input
                  type="text"
                  value={renewNote}
                  onChange={(e) => setRenewNote(e.target.value)}
                  placeholder="Ví dụ: Độc giả đề nghị gia hạn thêm 1 tuần"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setRenewingRecord(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Xác nhận gia hạn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
