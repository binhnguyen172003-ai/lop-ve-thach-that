# Hướng dẫn đưa web Lớp Vẽ Không Vui lên mạng

Thời gian: khoảng 30–45 phút, làm trên máy tính. Chi phí: 0 đồng (gói miễn phí Spark của Firebase, GitHub Pages miễn phí).

Web được lưu trên GitHub và hiển thị bằng GitHub Pages. Cấu trúc thư mục xem ở `README.md`.

---

## Bước 1. Tạo dự án Firebase

1. Vào **console.firebase.google.com**, đăng nhập bằng `binhnguyen172003@gmail.com`.
2. Bấm **Create a project** (Tạo dự án). Đặt tên, ví dụ `lop-ve-khong-vui`.
3. Google Analytics: chọn **tắt** cho gọn. Bấm **Create project**.

## Bước 2. Bật đăng nhập bằng Gmail + mật khẩu

1. Menu trái: **Build → Authentication → Get started**.
2. Tab **Sign-in method** → **Add new provider** → chọn **Email/Password**.
3. Bật dòng đầu **Email/Password** → **Save**. (Không cần bật dòng "Email link".)

Web chỉ dùng cách này, chạy được cả khi học viên mở link trong Zalo, Facebook, Messenger.
Học viên tự tạo tài khoản, bấm link xác nhận gửi vào Gmail, rồi mới gửi yêu cầu duyệt được.

## Bước 3. Tạo cơ sở dữ liệu Firestore

1. Menu trái: **Build → Firestore Database → Create database**.
2. Location: chọn **asia-southeast1 (Singapore)** cho nhanh ở Việt Nam.
3. Chọn **Start in production mode** → **Create**.

## Bước 4. Dán luật bảo mật

1. Trong Firestore Database, mở tab **Rules**.
2. Xoá hết nội dung cũ, mở file `firestore.rules`, sao chép toàn bộ và dán vào.
3. Bấm **Publish**.

Luật này đảm bảo:
- Chỉ Gmail đã được duyệt mới đọc được giáo trình và bài tập.
- Chỉ Gmail của anh mới sửa được giáo trình, giao bài, duyệt học viên.
- Học viên chỉ gửi được yêu cầu duyệt cho chính Gmail của mình.

### Tự đưa luật bảo mật lên Firebase (làm 1 lần, sau đó khỏi dán tay)

Kho GitHub có quy trình **Đưa luật bảo mật lên Firebase**: mỗi khi `firestore.rules` hoặc `storage.rules` thay đổi trên nhánh main, GitHub tự đưa luật lên Firebase.

1. Firebase Console → bánh răng **Project settings** → tab **Service accounts** → bấm **Generate new private key** → **Generate key**. Máy tải về 1 file `.json`.
2. GitHub → kho `lop-ve-thach-that` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Secret: mở file `.json` bằng Notepad, chép **toàn bộ** chữ trong file, dán vào → **Add secret**.
3. GitHub → tab **Actions** → **Đưa luật bảo mật lên Firebase** → **Run workflow** → đợi dấu ✓ xanh (khoảng 1 phút).
4. Xoá file `.json` trong máy (khoá này mở được toàn bộ Firebase, không gửi cho ai, không đăng lên đâu).

Nếu bước 3 báo lỗi quyền (`permission`/`403`): Google Cloud Console → **IAM** → tìm tài khoản `firebase-adminsdk-…` → thêm vai trò **Firebase Rules Admin** → chạy lại bước 3. Bước luật Storage có thể báo lỗi nếu Storage chưa bật; không ảnh hưởng luật Firestore.

## Bước 5. Lấy mã kết nối và dán vào web

1. Bấm bánh răng cạnh **Project Overview** → **Project settings**.
2. Kéo xuống **Your apps** → bấm biểu tượng **`</>`** (Web).
3. Đặt tên app, ví dụ `web`. **Không** tick Firebase Hosting. Bấm **Register app**.
4. Firebase hiện đoạn `const firebaseConfig = { ... }`. Sao chép 6 dòng bên trong dấu `{ }`.
5. Trên GitHub, mở file `config/firebase-config.js` → bấm biểu tượng bút chì (Edit) → thay 6 dòng mẫu bằng 6 dòng vừa chép → **Commit changes**. Hoặc gửi 6 dòng đó cho Claude để Claude sửa giúp.

Mã này không phải mật khẩu, để công khai trên web là bình thường. Bảo mật nằm ở luật bước 4.

## Bước 6. Bật GitHub Pages

1. Mở kho trên GitHub → **Settings → Pages**.
2. Mục **Build and deployment**: Source chọn **GitHub Actions** (không chọn "Deploy from a branch").
3. Chờ 1–2 phút, trang hiện địa chỉ dạng `https://<tên-github>.github.io/<tên-kho>/`.

