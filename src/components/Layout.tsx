import {
  BarChart3,
  BookMarked,
  BookOpen,
  CalendarClock,
  LayoutDashboard,
  Library,
  Menu,
  RotateCcw,
  Undo2,
  Users,
  X,
} from 'lucide-react';
import { ReactNode, useState } from 'react';
import { PageKey } from '../types/library';

interface LayoutProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  overdueCount: number;
  onRequestResetData: () => void;
  children: ReactNode;
}

interface NavItem {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
  badgeCount?: number;
}

const PAGE_TITLES: Record<PageKey, string> = {
  dashboard: 'Tổng quan thư viện',
  books: 'Quản lý sách & bản sao',
  readers: 'Quản lý độc giả',
  borrow: 'Lập phiếu mượn sách',
  return: 'Ghi nhận trả sách',
  renew: 'Gia hạn phiếu mượn',
  statistics: 'Thống kê & báo cáo',
};

export function Layout({
  activePage,
  onNavigate,
  overdueCount,
  onRequestResetData,
  children,
}: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { key: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { key: 'books', label: 'Quản lý sách', icon: BookOpen },
    { key: 'readers', label: 'Quản lý độc giả', icon: Users },
    { key: 'borrow', label: 'Mượn sách', icon: BookMarked },
    { key: 'return', label: 'Trả sách', icon: Undo2 },
    { key: 'renew', label: 'Gia hạn sách', icon: CalendarClock },
    {
      key: 'statistics',
      label: 'Thống kê',
      icon: BarChart3,
      badgeCount: overdueCount > 0 ? overdueCount : undefined,
    },
  ];

  const handleSelectPage = (page: PageKey) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <button
            type="button"
            onClick={() => handleSelectPage('dashboard')}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Library className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              LibraVN
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Đóng menu"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Điều hướng chính">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelectPage(item.key)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 font-semibold text-blue-700'
                    : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badgeCount !== undefined && (
                  <span className="ml-2 text-xs font-semibold tabular-nums text-red-600">
                    {item.badgeCount} quá hạn
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom Action */}
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={onRequestResetData}
            className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>Khôi phục dữ liệu mẫu</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Mở menu điều hướng"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400 whitespace-nowrap">
                Thư viện Trung tâm
              </span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <h1 className="truncate text-base font-semibold text-slate-900">
                {PAGE_TITLES[activePage]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectPage('borrow')}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <BookMarked className="h-4 w-4 shrink-0" />
              <span>Lập phiếu mượn</span>
            </button>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
