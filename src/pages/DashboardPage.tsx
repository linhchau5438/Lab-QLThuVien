import {
  AlertCircle,
  ArrowRight,
  BookCheck,
  BookCopy as BookCopyIcon,
  BookMarked,
  BookOpen,
  CalendarClock,
  Undo2,
  Users,
} from 'lucide-react';
import { MonthlyChart, MonthlyChartDatum } from '../components/MonthlyChart';
import {
  Book,
  BookCopy,
  BorrowDetail,
  BorrowRecord,
  PageKey,
  Reader,
} from '../types/library';
import {
  formatDateVN,
  formatMonthFullVN,
  formatMonthLabel,
  getMonthKey,
  getOverdueDays,
  getRecentMonthKeys,
  getTodayISO,
  isRecordCurrentlyOverdue,
} from '../utils/dateUtils';

interface DashboardPageProps {
  books: Book[];
  bookCopies: BookCopy[];
  readers: Reader[];
  borrowRecords: BorrowRecord[];
  borrowDetails: BorrowDetail[];
  onNavigate: (page: PageKey) => void;
}

export function DashboardPage({
  books,
  bookCopies,
  readers,
  borrowRecords,
  borrowDetails,
  onNavigate,
}: DashboardPageProps) {
  const today = getTodayISO();

  const totalBooks = books.length;
  const totalCopies = bookCopies.length;
  const availableCopies = bookCopies.filter((c) => c.status === 'available').length;
  const borrowedCopies = bookCopies.filter((c) => c.status === 'borrowed').length;
  const totalReaders = readers.length;
  const overdueRecords = borrowRecords.filter((r) => isRecordCurrentlyOverdue(r, today));
  const overdueCount = overdueRecords.length;

  // Monthly chart data (last 6 months up to max(today, latest borrow record month))
  const latestBorrowMonth = borrowRecords.reduce(
    (max, r) => (getMonthKey(r.borrowDate) > max ? getMonthKey(r.borrowDate) : max),
    today.slice(0, 7)
  );
  const monthKeys = getRecentMonthKeys(6, latestBorrowMonth);
  const monthlyData: MonthlyChartDatum[] = monthKeys.map((mk) => {
    const recordsInMonth = borrowRecords.filter((r) => getMonthKey(r.borrowDate) === mk);
    const recordIds = new Set(recordsInMonth.map((r) => r.id));
    const borrowedCopiesInMonth = borrowDetails.filter((d) =>
      recordIds.has(d.borrowRecordId)
    ).length;
    const returnedCopiesInMonth = borrowDetails.filter(
      (d) => d.status === 'returned' && d.returnDate && getMonthKey(d.returnDate) === mk
    ).length;

    return {
      monthKey: mk,
      label: formatMonthLabel(mk),
      fullLabel: formatMonthFullVN(mk),
      borrowRecordsCount: recordsInMonth.length,
      borrowedCopiesCount: borrowedCopiesInMonth,
      returnedCopiesCount: returnedCopiesInMonth,
    };
  });

  const kpis = [
    {
      label: 'Tổng đầu sách',
      value: totalBooks,
      sub: `${new Set(books.map((b) => b.category)).size} thể loại`,
      icon: BookOpen,
      accent: 'text-blue-600 bg-blue-50',
      onClick: () => onNavigate('books'),
    },
    {
      label: 'Tổng bản sao',
      value: totalCopies,
      sub: `${bookCopies.filter((c) => c.status === 'damaged' || c.status === 'lost').length} hư hỏng / mất`,
      icon: BookCopyIcon,
      accent: 'text-slate-700 bg-slate-100',
      onClick: () => onNavigate('books'),
    },
    {
      label: 'Bản sao còn sẵn',
      value: availableCopies,
      sub: totalCopies > 0 ? `${Math.round((availableCopies / totalCopies) * 100)}% sẵn sàng` : '0%',
      icon: BookCheck,
      accent: 'text-emerald-700 bg-emerald-50',
      onClick: () => onNavigate('borrow'),
    },
    {
      label: 'Bản sao đang mượn',
      value: borrowedCopies,
      sub: `${borrowRecords.filter((r) => r.status === 'borrowing').length} phiếu đang mở`,
      icon: BookMarked,
      accent: 'text-blue-700 bg-blue-50',
      onClick: () => onNavigate('return'),
    },
    {
      label: 'Tổng độc giả',
      value: totalReaders,
      sub: `${readers.filter((r) => r.status === 'active').length} thẻ hoạt động`,
      icon: Users,
      accent: 'text-indigo-700 bg-indigo-50',
      onClick: () => onNavigate('readers'),
    },
    {
      label: 'Phiếu quá hạn',
      value: overdueCount,
      sub: overdueCount > 0 ? 'Cần nhắc trả hoặc gia hạn' : 'Không có phiếu quá hạn',
      icon: AlertCircle,
      accent: overdueCount > 0 ? 'text-red-700 bg-red-50' : 'text-slate-600 bg-slate-100',
      valueClass: overdueCount > 0 ? 'text-red-600' : 'text-slate-900',
      onClick: () => onNavigate('statistics'),
    },
  ];

  const recentRecords = [...borrowRecords]
    .sort((a, b) => b.borrowDate.localeCompare(a.borrowDate))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <section aria-label="Chỉ số tổng quan">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <button
                key={kpi.label}
                type="button"
                onClick={kpi.onClick}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-blue-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${kpi.accent}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-3">
                  <p
                    className={`text-2xl font-bold tracking-tight tabular-nums ${
                      kpi.valueClass || 'text-slate-900'
                    }`}
                  >
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 truncate">{kpi.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Chart + Overdue/Quick Actions Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <MonthlyChart data={monthlyData} />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          {/* Quick Actions Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">Thao tác nghiệp vụ nhanh</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Truy cập trực tiếp các tác vụ lưu thông hằng ngày
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('borrow')}
                className="flex items-center justify-between rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <BookMarked className="h-4 w-4" />
                  <span>Mượn sách mới</span>
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('return')}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Undo2 className="h-4 w-4 text-blue-600" />
                  <span>Ghi nhận trả sách</span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('renew')}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <CalendarClock className="h-4 w-4 text-blue-600" />
                  <span>Gia hạn phiếu mượn</span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Overdue Spotlight */}
          <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Phiếu mượn quá hạn</h2>
              <button
                type="button"
                onClick={() => onNavigate('statistics')}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Xem tất cả
              </button>
            </div>

            {overdueRecords.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Hiện tại không có phiếu mượn nào quá hạn trả.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {overdueRecords.slice(0, 4).map((rec) => {
                  const reader = readers.find((r) => r.id === rec.readerId);
                  const daysLate = getOverdueDays(rec.dueDate, today);
                  const countBooks = borrowDetails.filter(
                    (d) => d.borrowRecordId === rec.id && d.status === 'borrowed'
                  ).length;
                  return (
                    <li key={rec.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {reader?.fullName || 'Độc giả không xác định'}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          <span className="font-mono">{rec.recordCode}</span> · {countBooks} cuốn ·
                          Hạn {formatDateVN(rec.dueDate)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-red-600 tabular-nums">
                        Quá hạn {daysLate} ngày
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Recent Borrow Activity Table */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Phiếu mượn gần đây</h2>
            <p className="text-xs text-slate-500">
              Cập nhật trực tiếp từ dữ liệu giao dịch trong LocalStorage
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('return')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            Quản lý trả sách
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-5 py-3">Mã phiếu</th>
                <th className="px-5 py-3">Độc giả</th>
                <th className="px-5 py-3 text-right">Số sách</th>
                <th className="px-5 py-3">Ngày mượn</th>
                <th className="px-5 py-3">Hạn trả</th>
                <th className="px-5 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentRecords.map((rec) => {
                const reader = readers.find((r) => r.id === rec.readerId);
                const detailsCount = borrowDetails.filter(
                  (d) => d.borrowRecordId === rec.id
                ).length;
                const overdue = isRecordCurrentlyOverdue(rec, today);
                return (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-slate-900 whitespace-nowrap">
                      {rec.recordCode}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-slate-900">
                        {reader?.fullName || '—'}
                      </span>
                      <span className="ml-2 text-xs text-slate-400 font-mono">
                        {reader?.readerCode}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                      {detailsCount}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-slate-600 whitespace-nowrap">
                      {formatDateVN(rec.borrowDate)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-slate-600 whitespace-nowrap">
                      {formatDateVN(rec.dueDate)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {rec.status === 'returned' ? (
                        <span className="text-xs font-semibold text-emerald-700">
                          Đã hoàn tất ({formatDateVN(rec.returnDate)})
                        </span>
                      ) : overdue ? (
                        <span className="text-xs font-semibold text-red-600">
                          Quá hạn {getOverdueDays(rec.dueDate, today)} ngày
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-blue-600">Đang mượn</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
