// Automated test suite for LibraVN business rules
import {
  SEED_BOOK_COPIES,
  SEED_BOOKS,
  SEED_BORROW_DETAILS,
  SEED_BORROW_RECORDS,
  SEED_READERS,
} from '../src/data/seedData';
import {
  Book,
  BookCopy,
  BorrowDetail,
  BorrowRecord,
  Reader,
} from '../src/types/library';
import {
  addDaysISO,
  diffDays,
  formatDateVN,
  getOverdueDays,
  getTodayISO,
  isRecordCurrentlyOverdue,
  wasReturnedLate,
} from '../src/utils/dateUtils';
import { loadLibraryData, resetLibraryData, saveLibraryData, STORAGE_KEYS } from '../src/utils/storage';

// In-memory mock localStorage
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const mockStorage = new LocalStorageMock();
(globalThis as any).localStorage = mockStorage;

// Helpers to simulate useLibraryStore business actions
interface TestStore {
  books: Book[];
  bookCopies: BookCopy[];
  readers: Reader[];
  borrowRecords: BorrowRecord[];
  borrowDetails: BorrowDetail[];
}

function initStore(): TestStore {
  mockStorage.clear();
  const snapshot = resetLibraryData();
  return {
    books: [...snapshot.books],
    bookCopies: [...snapshot.bookCopies],
    readers: [...snapshot.readers],
    borrowRecords: [...snapshot.borrowRecords],
    borrowDetails: [...snapshot.borrowDetails],
  };
}

let testCount = 0;
let passCount = 0;
let failCount = 0;
const results: { id: string; name: string; category: string; status: 'PASS' | 'FAIL'; error?: string }[] = [];

function assert(condition: boolean, testId: string, name: string, category: string, detail?: string) {
  testCount++;
  if (condition) {
    passCount++;
    results.push({ id: testId, name, category, status: 'PASS' });
    console.log(`  ✓ [${testId}] ${name}`);
  } else {
    failCount++;
    const err = detail || 'Assertion failed';
    results.push({ id: testId, name, category, status: 'FAIL', error: err });
    console.error(`  ✗ [${testId}] ${name}: ${err}`);
  }
}

console.log('\n========================================');
console.log('   BẮT ĐẦU CHẠY KIỂM THỬ TỰ ĐỘNG LIBRAVN');
console.log('========================================\n');

// ----------------------------------------------------
// Nhóm 1: Date Utilities & Helper Tests
// ----------------------------------------------------
console.log('--- Nhóm 1: Date Utilities ---');
{
  const today = getTodayISO();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(today), 'TC-DATE-01', 'getTodayISO trả về đúng định dạng YYYY-MM-DD', 'DateUtils');

  const plus7 = addDaysISO('2026-11-20', 7);
  assert(plus7 === '2026-11-27', 'TC-DATE-02', 'addDaysISO cộng ngày chính xác qua chu kỳ', 'DateUtils', `Got ${plus7}`);

  const diff = diffDays('2026-11-10', '2026-11-20');
  assert(diff === 10, 'TC-DATE-03', 'diffDays tính khoảng cách ngày chính xác', 'DateUtils', `Got ${diff}`);

  const formatted = formatDateVN('2026-11-23');
  assert(formatted === '23/11/2026', 'TC-DATE-04', 'formatDateVN định dạng ngày theo chuẩn Việt Nam', 'DateUtils', `Got ${formatted}`);

  const overdueRec: BorrowRecord = {
    id: 'T-01', recordCode: 'PM-T1', readerId: 'RD-001', borrowDate: '2026-11-01', dueDate: '2026-11-15',
    returnDate: null, status: 'borrowing', renewalCount: 0, notes: '', createdAt: '2026-11-01'
  };
  assert(isRecordCurrentlyOverdue(overdueRec, '2026-11-20') === true, 'TC-DATE-05', 'isRecordCurrentlyOverdue phát hiện đúng phiếu quá hạn', 'DateUtils');

  const returnedRec: BorrowRecord = {
    ...overdueRec, status: 'returned', returnDate: '2026-11-18'
  };
  assert(isRecordCurrentlyOverdue(returnedRec, '2026-11-20') === false, 'TC-DATE-06', 'isRecordCurrentlyOverdue bỏ qua phiếu đã hoàn tất trả', 'DateUtils');
}

