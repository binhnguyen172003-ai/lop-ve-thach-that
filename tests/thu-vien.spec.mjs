// Thư viện Video (YouTube) & Ebook (Canva): quy trình duyệt, phân quyền, thông báo, bố cục, dữ liệu cũ.
// Nhiều người dùng trên cùng một "máy chủ" giả: đổi tài khoản bằng __fakeAuth rồi mở lại trang.
import { test, expect, timTranChu, tranNgang, docFB, nhatKyFB } from "./support/fixtures.mjs";
import { TK } from "./support/du-lieu-mau.mjs";
import { VIDEO_MAU } from "../data/video-mau.js";

// Kịch bản nhiều người dùng đổi tài khoản liên tục (mỗi lần tải lại trang): cho phép chạy lâu hơn mức 30 giây mặc định
test.describe.configure({ timeout: 120_000 });

const YT_MOI = "https://youtu.be/dQw4w9WgXcQ", YT_ID = "dQw4w9WgXcQ";
const CANVA_XEM = "https://www.canva.com/design/DAFthu123/AbC-tok_9/view", CANVA_SUA = "https://www.canva.com/design/DAFthu123/AbC-tok_9/edit";

async function la(page, mail, hash) {
  await page.evaluate(m => m ? window.__fakeAuth.dangNhap(m) : window.__fakeAuth.dangXuat(), mail);
  await page.goto("/#" + hash);
  await page.reload(); // đăng nhập lại từ đầu như người dùng thật mở web
  await page.waitForFunction(() => window.__appOk === true);
  if (/^(video|ebook)$/.test(hash)) await expect(page.locator(`#tv-${hash}`)).not.toBeEmpty();
}
const moQL = async (page, loai) => { await page.locator(`#tv-${loai} [data-tv-che="ql"]`).click(); await expect(page.locator(`#tv-ql-${loai}`)).toBeVisible(); };
const the = (page, ten) => page.locator(".tv-the", { hasText: ten });
const thaoTac = async (page, ten, nhan) => {
  const t = the(page, ten), nut = t.locator(".tv-the-nut > .btn", { hasText: nhan });
  await expect(nut.or(t.locator(".tv-them summary")).first()).toBeVisible(); // chờ thẻ vẽ xong với dữ liệu mới
  if (await nut.count()) return nut.first().click();
  await t.locator(".tv-them summary").click();
  await t.locator(".tv-them-ds .btn", { hasText: nhan }).click();
};
const docVideo = async (page, ten) => page.evaluate(t => [...window.__FAKE_FB.docs.entries()].filter(([k, v]) => k.startsWith("tv_video/") && (v.tieuDe === t || (v.banSua && v.banSua.tieuDe === t))).map(([k, v]) => ({ id: k, ...v }))[0], ten);
// chờ dữ liệu từ "máy chủ" về hết (danh sách tạm từ dữ liệu cũ hiện trước) rồi mới đọc
const tieuDeHocVienThay = async page => { await page.waitForTimeout(700); return page.$$eval("#tv-video .gt-the .gt-ten", bs => bs.map(b => b.textContent.trim())); };

test("Dữ liệu cũ: 17 video chân dung giữ đúng link YouTube, nằm trong danh mục Hình họa chân dung", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.hocVien, hash: "video" });
  await expect(page.locator("#tv-video .gt-the")).toHaveCount(17);
  await expect(page.locator('#tv-video [data-tv-dm="Hình họa chân dung"]')).toContainText("0/17");
  // Mở từng video: khung nhúng YouTube và nút mở YouTube đúng link gốc
  for (const [link] of VIDEO_MAU.slice(0, 3)) {
    const id = link.split("/").pop();
    await page.locator(`#tv-video [data-tv-xem="yt-${id}"]`).click();
    await expect(page.locator(`#tv-bai-video iframe`)).toHaveAttribute("src", new RegExp(id));
    await expect(page.locator(`#tv-bai-video a[href="${link}"]`)).toBeVisible();
    await page.locator("#tv-bai-video [data-tv-dong]").click();
  }
  // Link cũ #nang-cao tự chuyển sang thư viện Video
  await page.goto("/#nang-cao");
  await expect(page).toHaveURL(/#video$/);
});

