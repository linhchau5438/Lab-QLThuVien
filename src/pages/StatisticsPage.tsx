import { AlertTriangle, BookOpen, CalendarClock, TrendingUp, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
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

interface StatisticsPageProps {
  books: Book[];
  bookCopies: BookCopy[];
  readers: Reader[];
  borrowRecords: BorrowRecord[];
  borrowDetails: BorrowDetail[];
  onNavigate: (page: PageKey) => void;
}

export function StatisticsPage({
  books,
  bookCopies,
  readers,
  borrowRecords,
  borrowDetails,
  onNavigate,
}: StatisticsPageProps) {
  const today = getTodayISO();
  const [monthRange, setMonthRange] = useState<6 | 12>(6);

  // 1. Monthly Borrow Stats
  const latestBorrowMonth = useMemo(
    () =>
      borrowRecords.reduce(
        (max, r) => (getMonthKey(r.borrowDate) > max ? getMonthKey(r.borrowDate) : max),
        today.slice(0, 7)
      ),
    [borrowRecords, today]
  );

  const monthlyStats = useMemo(() => {
    const keys = getRecentMonthKeys(monthRange, latestBorrowMonth);
    return keys.map((mk) => {
      const recordsInMonth = borrowRecords.filter((r) => getMonthKey(r.borrowDate) === mk);
      const recIds = new Set(recordsInMonth.map((r) => r.id));
      const borrowedCopiesCount = borrowDetails.filter((d) =>
        recIds.has(d.borrowRecordId)
      ).length;
      const returnedCopiesCount = borrowDetails.filter(
        (d) => d.status === 'returned' && d.returnDate && getMonthKey(d.returnDate) === mk
      ).length;
      const completedRecordsCount = recordsInMonth.filter((r) => r.status === 'returned').length;

      return {
        monthKey: mk,
        label: formatMonthLabel(mk),
        fullLabel: formatMonthFullVN(mk),
        borrowRecordsCount: recordsInMonth.length,
        borrowedCopiesCount,
        returnedCopiesCount,
        completedRecordsCount,
      };
    });
  }, [borrowRecords, borrowDetails, monthRange, today]);

  const chartData: MonthlyChartDatum[] = monthlyStats;

  // 2. Top Borrowed Books
  const topBooks = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of borrowDetails) {
      counts.set(d.bookId, (counts.get(d.bookId) || 0) + 1);
    }

    return books
      .map((book) => {
        const copies = bookCopies.filter((c) => c.bookId === book.id);
        const available = copies.filter((c) => c.status === 'available').length;
        return {
          book,
          borrowCount: counts.get(book.id) || 0,
          totalCopies: copies.length,
          availableCopies: available,
        };
      })
      .sort((a, b) => b.borrowCount - a.borrowCount);
  }, [books, bookCopies, borrowDetails]);

  const maxBorrowCount = Math.max(1, ...topBooks.map((item) => item.borrowCount));

  // 3. Overdue Records List
  const overdueList = useMemo(() => {
    return borrowRecords
      .filter((r) => isRecordCurrentlyOverdue(r, today))
      .map((rec) => {
        const reader = readers.find((r) => r.id === rec.readerId);
        const unreturnedDetails = borrowDetails.filter(
          (d) => d.borrowRecordId === rec.id && d.status === 'borrowed'
        );
        const bookTitles = unreturnedDetails.map((d) => {
          const book = books.find((b) => b.id === d.bookId);
          const copy = bookCopies.find((c) => c.id === d.bookCopyId);
          return `${book?.title || 'Sách'} (${copy?.copyCode || ''})`;
        });
        return {
          record: rec,
          reader,
          daysOverdue: getOverdueDays(rec.dueDate, today),
          unreturnedCount: unreturnedDetails.length,
          bookTitles,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [borrowRecords, borrowDetails, readers, books, bookCopies, today]);

  return (
    <div className="space-y-6">
      {/* Section 1: Monthly Borrow Chart & Breakdown */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Lượt mượn theo tháng</h2>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMonthRange(6)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                monthRange === 6
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6 tháng gần nhất
            </button>
            <button
              type="button"
              onClick={() => setMonthRange(12)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                monthRange === 12
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              12 tháng gần nhất
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <MonthlyChart
              data={chartData}
              title={`Thống kê ${monthRange} tháng gần nhất`}
              subtitle="Tổng hợp theo ngày lập phiếu và ngày trả thực tế"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden lg:col-span-5">
            <div className="border-b border-slate-200 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-900">Bảng số liệu theo tháng</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5">Tháng</th>
                    <th className="px-4 py-2.5 text-right">Phiếu mượn</th>
                    <th className="px-4 py-2.5 text-right">Bản sao mượn</th>
                    <th className="px-4 py-2.5 text-right">Bản sao trả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...monthlyStats].reverse().map((row) => (
                    <tr key={row.monthKey} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{row.fullLabel}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-blue-700">
                        {row.borrowRecordsCount}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                        {row.borrowedCopiesCount}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">
                        {row.returnedCopiesCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Top Borrowed Books */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Sách được mượn nhiều nhất</h2>
              <p className="text-xs text-slate-500">
                Xếp hạng theo tổng số lượt mượn bản sao ghi nhận trong hệ thống
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-5 py-3 w-14">Hạng</th>
                <th className="px-5 py-3">Đầu sách & Tác giả</th>
                <th className="px-5 py-3">Thể loại</th>
                <th className="px-5 py-3 w-56">Tỷ lệ lượt mượn</th>
                <th className="px-5 py-3 text-right">Tổng lượt mượn</th>
                <th className="px-5 py-3 text-right">Còn sẵn / Tổng bản</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topBooks.slice(0, 10).map((item, index) => {
                const widthPct = Math.round((item.borrowCount / maxBorrowCount) * 100);
                return (
                  <tr key={item.book.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs font-semibold tabular-nums text-slate-500">
                      #{index + 1}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">{item.book.title}</p>
                      <p className="text-xs text-slate-500">{item.book.author}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-700 whitespace-nowrap">
                      {item.book.category}
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-blue-700">
                      {item.borrowCount} lượt
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-slate-700">
                      {item.availableCopies}/{item.totalCopies}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Overdue List */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Danh sách phiếu mượn quá hạn ({overdueList.length})
              </h2>
              <p className="text-xs text-slate-500">
                Các phiếu chưa hoàn tất có hạn trả trước ngày hôm nay ({formatDateVN(today)})
              </p>
            </div>
          </div>

          {overdueList.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('return')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span>Đi tới Trả sách</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('renew')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                <span>Đi tới Gia hạn</span>
              </button>
            </div>
          )}
        </div>

        {overdueList.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Tuyệt vời! Hiện không có phiếu mượn nào bị quá hạn.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3">Mã phiếu</th>
                  <th className="px-5 py-3">Độc giả & Liên hệ</th>
                  <th className="px-5 py-3">Sách chưa trả</th>
                  <th className="px-5 py-3">Ngày mượn</th>
                  <th className="px-5 py-3">Hạn trả</th>
                  <th className="px-5 py-3 text-right">Mức độ quá hạn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueList.map(({ record, reader, daysOverdue, bookTitles }) => (
                  <tr key={record.id} className="hover:bg-red-50/30">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {record.recordCode}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">
                        {reader?.fullName || '—'}{' '}
                        <span className="font-mono text-xs text-slate-400">
                          ({reader?.readerCode})
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {reader?.phone} · {reader?.email}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 max-w-sm">
                      <p className="text-xs text-slate-700">{bookTitles.join(', ')}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                      {formatDateVN(record.borrowDate)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                      {formatDateVN(record.dueDate)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <span className="text-xs font-semibold text-red-600 tabular-nums">
                        Quá hạn {daysOverdue} ngày
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