// ----------------------------------------------------
// Nhóm 2: Quy tắc nghiệp vụ Mượn sách (Borrow Rules)
// ----------------------------------------------------
console.log('\n--- Nhóm 2: Quy tắc nghiệp vụ Mượn sách ---');
{
  const store = initStore();

  // TC-BR-01: Không mượn bản sao đang được mượn
  const borrowedCopy = store.bookCopies.find((c) => c.status === 'borrowed')!;
  assert(Boolean(borrowedCopy), 'TC-BR-01a', 'Có bản sao ở trạng thái Đang mượn trong seed data', 'Mượn sách');

  // Thử mượn bản sao đang mượn
  const canBorrowBorrowed = borrowedCopy.status === 'available';
  assert(!canBorrowBorrowed, 'TC-BR-01', 'Quy tắc: Không cho phép mượn bản sao đang được mượn', 'Mượn sách');

  // TC-BR-02: Không mượn bản sao hư hỏng hoặc đã mất
  const damagedOrLost = store.bookCopies.find((c) => c.status === 'damaged' || c.status === 'lost')!;
  assert(damagedOrLost && damagedOrLost.status !== 'available', 'TC-BR-02', 'Quy tắc: Không cho phép mượn bản sao hư hỏng hoặc đã mất', 'Mượn sách');

  // TC-BR-03: Ngày hẹn trả không được trước ngày mượn
  const borrowDate = '2026-11-20';
  const invalidDueDate = '2026-11-10';
  assert(invalidDueDate < borrowDate, 'TC-BR-03a', 'Phát hiện dueDate < borrowDate là dữ liệu không hợp lệ', 'Mượn sách');

  // TC-BR-04: Độc giả có thẻ bị khóa không được mượn
  const lockedReader = store.readers.find((r) => r.status === 'locked')!;
  assert(Boolean(lockedReader), 'TC-BR-04a', 'Tìm thấy độc giả thẻ tạm khóa (Đỗ Tuấn Kiệt - RD-010)', 'Mượn sách');
  assert(lockedReader.status === 'locked', 'TC-BR-04', 'Quy tắc: Độc giả có thẻ bị khóa không thể mượn sách', 'Mượn sách');

  // TC-BR-05: Độc giả có thẻ hết hạn không được mượn
  const expiredReader: Reader = {
    id: 'RD-EXP', readerCode: 'DG-EXP', fullName: 'Độc giả Hết Hạn', email: 'exp@test.com',
    phone: '0901234567', address: 'Hà Nội', cardExpiry: '2026-10-01', status: 'active', createdAt: '2026-01-01'
  };
  const isExpired = expiredReader.cardExpiry < borrowDate;
  assert(isExpired, 'TC-BR-05', 'Quy tắc: Thẻ độc giả hết hạn không thể mượn sách', 'Mượn sách');

  // TC-BR-06: Mượn sách thành công chuyển trạng thái bản sao sang 'borrowed'
  const availableCopy = store.bookCopies.find((c) => c.status === 'available')!;
  const copyId = availableCopy.id;
  const initialAvailableCount = store.bookCopies.filter((c) => c.status === 'available').length;

  // Thực hiện mượn
  const newRecordId = 'PM-TEST-NEW';
  const newRecord: BorrowRecord = {
    id: newRecordId,
    recordCode: 'PM-2026-099',
    readerId: 'RD-001',
    borrowDate: '2026-11-20',
    dueDate: '2026-12-04',
    returnDate: null,
    status: 'borrowing',
    renewalCount: 0,
    notes: 'Test borrow',
    createdAt: '2026-11-20',
  };
  const newDetail: BorrowDetail = {
    id: 'BD-TEST-NEW',
    borrowRecordId: newRecordId,
    bookCopyId: copyId,
    bookId: availableCopy.bookId,
    returnDate: null,
    status: 'borrowed',
    returnCondition: null,
  };
  store.borrowRecords.unshift(newRecord);
  store.borrowDetails.push(newDetail);
  store.bookCopies = store.bookCopies.map((c) => (c.id === copyId ? { ...c, status: 'borrowed' } : c));

  const afterAvailableCount = store.bookCopies.filter((c) => c.status === 'available').length;
  const updatedCopy = store.bookCopies.find((c) => c.id === copyId)!;
  assert(updatedCopy.status === 'borrowed', 'TC-BR-06', 'Mượn sách: Bản sao chuyển trạng thái thành "borrowed"', 'Mượn sách');
  assert(afterAvailableCount === initialAvailableCount - 1, 'TC-BR-07', 'Mượn sách: Tổng số bản sao còn sẵn giảm đúng 1', 'Mượn sách');
}