test("Quản lý nạp 17 video có sẵn: link giữ nguyên, tiến độ học viên không mất", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.hocVien, hash: "video" });
  await page.locator(`#tv-video [data-tv-xem="yt-vZdFuUTUeJw"]`).click();
  await page.locator("#tv-bai-video [data-tv-xong]").click();
  await expect(page.locator("#tv-bai-video [data-tv-xong]")).toContainText("Bỏ đánh dấu");
  await la(page, TK.quanLy, "video"); await moQL(page, "video");
  await page.locator("[data-tv-napmau]").click();
  await expect(page.locator('#tv-ql-video [data-tv-tab="xuatban"]')).toContainText("17");
  const links = await page.evaluate(() => [...window.__FAKE_FB.docs.entries()].filter(([k]) => k.startsWith("tv_video/")).map(([, v]) => v.link).sort());
  expect(links).toEqual(VIDEO_MAU.map(x => x[0]).sort());
  await la(page, TK.hocVien, "video");
  await expect(page.locator("#tv-video .gt-the")).toHaveCount(17);
  await expect(page.locator('#tv-video [data-tv-dm="Hình họa chân dung"]')).toContainText("1/17");
});

test("Quy trình đầy đủ: giáo viên thêm → quản lý yêu cầu sửa → gửi lại → duyệt → xuất bản → học viên thấy", async ({ page, moTrang }, info) => {
  await moTrang({ nguoi: TK.giaoVien, hash: "video" });
  await moQL(page, "video");
  await page.locator("[data-tv-them]").click();
  // Link sai
  await page.fill("#tvs-link", "https://example.com/video/123");
  await expect(page.locator("#tvs-link-tt")).toContainText("Không nhận ra link YouTube");
  await page.fill("#tvs-link", YT_MOI);
  await expect(page.locator("#tvs-link-tt")).toContainText("hợp lệ");
  await page.fill("#tvs-ten", "Dựng hình đầu tượng");
  await page.fill("#tvs-dm", "Hình họa tượng");
  await page.locator('[data-tvs="gui"]').click();
  await expect(page.locator("#toast")).toContainText("Đã gửi duyệt");
  let d = await docVideo(page, "Dựng hình đầu tượng");
  expect([d.duyet, d.hienThi, d.nguoiTao, d.ytId]).toEqual(["cho", "chua", TK.giaoVien, YT_ID]);
  // Giáo viên không có nút duyệt / xuất bản
  await expect(the(page, "Dựng hình đầu tượng").locator("[data-tv-tt=duyet], [data-tv-tt=xuatban]")).toHaveCount(0);
  // Bấm gửi trùng link: báo trùng, không tạo thêm
  await page.locator("[data-tv-them]").click();
  await page.fill("#tvs-link", `https://www.youtube.com/watch?v=${YT_ID}`);
  await expect(page.locator("#tvs-link-tt")).toContainText("Trùng với “Dựng hình đầu tượng”");
  await page.locator('[data-tvs="huy"]').click();

  // Học viên chưa thấy
  await la(page, TK.hocVien, "video");
  expect(await tieuDeHocVienThay(page)).not.toContain("Dựng hình đầu tượng");

  // Quản lý: thông báo chờ duyệt → bấm mở đúng tài liệu, không bị menu che
  await la(page, TK.quanLy, "tai-khoan");
  await page.locator("#tl-nhac-nut").click();
  await page.locator("#tl-nhac-ds a.tl-nh", { hasText: "Video chờ duyệt: Dựng hình đầu tượng" }).click();
  await expect(page).toHaveURL(/#video$/);
  const card = the(page, "Dựng hình đầu tượng");
  await expect(card).toBeVisible();
  await page.waitForTimeout(900);
  const v = await card.evaluate(e => { const r = e.getBoundingClientRect(), n = Math.max(...[...document.querySelectorAll("body > nav, .acc-nav")].map(x => x.getBoundingClientRect().bottom)); return { top: r.top, bottom: r.bottom, nav: n, cao: innerHeight }; });
  expect(v.top, "Thẻ bị menu che").toBeGreaterThanOrEqual(v.nav - 1);
  expect(v.bottom).toBeLessThanOrEqual(v.cao + 1);
  await info.attach("thong-bao-mo-dung-tai-lieu", { body: await page.screenshot(), contentType: "image/png" });

  // Yêu cầu sửa: bắt buộc lý do
  await thaoTac(page, "Dựng hình đầu tượng", "Yêu cầu sửa");
  await page.locator("#tv-hop-ok").click();
  await expect(page.locator("#tv-hop-tt")).toContainText("Cần nhập lý do");
  await page.fill("#tv-lydo", "Thêm mô tả các bước dựng hình");
  await page.locator("#tv-hop-ok").click();
  await expect(card).toHaveCount(0); // rời tab Chờ duyệt
  await page.locator('[data-tv-tab="sua"]').click();
  await expect(card.locator(".tv-lydo")).toContainText("Thêm mô tả các bước");
  expect((await docVideo(page, "Dựng hình đầu tượng")).duyet).toBe("sua");

  // Giáo viên nhận thông báo kết quả, sửa và gửi lại
  await la(page, TK.giaoVien, "video");
  await page.locator("#tl-nhac-nut").click();
  await page.locator("#tl-nhac-ds a.tl-nh", { hasText: "Cần chỉnh sửa" }).click();
  await expect(the(page, "Dựng hình đầu tượng").locator(".tv-lydo")).toContainText("Thêm mô tả");
  await thaoTac(page, "Dựng hình đầu tượng", "Sửa");
  await page.fill("#tvs-mt", "Bước 1: dựng khối lớn. Bước 2: chia mảng.");
  await page.locator('[data-tvs="gui"]').click();
  d = await docVideo(page, "Dựng hình đầu tượng");
  expect([d.duyet, d.lyDo, d.moTa]).toEqual(["cho", "", "Bước 1: dựng khối lớn. Bước 2: chia mảng."]);

  // Quản lý duyệt, phạm vi theo khoá Hình hoạ người, xuất bản
  await la(page, TK.quanLy, "video"); await moQL(page, "video");
  await thaoTac(page, "Dựng hình đầu tượng", "Phê duyệt");
  await expect(the(page, "Dựng hình đầu tượng")).toContainText("Đã duyệt");
  await thaoTac(page, "Dựng hình đầu tượng", "Phạm vi xem");
  await page.selectOption("#tv-pv", "khoa");
  await page.locator('#tv-pv-khoa input[value="Hình hoạ người"]').check();
  await page.locator("#tv-pv-ok").click();
  await thaoTac(page, "Dựng hình đầu tượng", "Xuất bản");
  await expect(the(page, "Dựng hình đầu tượng")).toContainText("Đã xuất bản");

  // Học viên được cấp khoá Hình hoạ người thấy; lịch sử ghi đủ các bước
  await la(page, TK.hocVien, "video");
  expect(await tieuDeHocVienThay(page)).toContain("Dựng hình đầu tượng");
  const ls = await page.evaluate(() => [...window.__FAKE_FB.docs.entries()].filter(([k]) => k.startsWith("tv_lichsu/")).map(([, v]) => v.hanhDong));
  for (const h of ["gui", "yeucausua", "duyet", "phamvi", "xuatban"]) expect(ls).toContain(h);
});

test("Sửa tài liệu đã xuất bản: bản cũ vẫn chạy tới khi duyệt; từ chối có lý do; ẩn, khôi phục, lưu trữ", async ({ page, moTrang }) => {
  const db = (await import("./support/du-lieu-mau.mjs")).duLieuMau();
  db.tv_video = { "v-1": { tieuDe: "Ánh sáng trên khối cầu", moTa: "", danhMuc: "Hình họa cơ bản", link: "https://www.youtube.com/watch?v=" + YT_ID, ytId: YT_ID, anh: "", thoiLuong: "", pdf: "",
    thuTu: 1, duyet: "daduyet", hienThi: "xuatban", phamViKieu: "hocvien", phamViKhoa: [], phamViMail: [], phienDuyet: 1, banSua: null, lyDo: "",
    nguoiTao: TK.giaoVien, tenNguoiTao: "Giáo Viên Thử", tao: 1, guiLuc: 1, xuLyBoi: TK.quanLy, xuLyLuc: 1, lichXuatBan: 0, capNhat: 1, v: 3 } };
  await moTrang({ nguoi: TK.giaoVien, hash: "video", db });
  await moQL(page, "video");
  await thaoTac(page, "Ánh sáng trên khối cầu", "Chỉnh sửa (tạo bản sửa)");
  await expect(page.locator("#tv-soan-video h3")).toContainText("Tạo bản sửa");
  await page.fill("#tvs-ten", "Ánh sáng và bóng đổ khối cầu");
  await page.locator('[data-tvs="gui"]').click();
  await la(page, TK.hocVien, "video");
  expect(await tieuDeHocVienThay(page)).toContain("Ánh sáng trên khối cầu"); // bản cũ vẫn hiển thị
  // Quản lý từ chối bản sửa (bắt buộc lý do) → bản cũ vẫn chạy
  await la(page, TK.quanLy, "video"); await moQL(page, "video");
  await thaoTac(page, "Ánh sáng và bóng đổ khối cầu", "Từ chối");
  await page.fill("#tv-lydo", "Tiêu đề quá dài");
  await page.locator("#tv-hop-ok").click();
  expect((await docFB(page, "tv_video/v-1")).duyet).toBe("tuchoi");
  expect((await docFB(page, "tv_video/v-1")).tieuDe).toBe("Ánh sáng trên khối cầu");
  // Giáo viên tạo bản sửa lại → quản lý duyệt → học viên thấy bản mới
  await la(page, TK.giaoVien, "video"); await moQL(page, "video");
  await thaoTac(page, "Ánh sáng và bóng đổ khối cầu", "Tạo bản sửa");
  await page.fill("#tvs-ten", "Bóng đổ khối cầu");
  await page.locator('[data-tvs="gui"]').click();
  await la(page, TK.quanLy, "video"); await moQL(page, "video");
  await thaoTac(page, "Bóng đổ khối cầu", "Duyệt bản sửa");
  await la(page, TK.hocVien, "video");
  expect(await tieuDeHocVienThay(page)).toContain("Bóng đổ khối cầu");
  expect(await tieuDeHocVienThay(page)).not.toContain("Ánh sáng trên khối cầu");
  // Ẩn (có xác nhận) → học viên không thấy → khôi phục → thấy lại → lưu trữ → xoá
  await la(page, TK.quanLy, "video"); await moQL(page, "video");
  await thaoTac(page, "Bóng đổ khối cầu", "Ẩn"); await page.locator("#tv-hop-ok").click();
  await la(page, TK.hocVien, "video");
  expect(await tieuDeHocVienThay(page)).not.toContain("Bóng đổ khối cầu");
  await la(page, TK.quanLy, "video"); await moQL(page, "video");
  await page.locator('[data-tv-tab="an"]').click();
  await thaoTac(page, "Bóng đổ khối cầu", "Khôi phục hiển thị");
  await la(page, TK.hocVien, "video");
  expect(await tieuDeHocVienThay(page)).toContain("Bóng đổ khối cầu");
  await la(page, TK.quanLy, "video"); await moQL(page, "video");
  await thaoTac(page, "Bóng đổ khối cầu", "Lưu trữ"); await page.locator("#tv-hop-ok").click();
  await page.locator('[data-tv-tab="luutru"]').click();
  await thaoTac(page, "Bóng đổ khối cầu", "Xoá vĩnh viễn"); await page.locator("#tv-hop-ok").click();
  expect(await docFB(page, "tv_video/v-1")).toBeUndefined();
});

test("Hai quản lý cùng thao tác: người sau được báo, không ghi đè", async ({ page, moTrang }) => {
  const db = (await import("./support/du-lieu-mau.mjs")).duLieuMau();
  db.tv_video = { "v-2": { tieuDe: "Video chờ duyệt", moTa: "", danhMuc: "Màu", link: "https://www.youtube.com/watch?v=" + YT_ID, ytId: YT_ID, anh: "", thoiLuong: "", pdf: "",
    thuTu: 1, duyet: "cho", hienThi: "chua", phamViKieu: "hocvien", phamViKhoa: [], phamViMail: [], phienDuyet: 0, banSua: null, lyDo: "",
    nguoiTao: TK.giaoVien, tenNguoiTao: "Giáo Viên Thử", tao: 1, guiLuc: 1, xuLyBoi: "", xuLyLuc: 0, lichXuatBan: 0, capNhat: 1, v: 1 } };
  await moTrang({ nguoi: TK.quanLy, hash: "video", db });
  await moQL(page, "video");
  await expect(the(page, "Video chờ duyệt")).toBeVisible();
  // Quản lý thứ hai vừa từ chối trên máy khác (máy này chưa kịp nhận cập nhật)
  await page.evaluate(() => { const d = window.__FAKE_FB.docs.get("tv_video/v-2"); window.__FAKE_FB.docs.set("tv_video/v-2", { ...d, duyet: "tuchoi", lyDo: "Trùng nội dung", v: 2 }); });
  await thaoTac(page, "Video chờ duyệt", "Phê duyệt");
  await expect(page.locator("#toast")).toContainText("vừa được người khác xử lý");
  const d = await docFB(page, "tv_video/v-2");
  expect([d.duyet, d.lyDo, d.phienDuyet]).toEqual(["tuchoi", "Trùng nội dung", 0]);
});

test("Ebook: link Canva chỉnh sửa bị từ chối; giáo viên chỉ có quyền Video thì không quản lý được Ebook", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.giaoVien, hash: "ebook" });
  await expect(page.locator('#tv-ebook [data-tv-che="ql"]')).toHaveCount(0);
  await la(page, TK.troGiang, "video"); // trợ giảng chưa được cấp quyền nào
  await expect(page.locator('#tv-video [data-tv-che="ql"]')).toHaveCount(0);
  await la(page, TK.quanLy, "ebook"); await moQL(page, "ebook");
  await page.locator("[data-tv-them]").click();
  await page.fill("#tvs-link", CANVA_SUA);
  await expect(page.locator("#tvs-link-tt")).toContainText("link CHỈNH SỬA");
  await page.fill("#tvs-link", CANVA_XEM + "?utm_content=abc");
  await expect(page.locator("#tvs-link-tt")).toContainText("hợp lệ");
  await page.fill("#tvs-ten", "Ebook Bố cục màu");
  await page.fill("#tvs-dm", "Màu");
  await page.locator('[data-tvs="xt"]').click();
  await expect(page.locator("#tvs-xt iframe")).toHaveAttribute("src", CANVA_XEM + "?embed");
  await page.locator('[data-tvs="gui"]').click();
  const d = await page.evaluate(() => [...window.__FAKE_FB.docs.entries()].find(([k]) => k.startsWith("tv_ebook/"))[1]);
  expect([d.link, d.duyet]).toEqual([CANVA_XEM, "cho"]);
  await thaoTac(page, "Ebook Bố cục màu", "Phê duyệt");
  await thaoTac(page, "Ebook Bố cục màu", "Xuất bản");
  await la(page, TK.hocVien, "ebook");
  await page.locator("#tv-ebook .gt-the", { hasText: "Ebook Bố cục màu" }).click();
  await expect(page.locator("#tv-bai-ebook iframe")).toHaveAttribute("src", CANVA_XEM + "?embed");
  await expect(page.locator(`#tv-bai-ebook a[href="${CANVA_XEM}"]`)).toBeVisible();
});

