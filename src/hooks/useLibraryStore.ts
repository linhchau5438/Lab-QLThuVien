import { useCallback, useEffect, useState } from 'react';
import {
  ActionResult,
  Book,
  BookCopy,
  BorrowDetail,
  BorrowRecord,
  CopyCondition,
  CopyStatus,
  Reader,
} from '../types/library';
import { getTodayISO } from '../utils/dateUtils';
import { loadLibraryData, resetLibraryData, saveLibraryData } from '../utils/storage';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function getNextUniqueCopyPrefix(existingCopies: BookCopy[]): string {
  let maxBookNum = 0;
  for (const c of existingCopies) {
    const match = /^BS-(\d+)-/i.exec(c.copyCode);
    if (match) {
      const n = Number(match[1]);
      if (n > maxBookNum) maxBookNum = n;
    }
  }
  return String(maxBookNum + 1).padStart(3, '0');
}

function getNextUniqueReaderCode(existingReaders: Reader[]): string {
  let maxNum = 0;
  for (const r of existingReaders) {
    const match = /^DG-(\d+)$/i.exec(r.readerCode);
    if (match) {
      const n = Number(match[1]);
      if (n > maxNum) maxNum = n;
    }
  }
  return `DG-${String(maxNum + 1).padStart(3, '0')}`;
}

function getNextUniqueRecordCode(existingRecords: BorrowRecord[], year: string): string {
  let maxNum = 0;
  for (const rec of existingRecords) {
    const match = /^PM-\d{4}-(\d+)$/i.exec(rec.recordCode);
    if (match) {
      const n = Number(match[1]);
      if (n > maxNum) maxNum = n;
    }
  }
  return `PM-${year}-${String(maxNum + 1).padStart(3, '0')}`;
}