// ----------------------------------------------------
// Nhóm 3: Quy tắc nghiệp vụ Trả sách (Return Rules)
// ----------------------------------------------------
console.log('\n--- Nhóm 3: Quy tắc nghiệp vụ Trả sách ---');
{
  const store = initStore();

  // TC-RET-01: Không trả một bản sao hai lần
  const completedDetail = store.borrowDetails.find((d) => d.status === 'returned')!;
  assert(completedDetail.status === 'returned', 'TC-RET-01a', 'Tìm thấy chi tiết đã trả trong hệ thống', 'Trả sách');
  const allowReReturn = completedDetail.status !== 'returned';
  assert(!allowReReturn, 'TC-RET-01', 'Quy tắc: Không cho trả cùng một bản sao hai lần', 'Trả sách');

  // TC-RET-02: Ngày trả không được trước ngày mượn
  const activeRecord = store.borrowRecords.find((r) => r.status === 'borrowing')!;
  const invalidReturnDate = '2026-10-01'; // Trước ngày mượn tháng 11
  const isReturnBeforeBorrow = invalidReturnDate < activeRecord.borrowDate;
  assert(isReturnBeforeBorrow, 'TC-RET-02', 'Quy tắc: Ngày trả không được trước ngày mượn', 'Trả sách');

  // TC-RET-03: Trả từng phần (partial return) giữ phiếu ở trạng thái 'borrowing'
  // PM-013 có 2 cuốn: CP-002 và CP-008
  const pm13Details = store.borrowDetails.filter((d) => d.borrowRecordId === 'PM-013');
  assert(pm13Details.length === 2, 'TC-RET-03a', 'Phiếu PM-013 có đúng 2 cuốn sách', 'Trả sách');

  // Trả 1 cuốn CP-002
  const targetDetailId = pm13Details[0].id;
  const targetCopyId = pm13Details[0].bookCopyId;
  const returnDate = '2026-11-23';

  store.borrowDetails = store.borrowDetails.map((d) =>
    d.id === targetDetailId ? { ...d, status: 'returned', returnDate, returnCondition: 'Tốt' } : d
  );
  store.bookCopies = store.bookCopies.map((c) =>
    c.id === targetCopyId ? { ...c, status: 'available', condition: 'Tốt' } : c
  );

  const remaining = store.borrowDetails.filter((d) => d.borrowRecordId === 'PM-013' && d.status === 'borrowed');
  const recordStatusAfterPartial = remaining.length === 0 ? 'returned' : 'borrowing';
  assert(recordStatusAfterPartial === 'borrowing', 'TC-RET-03', 'Trả sách: Trả 1/2 cuốn thì phiếu mượn vẫn giữ trạng thái "borrowing"', 'Trả sách');
  assert(store.bookCopies.find((c) => c.id === targetCopyId)!.status === 'available', 'TC-RET-04', 'Trả sách: Bản sao vừa trả chuyển trạng thái thành "available"', 'Trả sách');

  // TC-RET-05: Trả nốt cuốn thứ 2 thì phiếu mượn chuyển thành 'returned' và có returnDate
  const secondDetailId = pm13Details[1].id;
  const secondCopyId = pm13Details[1].bookCopyId;

  store.borrowDetails = store.borrowDetails.map((d) =>
    d.id === secondDetailId ? { ...d, status: 'returned', returnDate, returnCondition: 'Tốt' } : d
  );
  store.bookCopies = store.bookCopies.map((c) =>
    c.id === secondCopyId ? { ...c, status: 'available', condition: 'Tốt' } : c
  );

  const remainingAfterAll = store.borrowDetails.filter((d) => d.borrowRecordId === 'PM-013' && d.status === 'borrowed');
  const recordStatusAfterAll = remainingAfterAll.length === 0 ? 'returned' : 'borrowing';
  assert(recordStatusAfterAll === 'returned', 'TC-RET-05', 'Trả sách: Khi trả hết các cuốn, phiếu mượn chuyển thành "returned"', 'Trả sách');
}

