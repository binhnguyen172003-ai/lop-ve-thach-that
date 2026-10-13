// Khóa nâng cao và eBook dùng bố cục thẻ bài của Giáo trình.
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function safeResourceLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

export function youtubeId(value) {
  try {
    const url = new URL(value), host = url.hostname.toLowerCase();
    const id = host === "youtu.be" ? url.pathname.slice(1).split("/")[0]
      : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)
        ? url.pathname === "/watch" ? url.searchParams.get("v") : /^\/(shorts|embed)\//.test(url.pathname) ? url.pathname.split("/")[2] : ""
        : "";
    return /^[\w-]{11}$/.test(id || "") ? id : "";
  } catch { return ""; }
}

export function resourceImage(row) {
  const manual = safeResourceLink(row.anh);
  if (manual) return manual;
  const id = youtubeId(row.link);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
}

export function courseCoverImage(value) {
  const link = safeResourceLink(value);
  if (link && link.length <= 2000) return link;
  return typeof value === "string" && value.length <= 500000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : "";
}

export function courseIntro(meta) {
  const description = String(meta?.moTa || "").trim();
  if (typeof meta?.dieuKienMoKhoa === "string") return { description, condition: meta.dieuKienMoKhoa.trim() };
  // Tách câu điều kiện từng được ghi cuối mô tả, giữ nguyên dữ liệu cho tới khi quản lý lưu.
  const legacy = description.match(/[,;\n]\s*(Cần[^,\n.!?]{1,80}mở kh[oó][aá])\.?\s*$/iu);
  return legacy ? { description: description.slice(0, legacy.index).trim(), condition: legacy[1].trim() } : { description, condition: "" };
}

export const PORTRAIT_VIDEOS = ["vZdFuUTUeJw", "kcsVYarOj3Q", "0ugijncV044", "F0gvbmmmBks", "wAzToQzLvsI", "zawPgE4fVyw", "1n_FuJRkL5E", "E1liPpUFsNE", "dtsrRKw5mVI", "MyBXfdEDKXw", "bzmE8cv2mGY", "jvsmtqpkUtA", "mn4sFkA0Z40", "g4bWjq8EGlk", "VJYjfK-1_uA", "E7_4OQaNIUI", "rmx5PwAQvMw"];
// Tên tiếng Việt dựa trên tiêu đề gốc của từng video VORNIKOW.
const TITLES_VI = ["Kỹ thuật nét, sắc độ, khối và quy luật sáng tối", "Xử lý đường biên", "Vẽ hộp sọ · Giai đoạn 1–2", "Vẽ hộp sọ · Giai đoạn 3–4", "Cấu trúc cơ mặt", "Mắt và mũi · Lý thuyết", "Mắt và mũi · Thực hành", "Vẽ mắt · Xử lý chi tiết", "Vẽ mũi · Xử lý đường biên", "Vẽ môi", "Chân dung người đàn ông đầu trọc · Hình khối khuôn mặt", "Chân dung người đàn ông đầu trọc · Toàn bộ quá trình vẽ", "Chân dung với đầu hơi nghiêng", "Chân dung nam", "Chân dung người đàn ông đầu trọc", "Chân dung Alain Delon", "Ký hoạ trong 1 giờ"];
export const ADVANCED_SEEDS = PORTRAIT_VIDEOS.map((video, i) => ({
  id: `nc-chan-dung-${String(i + 1).padStart(2, "0")}`, phan: "nang-cao", khoa: "Chân dung nâng cao",
  ten: TITLES_VI[i], loai: "video", thutu: i + 1,
  moTa: "Video tham khảo từ kênh YouTube của họa sĩ Vornikow.",
  noidung: "Các video thuộc kênh YouTube của họa sĩ Vornikow. Lớp giới thiệu miễn phí để học viên đã có nền tảng hình hoạ xem thêm.",
  link: `https://youtu.be/${video}`, ghichu: "Xem video, ghi lại điều em học được và trao đổi với giáo viên khi cần."
}));

export function resourceRows(rows, seeds, phan) {
  const merged = new Map(seeds.map(row => [row.id, row]));
  rows.filter(row => row.phan === phan).forEach(row => merged.set(row.id, { ...merged.get(row.id), ...row }));
  return [...merged.values()].sort((a, b) => (Number(a.thutu) || 0) - (Number(b.thutu) || 0) || String(a.ten).localeCompare(String(b.ten), "vi"));
}

