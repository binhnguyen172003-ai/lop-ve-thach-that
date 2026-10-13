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

export function createResourceWorkspace(root, { phan, seeds = [], ebook = false, save, mark, markdown, notify, markSeen, prepareImage }) {
  let state = { rows: [], marks: {}, canManage: false }, category = "", opened = "", editing = null, addingCourse = false, accessEditing = false, editingCourse = false, courseDraft = null, coverBusy = false, coverTicket = 0, courseSaving = false;
  const q = selector => root.querySelector(selector);
  const qa = selector => [...root.querySelectorAll(selector)];
  const label = ebook ? "sách" : "khóa";
  const unit = ebook ? "chương / tài liệu" : "bài học";
  const activeRows = () => resourceRows(state.rows, seeds, phan);
  const categories = rows => [...new Set(rows.filter(row => !row.an).map(row => row.khoa || (ebook ? "eBook" : "Khóa nâng cao")))];
  const accessRow = (rows, name) => rows.find(row => row.loai === "khoa" && row.khoa === name);
  const canView = (rows, name) => {
    const meta = accessRow(rows, name);
    return !!state.staff || !meta || meta.access !== "selected" || (meta.viewers || []).includes(state.mail);
  };
  const accessForm = rows => {
    const meta = accessRow(rows, category);
    return `<form class="rw-editor teacher" data-access-form><h3>Quyền xem · ${esc(category)}</h3>
      <label>Ai được xem<select name="access"><option value="all">Tất cả học viên đã duyệt</option><option value="selected"${meta?.access === "selected" ? " selected" : ""}>Chỉ người được chọn</option></select></label>
      <p class="muted">Quản lý và giáo viên luôn được xem. Chọn học viên bên dưới.</p>
      ${(state.viewers || []).map(person => `<label class="check"><input type="checkbox" name="viewer" value="${esc(person.id)}"${(meta?.viewers || []).includes(person.id) ? " checked" : ""}><span>${esc(person.ten || person.id)} · ${esc(person.id)}</span></label>`).join("")}
      <p class="status" data-access-status></p><div class="hop-nut"><button type="button" class="btn" data-access-cancel>Huỷ</button><button type="submit" class="btn primary">Lưu quyền xem</button></div></form>`;
  };
  const detail = (row, rows) => {
    const current = rows.findIndex(item => item.id === row.id), previous = rows[current - 1], next = rows[current + 1];
    const image = resourceImage(row), link = safeResourceLink(row.link), done = !!state.marks?.[row.id];
    return `<article class="lesson gt-bai rw-detail"><button class="gtb-ve" type="button" data-back>‹ Tất cả ${unit}</button>
      <header class="gtb-dau"><p class="eyebrow">${esc(row.khoa || label)}</p><h2>${esc(row.ten)}</h2>${!state.staff ? `<span class="gt-chip ${done ? "xong" : "chua"}">${done ? ebook ? "✓ Đã đọc" : "✓ Hoàn thành" : ebook ? "Chưa đọc" : "Chưa học"}</span>` : ""}</header>
      ${image ? `<section class="gtb-phan"><h3>${ebook ? "Ảnh bìa" : "Hình ảnh bài học"}</h3><img class="gtb-anh" src="${esc(image)}" alt="${esc(row.ten)}" loading="lazy"></section>` : ""}
      ${row.noidung ? `<section class="gtb-phan"><h3>${ebook ? "Nội dung sách" : "Kiến thức cần nắm"}</h3><div class="bai-md">${markdown(row.noidung)}</div></section>` : ""}
      ${link ? `<section class="gtb-phan"><h3>${ebook ? "Đọc tài liệu" : row.loai === "video" ? "Xem video" : "Tài liệu kèm theo"}</h3><a class="btn primary" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${ebook ? "Mở tài liệu ↗" : row.loai === "video" ? "Xem trên YouTube ↗" : "Mở tài liệu ↗"}</a></section>` : `<p class="muted">${ebook ? "Tài liệu đang được cập nhật." : "Chưa có link tài liệu."}</p>`}
      ${row.ghichu ? `<section class="gtb-phan"><h3>Lời dặn của anh chị</h3><p>${esc(row.ghichu)}</p></section>` : ""}
      ${!state.staff ? `<button class="btn primary" type="button" data-mark>${done ? ebook ? "✓ Đã đọc · bấm để bỏ" : "✓ Đã hoàn thành · bấm để bỏ" : ebook ? "Đánh dấu đã đọc" : "Đánh dấu đã hoàn thành"}</button>` : ""}
      <div class="gtb-chuyen" role="navigation" aria-label="Chuyển nội dung">${previous ? `<button type="button" data-open="${esc(previous.id)}"><small>‹ Trước</small><b>${esc(previous.ten)}</b></button>` : "<span></span>"}${next ? `<button type="button" data-open="${esc(next.id)}"><small>Tiếp ›</small><b>${esc(next.ten)}</b></button>` : "<span></span>"}</div>
      ${state.canManage ? `<div class="gtb-ql"><b>Quản lý nội dung</b><button class="btn small" type="button" data-edit="${esc(row.id)}">Sửa nội dung</button><button class="btn small" type="button" data-hide="${esc(row.id)}">Ẩn mục này</button></div>` : ""}</article>`;
  };
  const courseForm = () => {
    const draft = courseDraft || {}, cover = courseCoverImage(draft.anhBia), title = editingCourse ? "Sửa khóa học" : "Thêm khóa học";
    return `<form class="rw-editor teacher" data-course-form><h3>${title}</h3>
      <label>Tên khóa học<input name="khoa" required maxlength="120" value="${esc(draft.khoa || "")}"${editingCourse ? " readonly" : ""} placeholder="VD: Hình họa người nâng cao"></label>
      <label>Ảnh bìa khóa học<input type="file" data-course-cover accept="image/jpeg,image/png,image/webp"${coverBusy ? " disabled" : ""}></label>
      <div class="rw-cover-preview"${cover ? "" : " hidden"}><img ${cover ? `src="${esc(cover)}"` : ""} alt="Ảnh bìa đang chọn"><button class="btn small" type="button" data-cover-remove>Bỏ ảnh bìa</button></div>
      <label>Hoặc dùng link ảnh bìa<input name="coverUrl" type="url" maxlength="2000" value="${esc(safeResourceLink(draft.anhBia))}" placeholder="https://…"></label>
      <label>Mô tả khóa học<textarea name="moTa" maxlength="2000" rows="6" placeholder="Khóa này học gì, phù hợp với ai và học xong sẽ làm được gì?">${esc(draft.moTa || "")}</textarea></label>
      <p class="status" role="status" data-course-status>${coverBusy ? "Đang chuẩn bị ảnh bìa…" : courseSaving ? "Đang lưu khóa học…" : ""}</p>
      <div class="hop-nut"><button class="btn" type="button" data-course-cancel${courseSaving ? " disabled" : ""}>Huỷ</button><button class="btn primary" type="submit"${coverBusy || courseSaving ? " disabled" : ""}>${editingCourse ? "Lưu khóa học" : "Tạo khóa học"}</button></div></form>`;
  };
  const courseSummary = all => {
    if (ebook || !category) return "";
    const meta = accessRow(all, category), cover = courseCoverImage(meta?.anhBia);
    return `<section class="rw-course-summary" aria-label="Giới thiệu khóa học">
      ${cover ? `<img class="rw-course-cover" src="${esc(cover)}" alt="Ảnh bìa ${esc(category)}" loading="lazy">` : ""}
      <div class="rw-course-copy"><p class="eyebrow">Giới thiệu khóa học</p><h2>${esc(category)}</h2>
      <p class="rw-course-description">${esc(meta?.moTa || "Mô tả khóa học đang được cập nhật.")}</p></div></section>`;
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
    const all = activeRows(), groups = categories(all);
    if (!groups.includes(category)) category = groups[0] || "";
    if (!canView(all, category)) {
      root.innerHTML = `<div class="gt-mon">${groups.map(name => `<button class="gt-mon-nut" data-category="${esc(name)}" aria-pressed="${name === category}">${esc(name)}</button>`).join("")}</div><section class="lock"><h3>Khóa học chưa được cấp quyền</h3><p>Liên hệ quản lý để được mở khóa ${esc(category)}.</p></section>`;
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
    root.innerHTML = `<div class="gt-wrap ${selected ? "dang-doc" : ""}"><aside class="gt-side"><div class="gt-mon" role="navigation" aria-label="Chọn ${label}">${groups.map(name => `<button class="gt-mon-nut" type="button" data-category="${esc(name)}" aria-pressed="${name === category}">${!ebook && courseCoverImage(accessRow(all, name)?.anhBia) ? `<img class="rw-category-cover" src="${esc(courseCoverImage(accessRow(all, name)?.anhBia))}" alt="" loading="lazy">` : ""}<b>${esc(name)}</b><small>${resourceLessons(all, name).length} ${unit}</small></button>`).join("")}</div>
      <section class="gt-td"><p class="eyebrow">${esc(category || label)}</p><div class="gt-td-so"><b class="num">${state.staff ? rows.length : `${completed}/${rows.length}`}</b><span>${state.staff ? unit : ebook ? "mục đã đọc" : "bài đã hoàn thành"}</span></div>${state.staff ? "" : `<div class="gt-bar" role="progressbar" aria-label="Tiến độ" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${percent}%"></i></div><p class="num"><b>${percent}%</b></p><p class="muted">● Hoàn thành ${completed} · ● Đang học ${studying} · ○ Chưa học ${rows.length - completed - studying}</p>${nextLesson ? `<button class="btn primary" type="button" data-open="${esc(nextLesson.id)}">Bài tiếp theo · ${esc(nextLesson.ten)} →</button>` : `<p>Đã hoàn thành khóa học.</p>`}` }</section></aside>
      <div class="gt-main">${state.canManage ? `<div class="rw-actions"><button class="btn" type="button" data-access>Quyền xem khóa</button>${!ebook ? `<button class="btn" type="button" data-edit-course>Sửa khóa học</button><button class="btn" type="button" data-add-course>+ Thêm khóa học</button>` : ""}<button class="btn primary" type="button" data-add>+ Thêm ${ebook ? "chương / tài liệu" : "bài học"}</button></div>` : ""}
      ${!selected && !accessEditing && !addingCourse && !editingCourse && editing === null ? courseSummary(all) : ""}
      ${accessEditing && state.canManage ? accessForm(all) : (addingCourse || editingCourse) && state.canManage ? courseForm() : editing !== null && state.canManage ? form(all.find(row => row.id === editing)) : selected ? detail(selected, rows) : rows.length ? `<div class="gt-ds"><div class="gt-luoi">${rows.map((row, i) => { const image = resourceImage(row), done = !!state.marks?.[row.id]; return `<button class="gt-the tt-${state.staff ? "gv" : done ? "xong" : "chua"}" type="button" data-open="${esc(row.id)}"><span class="gt-anh">${image ? `<img src="${esc(image)}" alt="" loading="lazy">` : `<span class="gt-ph" aria-hidden="true">${ebook ? "📖" : "🖼️"}</span>`}</span><span class="gt-noi"><small class="gt-so">${ebook ? "Mục" : "Bài"} ${String(i + 1).padStart(2, "0")}</small><b class="gt-ten">${esc(row.ten)}</b><span class="gt-mota">${esc(row.moTa || String(row.noidung || "").slice(0, 160) || "Nội dung đang được cập nhật.")}</span><span class="gt-tt">${!state.staff ? `<span class="gt-chip ${done ? "xong" : "chua"}">${done ? ebook ? "✓ Đã đọc" : "✓ Hoàn thành" : ebook ? "Chưa đọc" : "Chưa học"}</span>` : ""}</span></span></button>`; }).join("")}</div></div>` : `<p class="muted gt-trong">${ebook ? "Chưa có eBook được đăng." : "Khóa này chưa có bài."}</p>`}
      ${state.canManage && hidden.length ? `<details class="rw-hidden"><summary>Nội dung đang ẩn (${hidden.length})</summary>${hidden.map(row => `<div><span>${esc(row.khoa)} · ${esc(row.ten)}</span><button class="btn small" type="button" data-restore="${esc(row.id)}">Hiện lại</button></div>`).join("")}</details>` : ""}</div></div>`;
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
      courseDraft = { khoa: existing ? category : "", moTa: meta?.moTa || "", anhBia: meta?.anhBia || "" };
      render(); q('[data-course-form] input').focus();
    };
    if (q("[data-add-course]")) q("[data-add-course]").onclick = () => beginCourse(false);
    if (q("[data-edit-course]")) q("[data-edit-course]").onclick = () => beginCourse(true);
    if (q("[data-access]")) q("[data-access]").onclick = () => { accessEditing = true; opened = ""; editing = null; addingCourse = false; editingCourse = false; courseDraft = null; coverTicket++; coverBusy = false; render(); };
    if (q("[data-access-cancel]")) q("[data-access-cancel]").onclick = () => { accessEditing = false; render(); };
    const permissionEditor = q("[data-access-form]");
    if (permissionEditor) permissionEditor.onsubmit = async event => {
      event.preventDefault(); if (!state.canManage) return;
      const values = new FormData(permissionEditor), meta = accessRow(all, category);
      const data = { phan, khoa: category, ten: category, loai: "khoa", thutu: 0, an: false,
        access: values.get("access"), viewers: values.getAll("viewer") };
      const button = permissionEditor.querySelector('[type="submit"]'); button.disabled = true;
      try { await save(meta?.id || null, data); accessEditing = false; notify("Đã lưu quyền xem."); render(); }
      catch { button.disabled = false; q("[data-access-status]").textContent = "Chưa lưu được quyền xem. Thử lại."; }
    };
    const courseEditor = q("[data-course-form]");
    if (courseEditor) {
      const draft = courseDraft;
      courseEditor.addEventListener("input", () => {
        if (!draft || !state.canManage) return;
        draft.khoa = courseEditor.elements.khoa.value;
        draft.moTa = courseEditor.elements.moTa.value;
      });
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
        if (!name) { status.textContent = "Điền tên khóa học."; return; }
        if (!editingCourse && categories(activeRows()).some(x => x.normalize("NFC").toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"))) { status.textContent = "Tên khóa học đã có. Chọn khóa đó để thêm bài."; return; }
        const cover = draft.anhBia || "", description = values.moTa.trim();
        if (cover && !courseCoverImage(cover)) { status.textContent = "Ảnh bìa phải là ảnh đã chọn hoặc link https:// hợp lệ."; return; }
        if (description.length > 2000) { status.textContent = "Mô tả tối đa 2.000 ký tự."; return; }
        const meta = editingCourse ? accessRow(activeRows(), category) : null;
        courseSaving = true; render();
        const row = { phan, khoa: name, ten: name, anhBia: cover, moTa: description, loai: "khoa", thutu: Number(meta?.thutu) || 0, an: false };
        try {
          const result = await save(meta?.id || null, row);
          if (meta) state.rows = state.rows.map(item => item.id === meta.id ? { ...item, ...row } : item);
          else if (!state.rows.some(x => x.phan === phan && x.loai === "khoa" && x.khoa === name)) state.rows = [...state.rows, { ...row, id: result?.id || "khoa-moi" }];
          courseSaving = false;
          if (courseDraft !== draft) { notify("Đã lưu khóa học."); return; }
          category = name; addingCourse = false; editingCourse = false; courseDraft = null; opened = ""; editing = null;
          render(); notify("Đã lưu ảnh bìa và mô tả khóa học.");
        } catch {
          courseSaving = false; if (courseDraft !== draft) return; render();
          const errorStatus = q("[data-course-status]"); if (errorStatus) errorStatus.textContent = "Chưa lưu được khóa học. Kiểm tra mạng rồi thử lại.";
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
  return { update(next) { state = next; if (!state.canManage) { coverTicket++; coverBusy = false; addingCourse = false; editingCourse = false; courseDraft = null; } render(); } };
}