test("Học viên và khách không tải dữ liệu quản trị thư viện", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.hocVien, hash: "video" });
  await page.goto("/#ebook"); await page.waitForTimeout(500);
  const nghe = (await nhatKyFB(page)).filter(x => x.ai === TK.hocVien && /^(watch|list)$/.test(x.op) && x.path.startsWith("tv_"));
  expect(nghe.length).toBeGreaterThan(0);
  // Mọi truy vấn thư viện của học viên đều giới hạn "đã xuất bản"; không đọc lịch sử, tiến độ cả lớp
  for (const x of nghe) { expect(x.path).toMatch(/^tv_(video|ebook)$/); expect(x.loc, x.path).toContain("hienThi==xuatban"); }
  await expect(page.locator('[data-tv-che="ql"]')).toHaveCount(0);
  await la(page, null, "video");
  await expect(page.locator("#tv-video")).toContainText("Đăng nhập");
});

test("Chuyển tab Giáo trình – Khoá học – Ebook – Video không lỗi, đúng trang", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.hocVien, hash: "giao-trinh" });
  for (const [hoc, cho] of [["video", "#v-video"], ["ebook", "#v-ebook"], ["khoa-hoc", "#khoa-hoc"], ["giao-trinh", "#gt-body"], ["video", "#v-video"]]) {
    await page.locator(`.hoc-tabs:visible a[data-hoc="${hoc}"]`).first().click();
    await expect(page.locator(cho)).toBeVisible();
  }
  await expect(page.locator('#v-video .hoc-tabs a[data-hoc="video"]')).toHaveAttribute("aria-current", "page");
});