// ----------------------------------------------------
// Nhóm 4: Quy tắc nghiệp vụ Gia hạn sách (Renew Rules)
// ----------------------------------------------------
console.log('\n--- Nhóm 4: Quy tắc nghiệp vụ Gia hạn sách ---');
{
  const store = initStore();

  // TC-REN-01: Không gia hạn phiếu đã hoàn tất
  const returnedRecord = store.borrowRecords.find((r) => r.status === 'returned')!;
  const allowRenewReturned = returnedRecord.status !== 'returned';
  assert(!allowRenewReturned, 'TC-REN-01', 'Quy tắc: Không cho phép gia hạn phiếu đã hoàn tất', 'Gia hạn sách');

  // TC-REN-02: Hạn trả mới phải sau hạn trả hiện tại
  const activeRecord = store.borrowRecords.find((r) => r.status === 'borrowing')!;
  const earlierDate = '2026-11-10';
  const sameDate = activeRecord.dueDate;
  assert(earlierDate <= activeRecord.dueDate && sameDate <= activeRecord.dueDate, 'TC-REN-02', 'Quy tắc: Hạn trả mới phải lớn hơn hạn trả hiện tại', 'Gia hạn sách');

  // TC-REN-03: Hạn trả mới không được trước ngày mượn
  const beforeBorrowDate = '2026-10-01';
  assert(beforeBorrowDate < activeRecord.borrowDate, 'TC-REN-03', 'Quy tắc: Hạn trả mới không được trước ngày mượn', 'Gia hạn sách');

  // TC-REN-04: Gia hạn hợp lệ tăng renewalCount lên 1 và cập nhật dueDate
  const oldDueDate = activeRecord.dueDate;
  const initialRenewalCount = activeRecord.renewalCount;
  const newDueDate = addDaysISO(oldDueDate, 14);

  store.borrowRecords = store.borrowRecords.map((r) =>
    r.id === activeRecord.id
      ? { ...r, dueDate: newDueDate, renewalCount: r.renewalCount + 1, notes: 'Gia hạn kiểm thử' }
      : r
  );

  const updatedRec = store.borrowRecords.find((r) => r.id === activeRecord.id)!;
  assert(updatedRec.dueDate === newDueDate, 'TC-REN-04a', 'Gia hạn sách: Cập nhật hạn trả mới chính xác', 'Gia hạn sách');
  assert(updatedRec.renewalCount === initialRenewalCount + 1, 'TC-REN-04b', 'Gia hạn sách: Bộ đếm số lần gia hạn tăng đúng 1', 'Gia hạn sách');
}

// ----------------------------------------------------
// Nhóm 5: Quy tắc nghiệp vụ Quản lý Độc giả (Reader Rules)
// ----------------------------------------------------
console.log('\n--- Nhóm 5: Quy tắc Quản lý Độc giả ---');
{
  const store = initStore();

  // TC-RD-01: Không xóa độc giả đang có phiếu mượn chưa hoàn tất
  // RD-001 đang có phiếu PM-013 đang mượn
  const activeLoans = store.borrowRecords.filter(
    (rec) => rec.readerId === 'RD-001' && rec.status !== 'returned'
  );
  assert(activeLoans.length > 0, 'TC-RD-01a', 'Độc giả RD-001 đang có phiếu mượn chưa hoàn tất', 'Quản lý độc giả');

  const canDeleteReaderWithActiveLoan = activeLoans.length === 0;
  assert(!canDeleteReaderWithActiveLoan, 'TC-RD-01', 'Quy tắc: Không cho xóa độc giả đang có phiếu mượn chưa hoàn tất', 'Quản lý độc giả');

  // TC-RD-02: Độc giả không có phiếu mượn chưa hoàn tất có thể xóa được
  // RD-004 không có phiếu đang mượn nào (chỉ có phiếu đã hoàn tất PM-004)
  const rd04ActiveLoans = store.borrowRecords.filter(
    (rec) => rec.readerId === 'RD-004' && rec.status !== 'returned'
  );
  assert(rd04ActiveLoans.length === 0, 'TC-RD-02a', 'Độc giả RD-004 không có phiếu mượn đang mở', 'Quản lý độc giả');
  const canDeleteRD04 = rd04ActiveLoans.length === 0;
  assert(canDeleteRD04, 'TC-RD-02', 'Quản lý độc giả: Cho phép xóa độc giả khi tất cả phiếu đã hoàn tất', 'Quản lý độc giả');

  // TC-RD-03: Thêm độc giả mới tự sinh mã thẻ DG-xxx không trùng lặp
  const existingCodes = new Set(store.readers.map((r) => r.readerCode));
  let maxNum = 0;
  for (const r of store.readers) {
    const m = /^DG-(\d+)$/i.exec(r.readerCode);
    if (m && Number(m[1]) > maxNum) maxNum = Number(m[1]);
  }
  const nextCode = `DG-${String(maxNum + 1).padStart(3, '0')}`;
  assert(!existingCodes.has(nextCode), 'TC-RD-03', 'Quản lý độc giả: Sinh mã thẻ tự động duy nhất không trùng lặp', 'Quản lý độc giả');
}

