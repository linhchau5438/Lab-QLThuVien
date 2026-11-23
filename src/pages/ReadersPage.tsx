import { History, Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  ActionResult,
  Book,
  BookCopy,
  BorrowDetail,
  BorrowRecord,
  Reader,
  ReaderStatus,
} from '../types/library';
import {
  addDaysISO,
  formatDateVN,
  getOverdueDays,
  getTodayISO,
  isRecordCurrentlyOverdue,
  wasReturnedLate,
} from '../utils/dateUtils';

interface ReadersPageProps {
  readers: Reader[];
  books: Book[];
  bookCopies: BookCopy[];
  borrowRecords: BorrowRecord[];
  borrowDetails: BorrowDetail[];
  onAddReader: (
    input: Omit<Reader, 'id' | 'createdAt' | 'readerCode'> & { readerCode?: string }
  ) => ActionResult;
  onUpdateReader: (readerId: string, updates: Omit<Reader, 'id' | 'createdAt'>) => ActionResult;
  onDeleteReader: (readerId: string) => ActionResult;
  onNotify: (res: ActionResult) => void;
}

export function ReadersPage({
  readers,
  books,
  bookCopies,
  borrowRecords,
  borrowDetails,
  onAddReader,
  onUpdateReader,
  onDeleteReader,
  onNotify,
}: ReadersPageProps) {
  const today = getTodayISO();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReaderStatus>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingReader, setEditingReader] = useState<Reader | null>(null);
  const [form, setForm] = useState({
    readerCode: '',
    fullName: '',
    email: '',
    phone: '',
    address: '',
    cardExpiry: addDaysISO(today, 365),
    status: 'active' as ReaderStatus,
  });

  const [readerToDelete, setReaderToDelete] = useState<Reader | null>(null);
  const [historyReaderId, setHistoryReaderId] = useState<string | null>(null);

  const historyReader = useMemo(
    () => (historyReaderId ? readers.find((r) => r.id === historyReaderId) || null : null),
    [readers, historyReaderId]
  );

  const filteredReaders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return readers.filter((r) => {
      const matchQ =
        !q ||
        r.fullName.toLowerCase().includes(q) ||
        r.readerCode.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [readers, search, statusFilter]);

  const openAdd = () => {
    setEditingReader(null);
    let maxNum = 0;
    for (const r of readers) {
      const m = /^DG-(\d+)$/i.exec(r.readerCode);
      if (m && Number(m[1]) > maxNum) maxNum = Number(m[1]);
    }
    setForm({
      readerCode: `DG-${String(maxNum + 1).padStart(3, '0')}`,
      fullName: '',
      email: '',
      phone: '',
      address: '',
      cardExpiry: addDaysISO(today, 365),
      status: 'active',
    });
    setModalOpen(true);
  };

  const openEdit = (reader: Reader) => {
    setEditingReader(reader);
    setForm({
      readerCode: reader.readerCode,
      fullName: reader.fullName,
      email: reader.email,
      phone: reader.phone,
      address: reader.address,
      cardExpiry: reader.cardExpiry,
      status: reader.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = editingReader
      ? onUpdateReader(editingReader.id, form)
      : onAddReader(form);
    onNotify(res);
    if (res.ok) {
      setModalOpen(false);
    }
  };

  const historyRecords = useMemo(() => {
    if (!historyReader) return [];
    return borrowRecords
      .filter((rec) => rec.readerId === historyReader.id)
      .sort((a, b) => b.borrowDate.localeCompare(a.borrowDate));
  }, [borrowRecords, historyReader]);

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
              placeholder="Tìm theo tên, mã thẻ, SĐT hoặc email..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | ReaderStatus)}
            aria-label="Lọc trạng thái thẻ"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Tạm khóa</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm độc giả</span>
        </button>
      </div>

      {/* Readers Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <p className="text-sm font-medium text-slate-700">
            Hiển thị <span className="font-semibold tabular-nums">{filteredReaders.length}</span> /{' '}
            <span className="tabular-nums">{readers.length}</span> độc giả
          </p>
        </div>

        {filteredReaders.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <Users className="h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              Không tìm thấy độc giả nào
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Hãy thử từ khóa khác hoặc thêm thẻ độc giả mới.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3">Mã thẻ</th>
                  <th className="px-5 py-3">Họ tên & Địa chỉ</th>
                  <th className="px-5 py-3">Liên hệ</th>
                  <th className="px-5 py-3">Hạn thẻ</th>
                  <th className="px-5 py-3 text-right">Phiếu đang mượn</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReaders.map((reader) => {
                  const activeLoans = borrowRecords.filter(
                    (rec) => rec.readerId === reader.id && rec.status !== 'returned'
                  );
                  const totalLoans = borrowRecords.filter(
                    (rec) => rec.readerId === reader.id
                  ).length;

                  return (
                    <tr key={reader.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {reader.readerCode}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{reader.fullName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {reader.address || 'Chưa cập nhật địa chỉ'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-slate-800 tabular-nums">{reader.phone}</p>
                        <p className="text-xs text-slate-500">{reader.email || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {formatDateVN(reader.cardExpiry)}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        <span
                          className={`font-semibold ${
                            activeLoans.length > 0 ? 'text-blue-700' : 'text-slate-500'
                          }`}
                        >
                          {activeLoans.length}
                        </span>
                        <span className="text-xs text-slate-400"> / {totalLoans} lượt</span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {reader.status === 'active' ? (
                          <span className="text-xs font-semibold text-emerald-700">
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-red-600">Tạm khóa</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setHistoryReaderId(reader.id)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            <History className="h-3.5 w-3.5" />
                            <span>Lịch sử</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(reader)}
                            aria-label={`Sửa độc giả ${reader.fullName}`}
                            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setReaderToDelete(reader)}
                            aria-label={`Xóa độc giả ${reader.fullName}`}
                            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
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

      {/* Add/Edit Reader Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingReader ? 'Cập nhật thông tin độc giả' : 'Đăng ký độc giả mới'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Đóng"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Mã thẻ độc giả <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.readerCode}
                    onChange={(e) => setForm({ ...form, readerCode: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Trạng thái thẻ
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as ReaderStatus })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="locked">Tạm khóa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Họ và tên <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Số điện thoại <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="0901..."
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="docgia@email.com"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Hạn sử dụng thẻ
                  </label>
                  <input
                    type="date"
                    required
                    value={form.cardExpiry}
                    onChange={(e) => setForm({ ...form, cardExpiry: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Địa chỉ</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Số nhà, đường, quận..."
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {editingReader ? 'Lưu thay đổi' : 'Thêm độc giả'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reader Borrow History Modal */}
      {historyReader && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Lịch sử mượn sách: {historyReader.fullName}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Mã thẻ <span className="font-mono">{historyReader.readerCode}</span> ·{' '}
                  {historyReader.phone} · Tổng {historyRecords.length} phiếu mượn
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryReaderId(null)}
                aria-label="Đóng lịch sử"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {historyRecords.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Độc giả này chưa có lịch sử mượn sách nào.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {historyRecords.map((rec) => {
                  const details = borrowDetails.filter((d) => d.borrowRecordId === rec.id);
                  const overdueNow = isRecordCurrentlyOverdue(rec, today);
                  const returnedLate =
                    rec.status === 'returned' && wasReturnedLate(rec.dueDate, rec.returnDate);

                  return (
                    <div
                      key={rec.id}
                      className="rounded-lg border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span className="font-mono font-semibold text-slate-900">
                            {rec.recordCode}
                          </span>
                          <span>·</span>
                          <span>Mượn: {formatDateVN(rec.borrowDate)}</span>
                          <span>·</span>
                          <span>Hạn trả: {formatDateVN(rec.dueDate)}</span>
                          {rec.renewalCount > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-blue-700 font-medium">
                                Đã gia hạn {rec.renewalCount} lần
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-xs font-semibold">
                          {rec.status === 'returned' ? (
                            <span
                              className={returnedLate ? 'text-amber-700' : 'text-emerald-700'}
                            >
                              Đã trả {formatDateVN(rec.returnDate)}
                              {returnedLate ? ' (Trả trễ hạn)' : ''}
                            </span>
                          ) : overdueNow ? (
                            <span className="text-red-600">
                              Quá hạn {getOverdueDays(rec.dueDate, today)} ngày
                            </span>
                          ) : (
                            <span className="text-blue-700">Đang mượn</span>
                          )}
                        </div>
                      </div>

                      <ul className="mt-2.5 divide-y divide-slate-200/70">
                        {details.map((det) => {
                          const book = books.find((b) => b.id === det.bookId);
                          const copy = bookCopies.find((c) => c.id === det.bookCopyId);
                          return (
                            <li
                              key={det.id}
                              className="flex items-center justify-between gap-3 py-1.5 text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-medium text-slate-900">
                                  {book?.title || 'Sách đã xóa'}
                                </span>
                                <span className="ml-2 font-mono text-slate-500">
                                  ({copy?.copyCode || det.bookCopyId})
                                </span>
                              </div>
                              <span
                                className={`shrink-0 font-medium ${
                                  det.status === 'returned' ? 'text-emerald-700' : 'text-blue-700'
                                }`}
                              >
                                {det.status === 'returned'
                                  ? `Đã trả ${formatDateVN(det.returnDate)}`
                                  : 'Chưa trả'}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Reader Confirm */}
      <ConfirmModal
        open={Boolean(readerToDelete)}
        title="Xác nhận xóa độc giả"
        message={
          readerToDelete
            ? `Bạn có chắc muốn xóa độc giả "${readerToDelete.fullName}" (${readerToDelete.readerCode})? Lưu ý: Hệ thống không cho phép xóa độc giả đang có phiếu mượn chưa hoàn tất.`
            : ''
        }
        onCancel={() => setReaderToDelete(null)}
        onConfirm={() => {
          if (readerToDelete) {
            onNotify(onDeleteReader(readerToDelete.id));
            setReaderToDelete(null);
          }
        }}
      />
    </div>
  );
}