export function useLibraryStore() {
  const [data, setData] = useState(() => loadLibraryData());

  useEffect(() => {
    saveLibraryData(data);
  }, [data]);

  // --- BOOKS ---
  const addBook = useCallback(
    (
      input: Omit<Book, 'id' | 'createdAt'>,
      initialCopyCount = 1
    ): ActionResult & { bookId?: string } => {
      const title = input.title.trim();
      const author = input.author.trim();
      if (!title || !author) {
        return { ok: false, message: 'Vui lòng nhập đầy đủ tên sách và tác giả.' };
      }
      if (initialCopyCount < 0 || initialCopyCount > 50) {
        return { ok: false, message: 'Số lượng bản sao khởi tạo phải từ 0 đến 50.' };
      }

      const today = getTodayISO();
      const bookId = generateId('BK');
      const newBook: Book = {
        ...input,
        id: bookId,
        title,
        author,
        isbn: input.isbn.trim() || `ISBN-${Date.now().toString().slice(-6)}`,
        publisher: input.publisher.trim() || 'Chưa cập nhật',
        shelfLocation: input.shelfLocation.trim() || 'Chưa phân kệ',
        description: input.description.trim(),
        createdAt: today,
      };

      const numSuffix = getNextUniqueCopyPrefix(data.bookCopies);
      const newCopies: BookCopy[] = Array.from({ length: initialCopyCount }, (_, idx) => ({
        id: generateId('CP'),
        bookId,
        copyCode: `BS-${numSuffix}-${String(idx + 1).padStart(2, '0')}`,
        status: 'available',
        condition: 'Mới',
        note: '',
        acquiredAt: today,
      }));

      setData((prev) => ({
        ...prev,
        books: [newBook, ...prev.books],
        bookCopies: [...prev.bookCopies, ...newCopies],
      }));

      return {
        ok: true,
        bookId,
        message: `Đã thêm đầu sách "${title}" cùng ${initialCopyCount} bản sao.`,
      };
    },
    [data.bookCopies]
  );

  const updateBook = useCallback(
    (bookId: string, updates: Omit<Book, 'id' | 'createdAt'>): ActionResult => {
      if (!updates.title.trim() || !updates.author.trim()) {
        return { ok: false, message: 'Tên sách và tác giả không được để trống.' };
      }
      setData((prev) => ({
        ...prev,
        books: prev.books.map((b) =>
          b.id === bookId
            ? {
                ...b,
                ...updates,
                title: updates.title.trim(),
                author: updates.author.trim(),
                isbn: updates.isbn.trim(),
                publisher: updates.publisher.trim(),
                shelfLocation: updates.shelfLocation.trim(),
                description: updates.description.trim(),
              }
            : b
        ),
      }));
      return { ok: true, message: `Đã cập nhật thông tin sách "${updates.title.trim()}".` };
    },
    []
  );

  const deleteBook = useCallback(
    (bookId: string): ActionResult => {
      const book = data.books.find((b) => b.id === bookId);
      if (!book) return { ok: false, message: 'Không tìm thấy đầu sách.' };

      const relatedCopies = data.bookCopies.filter((c) => c.bookId === bookId);
      const hasBorrowedCopy = relatedCopies.some((c) => c.status === 'borrowed');
      const hasActiveDetail = data.borrowDetails.some(
        (d) => d.bookId === bookId && d.status === 'borrowed'
      );

      if (hasBorrowedCopy || hasActiveDetail) {
        return {
          ok: false,
          message: `Không thể xóa "${book.title}" vì vẫn còn bản sao đang được mượn.`,
        };
      }

      setData((prev) => ({
        ...prev,
        books: prev.books.filter((b) => b.id !== bookId),
        bookCopies: prev.bookCopies.filter((c) => c.bookId !== bookId),
      }));

      return { ok: true, message: `Đã xóa đầu sách "${book.title}".` };
    },
    [data.books, data.bookCopies, data.borrowDetails]
  );

  // --- BOOK COPIES ---
  const addBookCopy = useCallback(
    (
      bookId: string,
      input: { copyCode: string; condition: CopyCondition; status: CopyStatus; note: string }
    ): ActionResult => {
      const code = input.copyCode.trim();
      if (!code) {
        return { ok: false, message: 'Vui lòng nhập mã bản sao.' };
      }
      const duplicate = data.bookCopies.some(
        (c) => c.copyCode.toLowerCase() === code.toLowerCase()
      );
      if (duplicate) {
        return { ok: false, message: `Mã bản sao "${code}" đã tồn tại.` };
      }
      if (input.status === 'borrowed') {
        return {
          ok: false,
          message: 'Bản sao mới thêm phải ở trạng thái còn sẵn hoặc bảo trì, không thể đặt trực tiếp là đang mượn.',
        };
      }

      const newCopy: BookCopy = {
        id: generateId('CP'),
        bookId,
        copyCode: code,
        condition: input.condition,
        status: input.status,
        note: input.note.trim(),
        acquiredAt: getTodayISO(),
      };

      setData((prev) => ({
        ...prev,
        bookCopies: [...prev.bookCopies, newCopy],
      }));

      return { ok: true, message: `Đã thêm bản sao "${code}".` };
    },
    [data.bookCopies]
  );

  const updateBookCopy = useCallback(
    (
      copyId: string,
      updates: { copyCode: string; condition: CopyCondition; status: CopyStatus; note: string }
    ): ActionResult => {
      const existing = data.bookCopies.find((c) => c.id === copyId);
      if (!existing) return { ok: false, message: 'Không tìm thấy bản sao.' };

      const code = updates.copyCode.trim();
      if (!code) return { ok: false, message: 'Mã bản sao không được để trống.' };

      const duplicate = data.bookCopies.some(
        (c) => c.id !== copyId && c.copyCode.toLowerCase() === code.toLowerCase()
      );
      if (duplicate) {
        return { ok: false, message: `Mã bản sao "${code}" đã tồn tại.` };
      }

      const isCurrentlyBorrowedInRecord = data.borrowDetails.some(
        (d) => d.bookCopyId === copyId && d.status === 'borrowed'
      );

      if (isCurrentlyBorrowedInRecord && updates.status !== 'borrowed') {
        return {
          ok: false,
          message: 'Bản sao đang thuộc phiếu mượn chưa trả. Vui lòng thực hiện trả sách tại mục Trả sách.',
        };
      }

      if (!isCurrentlyBorrowedInRecord && updates.status === 'borrowed') {
        return {
          ok: false,
          message: 'Không thể tự chuyển trạng thái thành Đang mượn. Hãy lập phiếu tại mục Mượn sách.',
        };
      }

      setData((prev) => ({
        ...prev,
        bookCopies: prev.bookCopies.map((c) =>
          c.id === copyId
            ? {
                ...c,
                copyCode: code,
                condition: updates.condition,
                status: updates.status,
                note: updates.note.trim(),
              }
            : c
        ),
      }));

      return { ok: true, message: `Đã cập nhật bản sao "${code}".` };
    },
    [data.bookCopies, data.borrowDetails]
  );

  const deleteBookCopy = useCallback(
    (copyId: string): ActionResult => {
      const copy = data.bookCopies.find((c) => c.id === copyId);
      if (!copy) return { ok: false, message: 'Không tìm thấy bản sao.' };

      const hasActiveLoan = data.borrowDetails.some(
        (d) => d.bookCopyId === copyId && d.status === 'borrowed'
      );
      if (copy.status === 'borrowed' || hasActiveLoan) {
        return {
          ok: false,
          message: `Không thể xóa bản sao "${copy.copyCode}" vì đang được độc giả mượn.`,
        };
      }

      setData((prev) => ({
        ...prev,
        bookCopies: prev.bookCopies.filter((c) => c.id !== copyId),
      }));
      return { ok: true, message: `Đã xóa bản sao "${copy.copyCode}".` };
    },
    [data.bookCopies, data.borrowDetails]
  );

  // --- READERS ---
  const addReader = useCallback(
    (input: Omit<Reader, 'id' | 'createdAt' | 'readerCode'> & { readerCode?: string }): ActionResult => {
      const fullName = input.fullName.trim();
      const phone = input.phone.trim();
      if (!fullName || !phone) {
        return { ok: false, message: 'Vui lòng nhập họ tên và số điện thoại độc giả.' };
      }

      const readerCode =
        input.readerCode?.trim() || getNextUniqueReaderCode(data.readers);

      const dupCode = data.readers.some(
        (r) => r.readerCode.toLowerCase() === readerCode.toLowerCase()
      );
      if (dupCode) {
        return { ok: false, message: `Mã thẻ "${readerCode}" đã tồn tại.` };
      }

      const newReader: Reader = {
        id: generateId('RD'),
        readerCode,
        fullName,
        email: input.email.trim(),
        phone,
        address: input.address.trim(),
        cardExpiry: input.cardExpiry,
        status: input.status,
        createdAt: getTodayISO(),
      };

      setData((prev) => ({
        ...prev,
        readers: [newReader, ...prev.readers],
      }));
      return { ok: true, message: `Đã thêm độc giả "${fullName}" (${readerCode}).` };
    },
    [data.readers]
  );

  const updateReader = useCallback(
    (readerId: string, updates: Omit<Reader, 'id' | 'createdAt'>): ActionResult => {
      if (!updates.fullName.trim() || !updates.phone.trim()) {
        return { ok: false, message: 'Họ tên và số điện thoại không được để trống.' };
      }
      const dupCode = data.readers.some(
        (r) =>
          r.id !== readerId &&
          r.readerCode.toLowerCase() === updates.readerCode.trim().toLowerCase()
      );
      if (dupCode) {
        return { ok: false, message: `Mã thẻ "${updates.readerCode.trim()}" đã tồn tại.` };
      }

      setData((prev) => ({
        ...prev,
        readers: prev.readers.map((r) =>
          r.id === readerId
            ? {
                ...r,
                ...updates,
                readerCode: updates.readerCode.trim(),
                fullName: updates.fullName.trim(),
                email: updates.email.trim(),
                phone: updates.phone.trim(),
                address: updates.address.trim(),
              }
            : r
        ),
      }));
      return { ok: true, message: `Đã cập nhật độc giả "${updates.fullName.trim()}".` };
    },
    [data.readers]
  );

  const deleteReader = useCallback(
    (readerId: string): ActionResult => {
      const reader = data.readers.find((r) => r.id === readerId);
      if (!reader) return { ok: false, message: 'Không tìm thấy độc giả.' };

      // QUY TẮC NGHIỆP VỤ: Không cho xóa độc giả đang có phiếu mượn chưa hoàn tất.
      const readerRecordIds = new Set(
        data.borrowRecords.filter((rec) => rec.readerId === readerId).map((rec) => rec.id)
      );
      const activeLoans = data.borrowRecords.filter(
        (rec) => rec.readerId === readerId && rec.status !== 'returned'
      );
      const hasUnreturnedDetail = data.borrowDetails.some(
        (d) => readerRecordIds.has(d.borrowRecordId) && d.status === 'borrowed'
      );
      if (activeLoans.length > 0 || hasUnreturnedDetail) {
        return {
          ok: false,
          message: `Không thể xóa độc giả "${reader.fullName}" vì đang có ${Math.max(1, activeLoans.length)} phiếu mượn chưa hoàn tất.`,
        };
      }

      setData((prev) => ({
        ...prev,
        readers: prev.readers.filter((r) => r.id !== readerId),
      }));
      return { ok: true, message: `Đã xóa độc giả "${reader.fullName}".` };
    },
    [data.readers, data.borrowRecords, data.borrowDetails]
  );

  // --- BORROW ---
  const createBorrowRecord = useCallback(
    (input: {
      readerId: string;
      copyIds: string[];
      borrowDate: string;
      dueDate: string;
      notes?: string;
    }): ActionResult & { recordCode?: string } => {
      const { readerId, copyIds, borrowDate, dueDate, notes = '' } = input;

      const reader = data.readers.find((r) => r.id === readerId);
      if (!reader) {
        return { ok: false, message: 'Vui lòng chọn độc giả hợp lệ.' };
      }
      if (reader.status === 'locked') {
        return {
          ok: false,
          message: `Thẻ của độc giả "${reader.fullName}" đang bị tạm khóa, không thể mượn sách.`,
        };
      }
      if (!borrowDate || !dueDate) {
        return { ok: false, message: 'Vui lòng nhập đầy đủ ngày mượn và hạn trả.' };
      }
      if (reader.cardExpiry && reader.cardExpiry < borrowDate) {
        return {
          ok: false,
          message: `Thẻ của độc giả "${reader.fullName}" đã hết hạn (${reader.cardExpiry.split('-').reverse().join('/')}), không thể mượn sách.`,
        };
      }
      // QUY TẮC NGHIỆP VỤ: Hạn trả không được trước ngày mượn.
      if (dueDate < borrowDate) {
        return {
          ok: false,
          message: 'Hạn trả không được trước ngày mượn. Vui lòng chọn lại ngày hợp lệ.',
        };
      }
      if (copyIds.length === 0) {
        return { ok: false, message: 'Vui lòng chọn ít nhất một bản sao sách còn sẵn.' };
      }

      const uniqueCopyIds = Array.from(new Set(copyIds));
      const selectedCopies: BookCopy[] = [];

      for (const cid of uniqueCopyIds) {
        const copy = data.bookCopies.find((c) => c.id === cid);
        if (!copy) {
          return { ok: false, message: 'Có bản sao sách không tồn tại trong hệ thống.' };
        }
        // QUY TẮC NGHIỆP VỤ: Không cho mượn bản sao đang được mượn.
        if (copy.status !== 'available') {
          const reason =
            copy.status === 'borrowed'
              ? 'đang được mượn'
              : copy.status === 'damaged'
              ? 'đang hư hỏng'
              : 'đã mất';
          return {
            ok: false,
            message: `Bản sao "${copy.copyCode}" hiện ${reason}, không thể cho mượn.`,
          };
        }
        selectedCopies.push(copy);
      }

      const recordId = generateId('PM');
      const year = borrowDate.slice(0, 4) || '2026';
      const recordCode = getNextUniqueRecordCode(data.borrowRecords, year);

      const newRecord: BorrowRecord = {
        id: recordId,
        recordCode,
        readerId,
        borrowDate,
        dueDate,
        returnDate: null,
        status: 'borrowing',
        renewalCount: 0,
        notes: notes.trim(),
        createdAt: getTodayISO(),
      };

      const newDetails: BorrowDetail[] = selectedCopies.map((copy) => ({
        id: generateId('BD'),
        borrowRecordId: recordId,
        bookCopyId: copy.id,
        bookId: copy.bookId,
        returnDate: null,
        status: 'borrowed',
        returnCondition: null,
      }));

      setData((prev) => ({
        ...prev,
        borrowRecords: [newRecord, ...prev.borrowRecords],
        borrowDetails: [...prev.borrowDetails, ...newDetails],
        bookCopies: prev.bookCopies.map((c) =>
          uniqueCopyIds.includes(c.id) ? { ...c, status: 'borrowed' } : c
        ),
      }));

      return {
        ok: true,
        recordCode,
        message: `Đã lập phiếu mượn ${recordCode} cho "${reader.fullName}" (${selectedCopies.length} bản sao).`,
      };
    },
    [data.readers, data.bookCopies, data.borrowRecords]
  );

  // --- RETURN ---
  const returnBorrowDetails = useCallback(
    (input: {
      recordId: string;
      detailIds: string[];
      returnDate: string;
      returnCondition?: CopyCondition;
      copyFinalStatus?: 'available' | 'damaged' | 'lost';
    }): ActionResult => {
      const {
        recordId,
        detailIds,
        returnDate,
        returnCondition = 'Tốt',
        copyFinalStatus = 'available',
      } = input;

      const record = data.borrowRecords.find((r) => r.id === recordId);
      if (!record) {
        return { ok: false, message: 'Không tìm thấy phiếu mượn.' };
      }
      if (!returnDate) {
        return { ok: false, message: 'Vui lòng chọn ngày trả.' };
      }
      if (returnDate < record.borrowDate) {
        return { ok: false, message: 'Ngày trả không được trước ngày mượn.' };
      }
      if (detailIds.length === 0) {
        return { ok: false, message: 'Vui lòng chọn ít nhất một bản sao để ghi nhận trả.' };
      }

      const recordDetails = data.borrowDetails.filter((d) => d.borrowRecordId === recordId);
      const targetDetails = recordDetails.filter((d) => detailIds.includes(d.id));

      if (targetDetails.length !== detailIds.length) {
        return { ok: false, message: 'Dữ liệu chi tiết phiếu mượn không hợp lệ.' };
      }

      // QUY TẮC NGHIỆP VỤ: Không cho trả cùng một bản sao hai lần.
      const alreadyReturned = targetDetails.find((d) => d.status === 'returned');
      if (alreadyReturned) {
        return {
          ok: false,
          message: 'Không thể trả cùng một bản sao hai lần. Bản sao này đã được ghi nhận trả trước đó.',
        };
      }

      const returnedCopyIds = targetDetails.map((d) => d.bookCopyId);
      const remainingUnreturned = recordDetails.filter(
        (d) => d.status === 'borrowed' && !detailIds.includes(d.id)
      );
      const isRecordCompleted = remainingUnreturned.length === 0;

      setData((prev) => ({
        ...prev,
        borrowDetails: prev.borrowDetails.map((d) =>
          detailIds.includes(d.id)
            ? {
                ...d,
                status: 'returned',
                returnDate,
                returnCondition,
              }
            : d
        ),
        bookCopies: prev.bookCopies.map((c) =>
          returnedCopyIds.includes(c.id)
            ? {
                ...c,
                status: copyFinalStatus,
                condition: returnCondition,
              }
            : c
        ),
        borrowRecords: prev.borrowRecords.map((r) =>
          r.id === recordId
            ? {
                ...r,
                status: isRecordCompleted ? 'returned' : 'borrowing',
                returnDate: isRecordCompleted ? returnDate : null,
              }
            : r
        ),
      }));

      const lateNote = returnDate > record.dueDate ? ' (Ghi nhận trả quá hạn)' : '';
      return {
        ok: true,
        message: isRecordCompleted
          ? `Đã hoàn tất trả toàn bộ phiếu ${record.recordCode}${lateNote}.`
          : `Đã ghi nhận trả ${targetDetails.length} bản sao thuộc phiếu ${record.recordCode}${lateNote}.`,
      };
    },
    [data.borrowRecords, data.borrowDetails]
  );

  // --- RENEW ---
  const renewBorrowRecord = useCallback(
    (recordId: string, newDueDate: string, note?: string): ActionResult => {
      const record = data.borrowRecords.find((r) => r.id === recordId);
      if (!record) {
        return { ok: false, message: 'Không tìm thấy phiếu mượn.' };
      }

      // QUY TẮC NGHIỆP VỤ: Không cho gia hạn phiếu đã hoàn tất.
      if (record.status === 'returned') {
        return {
          ok: false,
          message: `Phiếu ${record.recordCode} đã hoàn tất trả sách, không thể gia hạn.`,
        };
      }

      if (!newDueDate) {
        return { ok: false, message: 'Vui lòng chọn hạn trả mới.' };
      }
      if (newDueDate < record.borrowDate) {
        return { ok: false, message: 'Hạn trả mới không được trước ngày mượn.' };
      }
      if (newDueDate <= record.dueDate) {
        return {
          ok: false,
          message: 'Hạn trả mới phải sau hạn trả hiện tại để thực hiện gia hạn.',
        };
      }

      setData((prev) => ({
        ...prev,
        borrowRecords: prev.borrowRecords.map((r) =>
          r.id === recordId
            ? {
                ...r,
                dueDate: newDueDate,
                renewalCount: r.renewalCount + 1,
                notes: note?.trim() ? note.trim() : r.notes,
              }
            : r
        ),
      }));

      return {
        ok: true,
        message: `Đã gia hạn phiếu ${record.recordCode} đến ngày ${newDueDate.split('-').reverse().join('/')}.`,
      };
    },
    [data.borrowRecords]
  );

  const resetToSampleData = useCallback((): ActionResult => {
    const fresh = resetLibraryData();
    setData(fresh);
    return { ok: true, message: 'Đã khôi phục toàn bộ dữ liệu mẫu ban đầu.' };
  }, []);

  return {
    books: data.books,
    bookCopies: data.bookCopies,
    readers: data.readers,
    borrowRecords: data.borrowRecords,
    borrowDetails: data.borrowDetails,
    addBook,
    updateBook,
    deleteBook,
    addBookCopy,
    updateBookCopy,
    deleteBookCopy,
    addReader,
    updateReader,
    deleteReader,
    createBorrowRecord,
    returnBorrowDetails,
    renewBorrowRecord,
    resetToSampleData,
  };
}
