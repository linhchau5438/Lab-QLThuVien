import { useCallback, useMemo, useState } from 'react';
import { ConfirmModal } from './components/ConfirmModal';
import { Layout } from './components/Layout';
import { ToastContainer } from './components/ToastContainer';
import { useLibraryStore } from './hooks/useLibraryStore';
import { BooksPage } from './pages/BooksPage';
import { BorrowPage } from './pages/BorrowPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReadersPage } from './pages/ReadersPage';
import { RenewPage } from './pages/RenewPage';
import { ReturnPage } from './pages/ReturnPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ActionResult, PageKey, ToastMessage, ToastType } from './types/library';
import { getTodayISO, isRecordCurrentlyOverdue } from './utils/dateUtils';

export default function App() {
  const store = useLibraryStore();
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (type: ToastType, title: string, description?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, description }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast]
  );

  const handleNotify = useCallback(
    (res: ActionResult) => {
      pushToast(res.ok ? 'success' : 'error', res.ok ? 'Thành công' : 'Không thể thực hiện', res.message);
    },
    [pushToast]
  );

  const overdueCount = useMemo(() => {
    const today = getTodayISO();
    return store.borrowRecords.filter((r) => isRecordCurrentlyOverdue(r, today)).length;
  }, [store.borrowRecords]);

  return (
    <>
      <Layout
        activePage={activePage}
        onNavigate={setActivePage}
        overdueCount={overdueCount}
        onRequestResetData={() => setResetConfirmOpen(true)}
      >
        {activePage === 'dashboard' && (
          <DashboardPage
            books={store.books}
            bookCopies={store.bookCopies}
            readers={store.readers}
            borrowRecords={store.borrowRecords}
            borrowDetails={store.borrowDetails}
            onNavigate={setActivePage}
          />
        )}

        {activePage === 'books' && (
          <BooksPage
            books={store.books}
            bookCopies={store.bookCopies}
            onAddBook={store.addBook}
            onUpdateBook={store.updateBook}
            onDeleteBook={store.deleteBook}
            onAddCopy={store.addBookCopy}
            onUpdateCopy={store.updateBookCopy}
            onDeleteCopy={store.deleteBookCopy}
            onNotify={handleNotify}
          />
        )}

        {activePage === 'readers' && (
          <ReadersPage
            readers={store.readers}
            books={store.books}
            bookCopies={store.bookCopies}
            borrowRecords={store.borrowRecords}
            borrowDetails={store.borrowDetails}
            onAddReader={store.addReader}
            onUpdateReader={store.updateReader}
            onDeleteReader={store.deleteReader}
            onNotify={handleNotify}
          />
        )}

        {activePage === 'borrow' && (
          <BorrowPage
            books={store.books}
            bookCopies={store.bookCopies}
            readers={store.readers}
            borrowRecords={store.borrowRecords}
            onCreateBorrowRecord={store.createBorrowRecord}
            onNotify={handleNotify}
          />
        )}

        {activePage === 'return' && (
          <ReturnPage
            books={store.books}
            bookCopies={store.bookCopies}
            readers={store.readers}
            borrowRecords={store.borrowRecords}
            borrowDetails={store.borrowDetails}
            onReturnDetails={store.returnBorrowDetails}
            onNotify={handleNotify}
          />
        )}

        {activePage === 'renew' && (
          <RenewPage
            books={store.books}
            bookCopies={store.bookCopies}
            readers={store.readers}
            borrowRecords={store.borrowRecords}
            borrowDetails={store.borrowDetails}
            onRenewRecord={store.renewBorrowRecord}
            onNotify={handleNotify}
          />
        )}

        {activePage === 'statistics' && (
          <StatisticsPage
            books={store.books}
            bookCopies={store.bookCopies}
            readers={store.readers}
            borrowRecords={store.borrowRecords}
            borrowDetails={store.borrowDetails}
            onNavigate={setActivePage}
          />
        )}
      </Layout>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <ConfirmModal
        open={resetConfirmOpen}
        title="Khôi phục dữ liệu mẫu"
        message="Toàn bộ dữ liệu thay đổi hiện tại trong LocalStorage sẽ được đặt lại về bộ dữ liệu mẫu ban đầu (16 đầu sách, 34 bản sao, 12 độc giả và 17 phiếu mượn). Bạn có chắc chắn muốn tiếp tục?"
        confirmLabel="Khôi phục ngay"
        variant="primary"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          handleNotify(store.resetToSampleData());
          setResetConfirmOpen(false);
        }}
      />
    </>
  );
}