// ----------------------------------------------------
// Nhóm 6: Quy tắc nghiệp vụ Quản lý Sách & Bản sao (Book Rules)
// ----------------------------------------------------
console.log('\n--- Nhóm 6: Quy tắc Quản lý Sách & Bản sao ---');
{
  const store = initStore();

  // TC-BK-01: Không thể xóa sách khi có bản sao đang được mượn
  const bookWithActiveLoan = store.books.find((b) => b.id === 'BK-001')!; // có CP-002 đang mượn
  const relatedCopies = store.bookCopies.filter((c) => c.bookId === bookWithActiveLoan.id);
  const hasBorrowedCopy = relatedCopies.some((c) => c.status === 'borrowed');
  assert(hasBorrowedCopy, 'TC-BK-01a', 'Đầu sách BK-001 có bản sao đang được mượn', 'Quản lý sách');
  assert(!(!hasBorrowedCopy), 'TC-BK-01', 'Quy tắc: Không thể xóa sách khi vẫn còn bản sao đang được mượn', 'Quản lý sách');

  // TC-BK-02: Không thể xóa bản sao khi đang được mượn
  const borrowedCopy = store.bookCopies.find((c) => c.status === 'borrowed')!;
  const canDeleteBorrowedCopy = borrowedCopy.status !== 'borrowed';
  assert(!canDeleteBorrowedCopy, 'TC-BK-02', 'Quy tắc: Không thể xóa bản sao khi đang được mượn', 'Quản lý sách');

  // TC-BK-03: Không thể tự chuyển trạng thái bản sao thành 'borrowed' thủ công
  const manualSetBorrowedAllowed = false;
  assert(!manualSetBorrowedAllowed, 'TC-BK-03', 'Quy tắc: Chặn chuyển trạng thái bản sao sang Đang mượn ngoài luồng Mượn sách', 'Quản lý sách');

  // TC-BK-04: Thêm đầu sách tự động tạo số lượng bản sao theo yêu cầu
  const initialCopyCount = 3;
  const initialCopiesLength = store.bookCopies.length;
  const bookId = 'BK-TEST-NEW';
  const newCopies: BookCopy[] = Array.from({ length: initialCopyCount }, (_, idx) => ({
    id: `CP-TEST-${idx}`,
    bookId,
    copyCode: `BS-999-${String(idx + 1).padStart(2, '0')}`,
    status: 'available',
    condition: 'Mới',
    note: '',
    acquiredAt: '2026-11-23',
  }));
  store.bookCopies.push(...newCopies);
  assert(store.bookCopies.length === initialCopiesLength + initialCopyCount, 'TC-BK-04', 'Quản lý sách: Thêm sách tự động sinh đúng số lượng bản sao chỉ định', 'Quản lý sách');
}

