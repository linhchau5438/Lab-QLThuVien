# LibraVN — Hệ Thống Quản Lý Thư Viện

Ứng dụng Web quản lý thư viện hoàn chỉnh xây dựng bằng **React**, **Vite** và **Tailwind CSS**, giao diện **100% tiếng Việt** với tông màu chủ đạo xanh dương và trắng, lưu trữ dữ liệu bền vững trực tiếp trên **LocalStorage** (không cần backend hay API key).

## Chức năng chính

1. **Tổng quan (Dashboard)**
   - Thống kê thời gian thực từ dữ liệu thực tế: Tổng đầu sách, Tổng bản sao, Bản sao còn sẵn, Bản sao đang mượn, Tổng độc giả, Số phiếu quá hạn.
   - Biểu đồ tương tác số lượt mượn & trả theo từng tháng.
   - Danh sách phiếu quá hạn cần xử lý và các phiếu mượn gần đây.
2. **Quản lý sách & bản sao**
   - Thêm, sửa, xóa đầu sách (có hộp thoại xác nhận xóa).
   - Tìm kiếm theo tên sách, tác giả, ISBN, vị trí kệ; lọc theo thể loại và tình trạng sẵn có.
   - Quản lý chi tiết từng bản sao (`BookCopies`): thêm bản sao mới, sửa trạng thái (`Còn sẵn`, `Hư hỏng`, `Đã mất`) và tình trạng vật lý (`Mới`, `Tốt`, `Khá`, `Cần bảo trì`), xóa bản sao.
3. **Quản lý độc giả**
   - Thêm, sửa, xóa thẻ độc giả; tìm kiếm theo tên, mã thẻ, SĐT, email; lọc theo trạng thái thẻ.
   - Xem đầy đủ lịch sử mượn/trả sách của từng độc giả.
4. **Mượn sách**
   - Chọn độc giả đang hoạt động, chọn một hoặc nhiều bản sao còn sẵn, nhập ngày mượn và hạn trả (kèm nút chọn nhanh `+7`, `+14`, `+30` ngày).
   - Tự động tạo phiếu mượn (`BorrowRecords`), chi tiết mượn (`BorrowDetails`) và chuyển trạng thái bản sao sang `Đang mượn`.
5. **Trả sách**
   - Tìm kiếm phiếu mượn theo mã phiếu, tên độc giả, tên sách hoặc mã bản sao.
   - Ghi nhận ngày trả, tình trạng sách khi trả, trả từng bản sao hoặc trả toàn bộ sách chưa trả trong phiếu.
   - Tự động cập nhật trạng thái bản sao và xác định chính xác số ngày quá hạn.
6. **Gia hạn sách**
   - Gia hạn hạn trả cho các phiếu đang mượn, tự động tăng bộ đếm số lần gia hạn.
7. **Thống kê**
   - Biểu đồ & bảng tổng hợp lượt mượn theo tháng (6 tháng / 12 tháng gần nhất).
   - Bảng xếp hạng sách được mượn nhiều nhất.
   - Danh sách phiếu quá hạn kèm thông tin liên hệ độc giả và điều hướng nhanh sang Trả sách / Gia hạn.

## Quy tắc nghiệp vụ được đảm bảo

- Không cho mượn bản sao đang được mượn (hoặc đang hư hỏng/mất).
- Không cho trả cùng một bản sao hai lần.
- Không cho xóa độc giả đang có phiếu mượn chưa hoàn tất.
- Không cho gia hạn phiếu mượn đã hoàn tất.
- Hạn trả không được trước ngày mượn.
- Mọi thay đổi được lưu tự động vào `localStorage` và giữ nguyên khi tải lại trang.

## Cấu trúc dữ liệu (`src/types/library.ts`)

- `Books`: Thông tin đầu sách (`id`, `isbn`, `title`, `author`, `category`, `publisher`, `publishYear`, `shelfLocation`, `description`, `createdAt`).
- `BookCopies`: Quản lý từng bản sao vật lý (`id`, `bookId`, `copyCode`, `status`, `condition`, `note`, `acquiredAt`).
- `Readers`: Hồ sơ thẻ độc giả (`id`, `readerCode`, `fullName`, `email`, `phone`, `address`, `cardExpiry`, `status`, `createdAt`).
- `BorrowRecords`: Phiếu mượn tổng (`id`, `recordCode`, `readerId`, `borrowDate`, `dueDate`, `returnDate`, `status`, `renewalCount`, `notes`, `createdAt`).
- `BorrowDetails`: Chi tiết từng bản sao trong phiếu mượn (`id`, `borrowRecordId`, `bookCopyId`, `bookId`, `returnDate`, `status`, `returnCondition`).

Dữ liệu mẫu khởi tạo sẵn trong `src/data/seedData.ts` gồm **16 đầu sách**, **34 bản sao**, **12 độc giả** và **17 phiếu mượn** nhất quán.

## Hướng dẫn chạy ứng dụng

```bash
# 1. Cài đặt thư viện
npm install

# 2. Chạy môi trường phát triển (mặc định cổng 3000)
npm run dev

# 3. Kiểm tra kiểu dữ liệu và biên dịch production
npm run lint
npm run build
```