Từ đó, mỗi lần có thay đổi trên nhánh main, web tự cập nhật sau 1–2 phút (xem tiến độ ở tab **Actions** của kho, dấu ✓ xanh là đã lên). Bước đưa lên còn tự gắn mã phiên bản mới, nên học viên không bị kẹt ở bản cũ.

## Bước 7. Cho phép web dùng địa chỉ mới

1. Quay lại Firebase → **Authentication → Settings → Authorized domains**.
2. Bấm **Add domain**, nhập `<tên-github>.github.io` (không có https://, không có tên kho) → **Add**.

Bỏ qua bước này, link xác nhận Gmail sẽ không quay về đúng web.

## Bước 8. Kiểm tra và nạp giáo trình

1. Mở web, vào **Đăng nhập** → mục **Lần đầu: Tạo tài khoản** → điền họ tên, Gmail của anh, mật khẩu → **Tạo tài khoản** → bấm link xác nhận trong Gmail.
   (Nếu báo "Gmail này đã có tài khoản" vì trước đây anh vào bằng nút Google: bấm nút **Gửi thư đặt mật khẩu cho Gmail này** ngay bên dưới, đặt mật khẩu trong thư, rồi vào mục **Đăng nhập**.)
2. Vào trang **Duyệt học viên**: dòng trên cùng phải báo **✓ Máy chủ hoạt động tốt**. Nếu hiện khung cam "luật bảo mật bản CŨ", bấm theo 3 bước trong khung.
2. Trang hiện nhãn **Giáo viên**. Kéo xuống cuối, bấm **Nạp giáo trình có sẵn** để đưa 13 bài vào.
3. Thử bằng một Gmail khác (hoặc nhờ một học viên): đăng nhập → gửi yêu cầu duyệt. Yêu cầu hiện ở bảng **Yêu cầu chờ duyệt** của anh → bấm **Duyệt**. Màn hình học viên tự mở khoá, không cần tải lại.

## Bước 9. Để Google tìm thấy web

1. Vào **search.google.com/search-console** → **Add property** → **URL prefix** → dán địa chỉ web.
2. Chọn cách xác minh **HTML tag**, gửi đoạn mã cho Claude để thêm vào `index.html`, chờ 2 phút rồi bấm **Verify**.
3. Menu trái **Sitemaps** → nhập `sitemap.xml` → **Submit** (file này đã có sẵn trong kho).
4. Mục **URL inspection** → dán địa chỉ → **Request indexing**.
5. Gắn địa chỉ web vào fanpage, bio Instagram, TikTok và **Google Business Profile** của 2 cơ sở để Google tin cậy web hơn.

---

## Dùng hằng ngày

Mọi việc quản lý nằm trong nút **Tài khoản** (góc trên bên phải). Vào đó sẽ thấy thanh công cụ: Tổng quan · Làm việc · Giáo trình · Bài tập · Điểm danh · Duyệt. Số đỏ trên nút Tài khoản = tin nhắn / thông báo / yêu cầu mới.

| Việc | Làm ở đâu |
|---|---|
| Duyệt học viên mới | Tài khoản → **Duyệt** → Yêu cầu chờ duyệt |
| Duyệt nhanh không cần học viên gửi | Tài khoản → Duyệt → **Duyệt trực tiếp một Gmail** |
| Học viên nghỉ học | Duyệt → bảng Học viên đã duyệt → **Thu hồi** |
| Nhắn tin riêng với học viên / giáo viên | Tài khoản → **Làm việc** → Tin nhắn (ô "Nhắn tin mới cho…" để bắt đầu) |
| Đăng thông báo (nghỉ học, đổi lịch…) | Làm việc → **Thông báo** → chọn gửi tới Tất cả hoặc Chỉ giáo viên |
| Giao việc cho giáo viên | Làm việc → **Việc cần làm** → giao cho một người hoặc tất cả, có hạn |
| Điểm danh | Tài khoản → **Điểm danh** |
| Giao bài tập | Tài khoản → Bài tập → khung **Giao bài tập mới** |
| Thêm bài giáo trình | Tài khoản → Giáo trình → khung **Thêm bài vào giáo trình** |
| Thêm / sửa giáo viên trên trang chủ | File `data/noi-dung.js` → danh sách `GIAO_VIEN`, ảnh đặt trong `assets/img/giao-vien/` |
| Thêm video nền trang chủ | Đặt video (10–20 giây, dưới 6 MB) vào `assets/video/`, điền tên file vào `VIDEO_BIA` trong `data/noi-dung.js` |
| Thêm giáo viên quản lý | Firestore → tạo collection `admins`, document ID là Gmail giáo viên (chữ thường), thêm 1 trường bất kỳ |

Ai thấy gì trong khu Làm việc:
- **Học viên:** nhắn riêng với anh chị (chỉ anh chị đọc), xem thông báo chung.
- **Giáo viên:** nhắn với mọi học viên, nhắn riêng quản lý, đăng thông báo chung, tick xong việc được giao.
- **Quản lý:** thấy tất cả, đăng thông báo nội bộ chỉ giáo viên đọc, giao và xoá việc.

## Thi thử & Vận hành lớp (bản cập nhật tháng 10/2026)

> **Bắt buộc làm 1 lần:** mở file `firestore.rules` → sao chép toàn bộ → Firebase Console → Firestore Database → **Rules** → dán đè → **Publish**.
> Chưa dán thì 2 trang mới báo “Tính năng mới chưa bật được trên máy chủ”. Trang **Quản lý** cũng có nút **Sao chép luật mới** khi phát hiện luật cũ.

| Việc | Làm ở đâu | Ai dùng |
|---|---|---|
| Tạo đề thi thử (thời lượng, giờ mở/đóng, đề, ảnh đề, phiếu chấm) | Tài khoản → **⏱️ Thi thử** → Tạo đề thi thử | Giáo viên, quản lý |
| Làm bài thi thử: bấm Bắt đầu → đồng hồ chạy → chụp ảnh bài → Nộp | Tài khoản → Thi thử | Học viên |
| Chấm theo phiếu tiêu chí + nhận xét | Thi thử → Xem & chấm bài | Giáo viên, quản lý |
| Xem điểm từng lần và biểu đồ tiến bộ | Thi thử → Kết quả các lần thi | Học viên |
| Xếp ca dạy (có lặp 4 tuần) | Tài khoản → **🛠️ Vận hành** → Ca dạy | Quản lý |
| Xin đổi ca / duyệt đổi ca | Vận hành → Ca dạy | Giáo viên gửi, quản lý duyệt |
| Ghi bàn giao cuối ca (học viên đang làm gì, cần sửa gì, buổi sau) | Vận hành → Bàn giao | Giáo viên |
| Báo thiếu đồ, đồ hỏng (kèm ảnh) → Đã nhận → Đang xử lý → Hoàn thành | Vận hành → Sự cố | Mọi người gửi, quản lý xử lý |
| Lịch trực nhật + kiểm tra cuối buổi | Vận hành → Trực nhật | Giáo viên sửa lịch & xác nhận; học viên xem |
| Xem ai sửa gì, khôi phục dữ liệu xoá/sửa nhầm | Vận hành → **Nhật ký sửa** | Chỉ quản lý |

- Việc cuối buổi và phiếu chấm mặc định theo môn: sửa trong `data/noi-dung.js` (`VIEC_CUOI_BUOI`, `TIEU_CHI_THI`).
- Nhật ký tự ghi mỗi lần giáo viên/quản lý thêm, sửa, xoá: học viên, nhận xét/điểm, điểm danh, bài tập, giáo trình, lịch nhắc, bài vẽ, bản tin, kho, ca dạy, thi thử… Nhật ký không ai sửa hay xoá được. Mục có ảnh quá lớn (trên ~600 KB) chỉ ghi lại việc sửa, không lưu được bản để khôi phục.
- Giờ bắt đầu và giờ nộp bài thi được máy chủ đối chiếu, học viên không khai lùi giờ được; nộp quá giờ vẫn nhận nhưng ghi “nộp muộn”.

## Gặp lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Trang báo "Web chưa kết nối Firebase" | Chưa làm bước 5, hoặc web chưa cập nhật (chờ 2 phút rồi tải lại trang bằng Ctrl+F5) |
| Bấm đăng nhập báo lỗi `unauthorized-domain` | Chưa làm bước 7 |
| Học viên đã duyệt vẫn bị khoá | Học viên đăng nhập sai Gmail. Gmail duyệt phải trùng Gmail đăng nhập |
| Bấm "Nạp giáo trình" báo chưa nạp được | Chưa dán luật ở bước 4, hoặc đang đăng nhập không phải Gmail giáo viên |
| Mở web trong Facebook/Zalo không đăng nhập được | Bấm "Mở bằng trình duyệt" (Chrome/Safari) rồi đăng nhập lại |

## Tệp đính kèm bài tập (bản cập nhật tháng 10/2026)

Giáo viên mở **Bài tập → Giao bài mới**, chọn hoặc kéo thả tài liệu, rồi bấm **Giao bài cho học viên**. Có thể chọn tối đa 5 tệp, mỗi tệp 10 MB, tổng 25 MB. Hỗ trợ PDF, JPG/PNG/WebP, Word, PowerPoint, Excel, TXT và Markdown. Ảnh có xem trước; bỏ từng tệp bằng nút ×. Bản nháp chữ được lưu theo tài khoản; tệp phải chọn lại nếu tải lại trang.

Trong khi tải có tiến độ và nút **Hủy tải**. Khi lưu thông tin bài, chờ xác nhận thành công trước khi đóng trang. Nếu tải lỗi, biểu mẫu và tệp được giữ để thử lại; không tự đăng một bài thiếu tài liệu. Bài không đính kèm vẫn dùng Firestore như trước.

### Thiết lập kho tệp một lần

Việc đưa mã lên GitHub Pages **không tự triển khai Firebase Storage Rules hoặc CORS**. Cần quản lý Firebase thiết lập phần này trước khi dùng tải tệp thật:

1. Mở Firebase Console → dự án `lop-ve-thach-that` → **Storage**. Kiểm tra bucket `lop-ve-thach-that.firebasestorage.app` đã được tạo và đủ điều kiện sử dụng. Nếu Firebase yêu cầu thay đổi gói thanh toán, chủ dự án tự xem và xác nhận; bản cập nhật này không tự thay đổi gói.
2. Trong **Storage → Rules**, dán `storage.rules` và Publish. Firebase có thể yêu cầu bật quyền đọc Firestore để kiểm tra vai trò; chấp nhận cho đúng dự án này. Không dùng quy tắc công khai `allow read, write: if true`.
3. Hoặc với Firebase CLI đã đăng nhập đúng tài khoản quản lý:
   ```sh
   firebase deploy --only storage --project lop-ve-thach-that
   ```
4. Cho phép website tải tệp có xác thực bằng cấu hình CORS (Google Cloud CLI đã đăng nhập):
   ```sh
   gcloud storage buckets update gs://lop-ve-thach-that.firebasestorage.app --cors-file=config/storage-cors.json
   ```
5. Kiểm tra thật bằng giáo viên: giao một bài thử có PDF, đăng nhập học viên đã duyệt để tải xuống, sau đó xóa bài thử. Người chưa đăng nhập/học viên chưa duyệt không được đọc tệp; học viên không được tải lên hoặc xóa tệp của đề bài.

Quyền: chỉ quản lý/giáo viên đã xác thực được tải lên và xóa; học viên đã duyệt được tải tài liệu của bài đã đăng. Dữ liệu bài chỉ lưu tên, loại, kích thước và đường dẫn; không lưu URL công khai có token tải xuống, không đưa tài liệu bài tập lên kho GitHub công khai.

Khi xóa bài, hệ thống xóa tài liệu kèm theo. Nếu mạng hoặc quyền ngăn dọn tệp, thông báo rõ để quản lý kiểm tra thư mục `baitap/<mã bài>/` trong Storage. Việc đóng trình duyệt giữa lúc tải có thể để lại tệp tạm; quản lý có thể dọn những thư mục không có bài tương ứng trong Firestore.

## Cấp khoá học cho học viên (nút "Vào học")
- Khi **Duyệt** học viên, tick các khoá em được học (web tự tick sẵn theo lớp em đăng ký: Khối H → Hình hoạ cơ bản, Hình hoạ người, Màu; Khối V → Hình hoạ cơ bản, Hình hoạ tượng, Mỹ thuật 2; Vẽ cơ bản → Hình hoạ cơ bản; còn lại → tất cả).
- Muốn đổi sau này: trang **Duyệt → Danh sách học viên**, bấm chọn/bỏ khoá ngay dưới cột Chương trình, web tự lưu.
- Học viên đăng nhập: thẻ khoá được cấp ở mục "Các khoá học" hiện **✓ Khoá của em** và nút **Vào học →** mở thẳng khoá đó trong Giáo trình. Khoá chưa cấp hiện "Nhắn thầy để học thêm khoá này". Trong Giáo trình, em chỉ thấy các khoá được cấp.
- Mất mạng / máy chủ không trả lời: học viên đã được duyệt vẫn học bằng quyền và bài đã lưu trên máy, web tự thử lại; không còn bị khoá oan.

## Bài học đầy đủ trong Giáo trình
- Mỗi khoá có từng bài riêng (Bài 0, Bài 1, … / Chuyên đề 0–11 / Sổ tay), nội dung lấy từ Sách học viên Pro Max: bảng, mẹo, thử thách, tự kiểm tra.
- Quản lý chỉ cần **mở web bằng tài khoản quản lý một lần**: web tự đưa bài học mới lên (không cần bấm nút). Có bản mới (file `data/bai-hoc.js` đổi mã BAN) thì lần mở sau tự cập nhật.
- Bài nào quản lý xoá trên web sẽ không bị thêm lại.