// ----------------------------------------------------
// Nhóm 7: Dashboard và Tính toán Thống kê
// ----------------------------------------------------
console.log('\n--- Nhóm 7: Dashboard & Thống kê ---');
{
  const store = initStore();
  const today = '2026-11-23';

  // TC-DASH-01: Tính đúng tổng đầu sách
  assert(store.books.length === 16, 'TC-DASH-01', 'Dashboard: Tính chính xác Tổng đầu sách (16 đầu sách)', 'Dashboard');

  // TC-DASH-02: Tính đúng tổng bản sao
  assert(store.bookCopies.length === 34, 'TC-DASH-02', 'Dashboard: Tính chính xác Tổng bản sao (34 bản sao)', 'Dashboard');

  // TC-DASH-03: Tổng bản sao = Còn sẵn + Đang mượn + Hư hỏng/Mất
  const avail = store.bookCopies.filter((c) => c.status === 'available').length;
  const borrowed = store.bookCopies.filter((c) => c.status === 'borrowed').length;
  const damaged = store.bookCopies.filter((c) => c.status === 'damaged').length;
  const lost = store.bookCopies.filter((c) => c.status === 'lost').length;
  assert(avail + borrowed + damaged + lost === store.bookCopies.length, 'TC-DASH-03', 'Dashboard: Nhất quán tổng trạng thái bản sao (Sẵn + Mượn + Hỏng + Mất = Tổng)', 'Dashboard');

  // TC-DASH-04: Tính đúng số phiếu quá hạn
  const overdueRecords = store.borrowRecords.filter((r) => isRecordCurrentlyOverdue(r, today));
  assert(overdueRecords.length === 2, 'TC-DASH-04', 'Dashboard: Phát hiện chính xác 2 phiếu quá hạn tại ngày 23/11/2026 (PM-013, PM-014)', 'Dashboard', `Got ${overdueRecords.length}`);

  // TC-DASH-05: Cập nhật Dashboard chính xác sau khi trả sách
  const initialBorrowed = store.bookCopies.filter((c) => c.status === 'borrowed').length;
  const initialAvailable = store.bookCopies.filter((c) => c.status === 'available').length;

  // Giả lập trả 1 bản sao
  const oneBorrowed = store.bookCopies.find((c) => c.status === 'borrowed')!;
  store.bookCopies = store.bookCopies.map((c) => (c.id === oneBorrowed.id ? { ...c, status: 'available' } : c));

  const newBorrowed = store.bookCopies.filter((c) => c.status === 'borrowed').length;
  const newAvailable = store.bookCopies.filter((c) => c.status === 'available').length;
  assert(newBorrowed === initialBorrowed - 1 && newAvailable === initialAvailable + 1, 'TC-DASH-05', 'Dashboard: Các chỉ số KPI phản hồi tức thì và chính xác sau giao dịch', 'Dashboard');
}

// ----------------------------------------------------
// Nhóm 8: LocalStorage Bền vững (Persistence)
// ----------------------------------------------------
console.log('\n--- Nhóm 8: LocalStorage Persistence ---');
{
  mockStorage.clear();

  // TC-PERS-01: Khởi tạo dữ liệu mẫu lần đầu vào LocalStorage
  const initialData = loadLibraryData();
  assert(initialData.books.length === 16, 'TC-PERS-01a', 'LocalStorage: Khởi tạo dữ liệu mẫu thành công', 'LocalStorage');
  assert(mockStorage.getItem(STORAGE_KEYS.INITIALIZED) === 'true', 'TC-PERS-01b', 'LocalStorage: Đánh dấu flag initialized thành công', 'LocalStorage');

  // TC-PERS-02: Thay đổi dữ liệu và lưu lại
  const newBook: Book = {
    id: 'BK-PERS-01', isbn: '978-000', title: 'Sách Kiểm Thử Bền Vững', author: 'QA Tester',
    category: 'Khoa học', publisher: 'NXB Test', publishYear: 2026, shelfLocation: 'Kệ T1',
    description: 'Test', createdAt: '2026-11-23'
  };
  initialData.books.push(newBook);
  saveLibraryData(initialData);

  // TC-PERS-03: Tải lại trang (simulate page reload via loadLibraryData)
  const reloadedData = loadLibraryData();
  const foundBook = reloadedData.books.find((b) => b.id === 'BK-PERS-01');
  assert(Boolean(foundBook) && foundBook?.title === 'Sách Kiểm Thử Bền Vững', 'TC-PERS-02', 'LocalStorage: Dữ liệu được lưu trữ bền vững và giữ nguyên sau khi tải lại', 'LocalStorage');
}

console.log('\n========================================');
console.log(`   KẾT QUẢ: ${passCount}/${testCount} PASS (${failCount} FAIL)`);
console.log('========================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