for (const [ten, nguoi, hash, ql] of [["Thư viện Video (học viên)", TK.hocVien, "video", false], ["Quản lý Video", TK.quanLy, "video", true], ["Quản lý Ebook", TK.quanLy, "ebook", true]]) {
  test(`${ten}: không tràn ngang, không chữ chạm khung`, async ({ page, moTrang }, info) => {
    const db = (await import("./support/du-lieu-mau.mjs")).duLieuMau();
    db.tv_video = { "v-dai": { tieuDe: "Video có tiêu đề rất dài để kiểm tra chữ xuống dòng trong thẻ trên điện thoại nhỏ", moTa: "Mô tả", danhMuc: "Danh mục có tên khá dài", link: "https://www.youtube.com/watch?v=" + YT_ID, ytId: YT_ID, anh: "", thoiLuong: "", pdf: "",
      thuTu: 1, duyet: "sua", hienThi: "chua", phamViKieu: "hocvien", phamViKhoa: [], phamViMail: [], phienDuyet: 0, banSua: null, lyDo: "Lý do yêu cầu sửa khá dài để kiểm tra khung lý do không tràn ra ngoài thẻ",
      nguoiTao: TK.giaoVien, tenNguoiTao: "Giáo Viên Thử", tao: 1, guiLuc: 1, xuLyBoi: TK.quanLy, xuLyLuc: 1, lichXuatBan: 0, capNhat: 1, v: 2 } };
    await moTrang({ nguoi, hash, db });
    if (ql) await moQL(page, hash);
    await page.waitForTimeout(500);
    await info.attach("anh", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    expect(await tranNgang(page)).toBeLessThanOrEqual(1);
    expect(await timTranChu(page, "#v-" + hash)).toEqual([]);
  });
}

test("Dán link YouTube là có ngay ảnh bìa xem trước; dán link ảnh riêng thì dùng ảnh đó", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.quanLy, hash: "video" });
  await moQL(page, "video");
  await page.locator("[data-tv-them]").click();
  await page.fill("#tvs-link", YT_MOI);
  await expect(page.locator("#tvs-anh-xt img")).toHaveAttribute("src", `https://i.ytimg.com/vi/${YT_ID}/hqdefault.jpg`);
  await page.fill("#tvs-anh", "https://example.com/bia-rieng.jpg");
  await expect(page.locator("#tvs-anh-xt img")).toHaveAttribute("src", "https://example.com/bia-rieng.jpg");
  await page.fill("#tvs-ten", "Video có ảnh riêng");
  await page.locator('[data-tvs="nhap"]').click();
  expect((await docVideo(page, "Video có ảnh riêng")).anh).toBe("https://example.com/bia-rieng.jpg");
  await page.locator("[data-tv-them]").click();
  await page.fill("#tvs-link", "https://www.youtube.com/watch?v=vZdFuUTUeJw");
  await page.fill("#tvs-ten", "Video ảnh tự động");
  await page.locator('[data-tvs="nhap"]').click();
  expect((await docVideo(page, "Video ảnh tự động")).anh).toBe("https://i.ytimg.com/vi/vZdFuUTUeJw/hqdefault.jpg");
});