export function resourceLessons(rows, category) {
  return rows.filter(row => !row.an && row.loai !== "khoa" && row.khoa === category);
}

export function viewerSearchText(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim().replace(/\s+/g, " ");
}

export function createResourceWorkspace(root, { phan, seeds = [], ebook = false, save, mark, markdown, notify, markSeen, prepareImage }) {
  let state = { rows: [], marks: {}, canManage: false }, category = "", opened = "", editing = null, addingCourse = false, accessEditing = false, editingCourse = false, courseDraft = null, coverBusy = false, coverTicket = 0, courseSaving = false;
  let accessDraft = null, viewerQuery = "", viewerScroll = 0;
  const q = selector => root.querySelector(selector);
  const qa = selector => [...root.querySelectorAll(selector)];
  const label = ebook ? "sách" : "khóa";
  const itemLabel = ebook ? "eBook" : "khóa học";
  let lastMarkup = "";
  const paint = html => {
    if (html === lastMarkup && root.firstChild) return;
    lastMarkup = html;
    const images = new Map(qa("img[data-resource-image]").map(img => [img.dataset.resourceImage, img]));
    root.innerHTML = html;
    qa("img[data-resource-image]").forEach(img => {
      const previous = images.get(img.dataset.resourceImage);
      if (!previous || previous.getAttribute("src") !== img.getAttribute("src")) return;
      [...previous.attributes].filter(attr => attr.name !== "src").forEach(attr => previous.removeAttribute(attr.name));
      [...img.attributes].filter(attr => attr.name !== "src").forEach(attr => previous.setAttribute(attr.name, attr.value));
      img.replaceWith(previous);
    });
  };
  const unit = ebook ? "chương / tài liệu" : "bài học";
  const activeRows = () => resourceRows(state.rows, seeds, phan);
  const categories = rows => [...new Set(rows.filter(row => !row.an).map(row => row.khoa || (ebook ? "eBook" : "Khóa nâng cao")))];
  const accessRow = (rows, name) => rows.find(row => row.loai === "khoa" && row.khoa === name);
  const canView = (rows, name) => {
    const meta = accessRow(rows, name);
    return !!state.staff || !meta || meta.access !== "selected" || (meta.viewers || []).includes(state.mail);
  };
  const accessForm = rows => {
    const meta = accessRow(rows, category), draft = accessDraft || meta || {};
    return `<form class="rw-editor teacher" data-access-form><h3>Quyền xem · ${esc(category)}</h3>
      <label>Ai được xem<select name="access"><option value="all">Tất cả học viên đã duyệt</option><option value="selected"${draft.access === "selected" ? " selected" : ""}>Chỉ người được chọn</option></select></label>
      <p class="muted">Quản lý và giáo viên luôn được xem. Chọn học viên bên dưới.</p>
      <label>Tìm học viên<input type="search" data-viewer-search value="${esc(viewerQuery)}" placeholder="Nhập tên hoặc Gmail…" autocomplete="off"></label>
      <p class="muted rw-viewer-count" data-viewer-count role="status" aria-live="polite"></p>
      <div class="rw-viewers" role="group" aria-label="Danh sách học viên" tabindex="0">
      ${(state.viewers || []).map(person => `<label class="rw-viewer" data-viewer-row data-viewer-search-text="${esc(viewerSearchText((person.ten || "") + " " + person.id))}"><input type="checkbox" name="viewer" value="${esc(person.id)}"${(draft.viewers || []).includes(person.id) ? " checked" : ""}><span><b>${esc(person.ten || person.id)}</b><small>${esc(person.id)}</small></span></label>`).join("")}
      <p class="muted rw-viewer-empty" data-viewer-empty hidden>Không tìm thấy học viên.</p></div>
      <p class="status" data-access-status></p><div class="hop-nut"><button type="button" class="btn" data-access-cancel>Huỷ</button><button type="submit" class="btn primary">Lưu quyền xem</button></div></form>`;
  };
  const detail = (row, rows) => {
    const current = rows.findIndex(item => item.id === row.id), previous = rows[current - 1], next = rows[current + 1];
    const image = resourceImage(row), link = safeResourceLink(row.link), done = !!state.marks?.[row.id];
    return `<article class="lesson gt-bai rw-detail"><button class="gtb-ve" type="button" data-back>‹ Tất cả ${unit}</button>
      <header class="gtb-dau"><p class="eyebrow">${esc(row.khoa || label)}</p><h2>${esc(row.ten)}</h2>${!state.staff ? `<span class="gt-chip ${done ? "xong" : "chua"}">${done ? ebook ? "✓ Đã đọc" : "✓ Hoàn thành" : ebook ? "Chưa đọc" : "Chưa học"}</span>` : ""}</header>
      ${image ? `<section class="gtb-phan"><h3>${ebook ? "Ảnh bìa" : "Hình ảnh bài học"}</h3><img class="gtb-anh" data-resource-image="detail:${esc(row.id)}" src="${esc(image)}" alt="${esc(row.ten)}" loading="eager" fetchpriority="high" decoding="async"></section>` : ""}
      ${row.noidung ? `<section class="gtb-phan"><h3>${ebook ? "Nội dung sách" : "Kiến thức cần nắm"}</h3><div class="bai-md">${markdown(row.noidung)}</div></section>` : ""}
      ${link ? `<section class="gtb-phan"><h3>${ebook ? "Đọc tài liệu" : row.loai === "video" ? "Xem video" : "Tài liệu kèm theo"}</h3><a class="btn primary" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${ebook ? "Mở tài liệu ↗" : row.loai === "video" ? "Xem trên YouTube ↗" : "Mở tài liệu ↗"}</a></section>` : `<p class="muted">${ebook ? "Tài liệu đang được cập nhật." : "Chưa có link tài liệu."}</p>`}
      ${row.ghichu ? `<section class="gtb-phan"><h3>Lời dặn của anh chị</h3><p>${esc(row.ghichu)}</p></section>` : ""}
      ${!state.staff ? `<button class="btn primary" type="button" data-mark>${done ? ebook ? "✓ Đã đọc · bấm để bỏ" : "✓ Đã hoàn thành · bấm để bỏ" : ebook ? "Đánh dấu đã đọc" : "Đánh dấu đã hoàn thành"}</button>` : ""}
      <div class="gtb-chuyen" role="navigation" aria-label="Chuyển nội dung">${previous ? `<button type="button" data-open="${esc(previous.id)}"><small>‹ Trước</small><b>${esc(previous.ten)}</b></button>` : "<span></span>"}${next ? `<button type="button" data-open="${esc(next.id)}"><small>Tiếp ›</small><b>${esc(next.ten)}</b></button>` : "<span></span>"}</div>
      ${state.canManage ? `<div class="gtb-ql"><b>Quản lý nội dung</b><button class="btn small" type="button" data-edit="${esc(row.id)}">Sửa nội dung</button><button class="btn small" type="button" data-hide="${esc(row.id)}">Ẩn mục này</button></div>` : ""}</article>`;
  };
  const courseForm = () => {
    const draft = courseDraft || {}, cover = courseCoverImage(draft.anhBia), title = `${editingCourse ? "Sửa" : "Thêm"} ${itemLabel}`;
    return `<form class="rw-editor teacher" data-course-form><h3>${title}</h3>
      <label>Tên ${itemLabel}<input name="khoa" required maxlength="120" value="${esc(draft.khoa || "")}"${editingCourse ? " readonly" : ""} placeholder="VD: Hình họa người nâng cao"></label>
      <label>Ảnh bìa ${itemLabel}<input type="file" data-course-cover accept="image/jpeg,image/png,image/webp"${coverBusy ? " disabled" : ""}></label>
      <div class="rw-cover-preview"${cover ? "" : " hidden"}><img ${cover ? `src="${esc(cover)}"` : ""} alt="Ảnh bìa đang chọn"><button class="btn small" type="button" data-cover-remove>Bỏ ảnh bìa</button></div>
      <label>Hoặc dùng link ảnh bìa<input name="coverUrl" type="url" maxlength="2000" value="${esc(safeResourceLink(draft.anhBia))}" placeholder="https://…"></label>
      <label>Mô tả ${itemLabel}<textarea name="moTa" maxlength="2000" rows="6" placeholder="${ebook ? "Sách này có nội dung gì, dành cho ai và giúp học viên học được gì?" : "Khóa này học gì, phù hợp với ai và học xong sẽ làm được gì?"}">${esc(draft.moTa || "")}</textarea></label>
      <label>Điều kiện mở khóa<input name="dieuKienMoKhoa" maxlength="80" value="${esc(draft.dieuKienMoKhoa || "")}" placeholder="VD: Cần 15 đô để mở khóa"><small class="muted">Viết ngắn khoảng 5–6 từ. Để trống nếu không có điều kiện.</small></label>
      <p class="status" role="status" data-course-status>${coverBusy ? "Đang chuẩn bị ảnh bìa…" : courseSaving ? `Đang lưu ${itemLabel}…` : ""}</p>
      <div class="hop-nut"><button class="btn" type="button" data-course-cancel${courseSaving ? " disabled" : ""}>Huỷ</button><button class="btn primary" type="submit"${coverBusy || courseSaving ? " disabled" : ""}>${editingCourse ? "Lưu" : "Tạo"} ${itemLabel}</button></div></form>`;
  };
  const courseSummary = all => {
    if (!category) return "";
    const meta = accessRow(all, category), cover = courseCoverImage(meta?.anhBia), intro = courseIntro(meta);
    return `<section class="rw-course-summary" aria-label="Giới thiệu ${itemLabel}">
      ${cover ? `<img class="rw-course-cover" data-resource-image="cover:${esc(category)}" src="${esc(cover)}" alt="Ảnh bìa ${esc(category)}" loading="eager" fetchpriority="high" decoding="async">` : ""}
      <div class="rw-course-copy"><p class="eyebrow">Giới thiệu ${itemLabel}</p><h2>${esc(category)}</h2>
      <p class="rw-course-description">${esc(intro.description || `Mô tả ${itemLabel} đang được cập nhật.`)}</p>
      ${intro.condition ? `<dl class="rw-course-unlock"><dt>Điều kiện mở khóa</dt><dd>${esc(intro.condition)}</dd></dl>` : ""}</div></section>`;
  };
  const form = row => `<form class="rw-editor teacher" data-resource-form><h3>${row ? "Sửa" : "Thêm"} ${ebook ? "chương hoặc tài liệu" : "bài học"}</h3>
    <div class="fgrid"><label>Tên ${label}<input name="khoa" required maxlength="120" value="${esc(row?.khoa || category)}" placeholder="${ebook ? "VD: Hình hoạ cơ bản" : "VD: Chân dung nâng cao"}"></label>
    <label>Tên ${ebook ? "chương / tài liệu" : "bài học"}<input name="ten" required maxlength="180" value="${esc(row?.ten || "")}"></label></div>
    <div class="fgrid"><label>Loại nội dung<select name="loai">${(ebook ? [["sach", "Sách / chương"], ["tai-lieu", "Tài liệu"]] : [["video", "Video"], ["bai-hoc", "Bài học"], ["tai-lieu", "Tài liệu"]]).map(([key, text]) => `<option value="${key}"${row?.loai === key ? " selected" : ""}>${text}</option>`).join("")}</select></label>
    <label>Thứ tự hiển thị<input name="thutu" type="number" min="0" max="9999" step="1" value="${Number(row?.thutu) || activeRows().length + 1}"></label></div>
    <label>Mô tả ngắn<input name="moTa" maxlength="200" value="${esc(row?.moTa || "")}"></label>
    <label>Kiến thức / nội dung<textarea name="noidung" rows="8" maxlength="20000" placeholder="Viết nội dung; có thể dùng ## tiêu đề, - danh sách…">${esc(row?.noidung || "")}</textarea></label>
    <label>Link ${ebook ? "đọc sách / PDF" : "video hoặc tài liệu"} (https://…)<input name="link" type="url" maxlength="2000" value="${esc(row?.link || "")}"></label>
    <label>Link ${ebook ? "ảnh bìa" : "ảnh bài"} (để trống sẽ dùng ảnh YouTube)<input name="anh" type="url" maxlength="2000" value="${esc(row?.anh || "")}"></label>
    <label>Lời dặn của anh chị<textarea name="ghichu" rows="3" maxlength="2000">${esc(row?.ghichu || "")}</textarea></label>
    <p class="status" role="status" data-status></p><div class="hop-nut"><button class="btn" type="button" data-cancel>Huỷ</button><button class="btn primary" type="submit">Lưu nội dung</button></div></form>`;
  function render() {
    if (!root) return;
    if (accessEditing && q(".rw-viewers")) viewerScroll = q(".rw-viewers").scrollTop;
    const all = activeRows(), groups = categories(all);
    if (!groups.includes(category)) category = groups[0] || "";
    if (!canView(all, category)) {
      paint(`<div class="gt-mon">${groups.map(name => `<button class="gt-mon-nut" data-category="${esc(name)}" aria-pressed="${name === category}">${esc(name)}</button>`).join("")}</div><section class="lock"><h3>${ebook ? "eBook" : "Khóa học"} chưa được cấp quyền</h3><p>Liên hệ quản lý để được mở khóa ${esc(category)}.</p></section>`);
      qa("[data-category]").forEach(button => button.onclick = () => { category = button.dataset.category; opened = ""; editing = null; addingCourse = false; accessEditing = false; editingCourse = false; courseDraft = null; coverBusy = false; coverTicket++; render(); });
      return;
    }
    const rows = resourceLessons(all, category), hidden = all.filter(row => row.an && row.loai !== "khoa");
    const selected = rows.find(row => row.id === opened);
    if (!selected) opened = "";
    const completed = rows.filter(row => state.marks?.[row.id]).length;
    const studying = rows.filter(row => !state.marks?.[row.id] && state.seen?.[row.id]).length;
    const nextLesson = rows.find(row => !state.marks?.[row.id]);
    const percent = rows.length ? Math.round(completed / rows.length * 100) : 0;
    paint(`<div class="gt-wrap ${selected ? "dang-doc" : ""}"><aside class="gt-side"><div class="gt-mon" role="navigation" aria-label="Chọn ${label}">${groups.map(name => `<button class="gt-mon-nut" type="button" data-category="${esc(name)}" aria-pressed="${name === category}">${courseCoverImage(accessRow(all, name)?.anhBia) ? `<img class="rw-category-cover" data-resource-image="category:${esc(name)}" src="${esc(courseCoverImage(accessRow(all, name)?.anhBia))}" alt="" loading="${name === category ? "eager" : "lazy"}" decoding="async">` : ""}<b>${esc(name)}</b><small>${resourceLessons(all, name).length} ${unit}</small></button>`).join("")}</div>
      <section class="gt-td"><p class="eyebrow">${esc(category || label)}</p><div class="gt-td-so"><b class="num">${state.staff ? rows.length : `${completed}/${rows.length}`}</b><span>${state.staff ? unit : ebook ? "mục đã đọc" : "bài đã hoàn thành"}</span></div>${state.staff ? "" : `<div class="gt-bar" role="progressbar" aria-label="Tiến độ" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${percent}%"></i></div><p class="num"><b>${percent}%</b></p><p class="muted">● Hoàn thành ${completed} · ● Đang học ${studying} · ○ Chưa học ${rows.length - completed - studying}</p>${nextLesson ? `<button class="btn primary" type="button" data-open="${esc(nextLesson.id)}">Bài tiếp theo · ${esc(nextLesson.ten)} →</button>` : `<p>Đã hoàn thành khóa học.</p>`}` }</section></aside>
      <div class="gt-main">${state.canManage ? `<div class="rw-actions"><button class="btn" type="button" data-access>Quyền xem ${ebook ? "eBook" : "khóa"}</button><button class="btn" type="button" data-edit-course>Sửa ${itemLabel}</button><button class="btn" type="button" data-add-course>+ Thêm ${itemLabel}</button><button class="btn primary" type="button" data-add>+ Thêm ${ebook ? "chương / tài liệu" : "bài học"}</button></div>` : ""}
      ${!selected && !accessEditing && !addingCourse && !editingCourse && editing === null ? courseSummary(all) : ""}
      ${accessEditing && state.canManage ? accessForm(all) : (addingCourse || editingCourse) && state.canManage ? courseForm() : editing !== null && state.canManage ? form(all.find(row => row.id === editing)) : selected ? detail(selected, rows) : rows.length ? `<div class="gt-ds"><div class="gt-luoi">${rows.map((row, i) => { const image = resourceImage(row), done = !!state.marks?.[row.id]; return `<button class="gt-the tt-${state.staff ? "gv" : done ? "xong" : "chua"}" type="button" data-open="${esc(row.id)}"><span class="gt-anh">${image ? `<img data-resource-image="lesson:${esc(row.id)}" src="${esc(image)}" alt="" loading="${i < 4 ? "eager" : "lazy"}" fetchpriority="${i === 0 ? "high" : "auto"}" decoding="async">` : `<span class="gt-ph" aria-hidden="true">${ebook ? "📖" : "🖼️"}</span>`}</span><span class="gt-noi"><small class="gt-so">${ebook ? "Mục" : "Bài"} ${String(i + 1).padStart(2, "0")}</small><b class="gt-ten">${esc(row.ten)}</b><span class="gt-mota">${esc(row.moTa || String(row.noidung || "").slice(0, 160) || "Nội dung đang được cập nhật.")}</span><span class="gt-tt">${!state.staff ? `<span class="gt-chip ${done ? "xong" : "chua"}">${done ? ebook ? "✓ Đã đọc" : "✓ Hoàn thành" : ebook ? "Chưa đọc" : "Chưa học"}</span>` : ""}</span></span></button>`; }).join("")}</div></div>` : `<p class="muted gt-trong">${ebook ? "Chưa có eBook được đăng." : "Khóa này chưa có bài."}</p>`}
      ${state.canManage && hidden.length ? `<details class="rw-hidden"><summary>Nội dung đang ẩn (${hidden.length})</summary>${hidden.map(row => `<div><span>${esc(row.khoa)} · ${esc(row.ten)}</span><button class="btn small" type="button" data-restore="${esc(row.id)}">Hiện lại</button></div>`).join("")}</details>` : ""}</div></div>`);
    qa("[data-category]").forEach(button => button.onclick = () => { category = button.dataset.category; opened = ""; editing = null; addingCourse = false; accessEditing = false; editingCourse = false; courseDraft = null; coverBusy = false; coverTicket++; render(); });
    qa("[data-open]").forEach(button => button.onclick = () => { opened = button.dataset.open; editing = null; markSeen?.(opened); render(); root.scrollIntoView({ block: "start" }); });
    if (q("[data-back]")) q("[data-back]").onclick = () => { opened = ""; render(); };
    if (q("[data-mark]")) q("[data-mark]").onclick = async () => { try { await mark(selected.id); } catch { notify("Chưa lưu được tiến độ. Thử lại.", "err"); } };
    if (q("[data-add]")) q("[data-add]").onclick = () => { editingCourse = false; courseDraft = null; coverTicket++; coverBusy = false; addingCourse = false; opened = ""; editing = ""; render(); };
    qa("[data-edit]").forEach(button => button.onclick = () => { editing = button.dataset.edit; render(); });
    qa("[data-hide]").forEach(button => button.onclick = async () => { if (!confirm("Ẩn nội dung này khỏi học viên?")) return; try { await save(button.dataset.hide, { an: true }); opened = ""; notify("Đã ẩn nội dung."); } catch { notify("Chưa ẩn được. Thử lại.", "err"); } });
    qa("[data-restore]").forEach(button => button.onclick = async () => { try { await save(button.dataset.restore, { an: false }); notify("Đã hiện lại nội dung."); } catch { notify("Chưa hiện lại được. Thử lại.", "err"); } });
    const beginCourse = existing => {
      coverTicket++; coverBusy = false; editingCourse = existing; addingCourse = !existing;
      accessEditing = false; editing = null; opened = "";
      const meta = existing ? accessRow(all, category) : null;
      const intro = courseIntro(meta);
      courseDraft = { khoa: existing ? category : "", moTa: intro.description, dieuKienMoKhoa: intro.condition, anhBia: meta?.anhBia || "" };
      render(); q('[data-course-form] input').focus();
    };
    if (q("[data-add-course]")) q("[data-add-course]").onclick = () => beginCourse(false);
    if (q("[data-edit-course]")) q("[data-edit-course]").onclick = () => beginCourse(true);
    if (q("[data-access]")) q("[data-access]").onclick = () => {
      const meta = accessRow(activeRows(), category);
      accessDraft = { access: meta?.access || "all", viewers: [...(meta?.viewers || [])] };
      viewerQuery = ""; viewerScroll = 0; accessEditing = true; opened = ""; editing = null; addingCourse = false; editingCourse = false; courseDraft = null; coverTicket++; coverBusy = false; render(); };
    if (q("[data-access-cancel]")) q("[data-access-cancel]").onclick = () => { accessEditing = false; accessDraft = null; viewerQuery = ""; render(); };
    const permissionEditor = q("[data-access-form]");
    if (permissionEditor) {
      const search = q("[data-viewer-search]"), list = q(".rw-viewers");
      const filterViewers = () => {
        const query = viewerSearchText(viewerQuery), rows = qa("[data-viewer-row]");
        let visible = 0;
        rows.forEach(row => { row.hidden = !row.dataset.viewerSearchText.includes(query); if (!row.hidden) visible++; });
        q("[data-viewer-count]").textContent = `Hiện ${visible}/${rows.length} học viên · Đã chọn ${accessDraft?.viewers.length || 0}`;
        const empty = q("[data-viewer-empty]"); empty.hidden = visible > 0;
        empty.textContent = rows.length ? "Không tìm thấy học viên." : "Chưa có học viên trong danh sách.";
      };
      const rememberAccess = () => {
        if (!state.canManage || !accessDraft) return;
        const boxes = [...permissionEditor.querySelectorAll('input[name="viewer"]')], known = new Set(boxes.map(box => box.value));
        accessDraft.access = permissionEditor.querySelector('[name="access"]').value;
        accessDraft.viewers = [...accessDraft.viewers.filter(id => !known.has(id)), ...boxes.filter(box => box.checked).map(box => box.value)];
        filterViewers();
      };
      search.oninput = () => { viewerQuery = search.value; viewerScroll = 0; filterViewers(); list.scrollTop = 0; };
      permissionEditor.onchange = rememberAccess;
      filterViewers(); list.scrollTop = viewerScroll;
      permissionEditor.onsubmit = async event => {
      event.preventDefault(); if (!state.canManage) return;
      rememberAccess();
      const meta = accessRow(activeRows(), category);
      const data = { phan, khoa: category, ten: category, loai: "khoa", thutu: 0, an: false,
        access: accessDraft.access, viewers: [...new Set(accessDraft.viewers)] };
      const button = permissionEditor.querySelector('[type="submit"]'); button.disabled = true;
      try { await save(meta?.id || null, data); accessEditing = false; accessDraft = null; viewerQuery = ""; notify("Đã lưu quyền xem."); render(); }
      catch { button.disabled = false; q("[data-access-status]").textContent = "Chưa lưu được quyền xem. Thử lại."; }
      };
    }
    const courseEditor = q("[data-course-form]");
    if (courseEditor) {
      const draft = courseDraft;
      courseEditor.oninput = () => {
        if (!draft || !state.canManage) return;
        draft.khoa = courseEditor.elements.khoa.value;
        draft.moTa = courseEditor.elements.moTa.value;
        draft.dieuKienMoKhoa = courseEditor.elements.dieuKienMoKhoa.value;
      };
      courseEditor.elements.coverUrl.onchange = () => {
        draft.anhBia = courseEditor.elements.coverUrl.value.trim();
        const preview = q(".rw-cover-preview"), image = courseCoverImage(draft.anhBia), img = preview.querySelector("img");
        preview.hidden = !image; if (image) img.src = image; else img.removeAttribute("src");
      };
      q("[data-course-cancel]").onclick = () => {
        if (courseSaving) return;
        coverTicket++; coverBusy = false; addingCourse = false; editingCourse = false; courseDraft = null; render();
      };
      if (q("[data-cover-remove]")) q("[data-cover-remove]").onclick = () => { coverTicket++; coverBusy = false; draft.anhBia = ""; render(); };
      q("[data-course-cover]").onchange = async event => {
        const file = event.target.files?.[0], status = q("[data-course-status]");
        if (!file || !state.canManage) return;
        if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) { status.textContent = "Chọn ảnh JPG, PNG hoặc WebP dưới 10 MB."; return; }
        if (!prepareImage) { status.textContent = "Chưa tải được phần xử lý ảnh. Dùng link ảnh hoặc tải lại trang."; return; }
        const ticket = ++coverTicket; coverBusy = true; render();
        try {
          const image = await prepareImage(file);
          if (ticket !== coverTicket || courseDraft !== draft || !state.canManage) return;
          if (!courseCoverImage(image)) throw new Error("Ảnh chưa hợp lệ hoặc quá lớn. Chọn ảnh khác.");
          draft.anhBia = image; coverBusy = false; render();
        } catch (error) {
          if (ticket !== coverTicket || courseDraft !== draft) return;
          coverBusy = false; render(); q("[data-course-status]").textContent = error.message || "Không mở được ảnh.";
        }
      };
      courseEditor.onsubmit = async event => {
        event.preventDefault();
        if (!state.canManage || coverBusy || courseSaving || !draft) return;
        const values = Object.fromEntries(new FormData(courseEditor));
        const name = editingCourse ? category : values.khoa.trim().normalize("NFC"), status = q("[data-course-status]");
        if (!name) { status.textContent = `Điền tên ${itemLabel}.`; return; }
        if (!editingCourse && categories(activeRows()).some(x => x.normalize("NFC").toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"))) { status.textContent = `Tên ${itemLabel} đã có. Chọn mục đó để thêm nội dung.`; return; }
        const cover = draft.anhBia || "", description = values.moTa.trim(), condition = values.dieuKienMoKhoa.trim();
        if (cover && !courseCoverImage(cover)) { status.textContent = "Ảnh bìa phải là ảnh đã chọn hoặc link https:// hợp lệ."; return; }
        if (description.length > 2000) { status.textContent = "Mô tả tối đa 2.000 ký tự."; return; }
        if (condition.length > 80) { status.textContent = "Điều kiện tối đa 80 ký tự; nên viết khoảng 5–6 từ."; return; }
        const meta = editingCourse ? accessRow(activeRows(), category) : null;
        courseSaving = true; render();
        const row = { phan, khoa: name, ten: name, anhBia: cover, moTa: description, dieuKienMoKhoa: condition, loai: "khoa", thutu: Number(meta?.thutu) || 0, an: false };
        try {
          const result = await save(meta?.id || null, row);
          if (meta) state.rows = state.rows.map(item => item.id === meta.id ? { ...item, ...row } : item);
          else if (!state.rows.some(x => x.phan === phan && x.loai === "khoa" && x.khoa === name)) state.rows = [...state.rows, { ...row, id: result?.id || "khoa-moi" }];
          courseSaving = false;
          if (courseDraft !== draft) { notify(`Đã lưu ${itemLabel}.`); return; }
          category = name; addingCourse = false; editingCourse = false; courseDraft = null; opened = ""; editing = null;
          render(); notify(`Đã lưu thông tin ${itemLabel}.`);
        } catch {
          courseSaving = false; if (courseDraft !== draft) return; render();
          const errorStatus = q("[data-course-status]"); if (errorStatus) errorStatus.textContent = `Chưa lưu được ${itemLabel}. Kiểm tra mạng rồi thử lại.`;
        }
      };
    }
    const editor = q("[data-resource-form]");
    if (editor) {
      q("[data-cancel]").onclick = () => { editing = null; render(); };
      editor.onsubmit = async event => {
        event.preventDefault();
        if (!state.canManage) return;
        const data = Object.fromEntries(new FormData(editor));
        data.khoa = data.khoa.trim(); data.ten = data.ten.trim();
        for (const key of ["moTa", "noidung", "link", "anh", "ghichu"]) data[key] = data[key].trim();
        const status = q("[data-status]");
        if (!data.khoa || !data.ten || !data.noidung && !data.link) { status.textContent = "Điền tên và ít nhất một nội dung hoặc link."; return; }
        if ((data.link && !safeResourceLink(data.link)) || (data.anh && !safeResourceLink(data.anh))) { status.textContent = "Link phải bắt đầu bằng https:// và không chứa thông tin đăng nhập."; return; }
        data.thutu = Number(data.thutu); data.phan = phan; data.an = false;
        const submit = editor.querySelector('[type="submit"]'); submit.disabled = true; status.textContent = "Đang lưu…";
        try { await save(editing || null, data); editing = null; opened = ""; notify("Đã lưu nội dung."); }
        catch { submit.disabled = false; status.textContent = "Chưa lưu được. Kiểm tra mạng rồi thử lại."; }
      };
    }
  }
  return { update(next) { state = next; if (!state.canManage) { accessEditing = false; accessDraft = null; viewerQuery = ""; coverTicket++; coverBusy = false; addingCourse = false; editingCourse = false; courseDraft = null; } render(); } };
}
