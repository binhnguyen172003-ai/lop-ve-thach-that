// =====================================================================
//  TRỢ LÝ LỚP VẼ: bong bóng chat AI + bong bóng nhắc việc + soạn tin mua hoạ cụ
//  AI dùng Firebase AI Logic (Gemini). Khi chưa bật AI trong Firebase,
//  trợ lý vẫn trả lời bằng bộ câu hỏi có sẵn bên dưới (không cần mạng AI).
// =====================================================================
import { firebaseConfig } from "../../config/firebase-config.js?v=20261009b";
import { LIEN_HE, LICH_THI, CA_HOC, THOI_GIAN_BIEU, TRUONG, GIAO_VIEN, HOA_CU, NAM_THI } from "../../data/noi-dung.js?v=20261009d";

const AI_SDK = "https://www.gstatic.com/firebasejs/12.0.0/";
const AI_MODEL = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
const GIOI_HAN_NGAY = 40;                 // số câu hỏi AI mỗi người mỗi ngày (giữ hạn mức miễn phí)

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const vnd = n => Number(n || 0).toLocaleString("vi-VN") + "đ";
const bo = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

let nguoi = null;          // { ten, mail, vaiTro: "hv"|"gv"|"ql", khoi, coso }
let nhac = [];             // các việc cần nhắc (do app.js gửi sang)
let lichSu = [];           // hội thoại hiện tại
let aiModel = null, aiChat = null, aiLoi = false;

/* ---------- Kiến thức của lớp (đưa cho AI và dùng cho câu trả lời có sẵn) ---------- */
const NGAY = { T2: "Thứ 2", T3: "Thứ 3", T4: "Thứ 4", T5: "Thứ 5", T6: "Thứ 6", T7: "Thứ 7", CN: "Chủ nhật" };
function lichHocText() {
  return Object.entries(THOI_GIAN_BIEU).map(([cs, ca]) => `${cs}: ` + CA_HOC.map(c => {
    const d = Object.entries(ca[c.ma] || {}); return d.length ? `${c.ten} (${c.gio}) ${d.map(([n, m]) => `${NGAY[n]} ${m}`).join(", ")}` : "";
  }).filter(Boolean).join("; ")).join("\n");
}
const lichThiText = () => LICH_THI.map(l => `${l.ten} · ${l.dot}: ${l.hienThi}/${NAM_THI}`).join("\n");
const hoaCuText = () => HOA_CU.map(h => `${h.ten} (${h.loai}): ${vnd(h.gia)}`).join("; ");
function kienThuc() {
  return `TÊN LỚP: Lớp Vẽ Thạch Thất (tên cũ Dreamers), luyện thi năng khiếu Khối H và Khối V, quản lý: anh Bình (6 năm đứng lớp).
LIÊN HỆ: SĐT/Zalo ${LIEN_HE.sdt}. ${LIEN_HE.coSo.map(c => `${c.ten}: ${c.diaChi}`).join(". ")}.
LỊCH HỌC:\n${lichHocText()}
LỊCH THI DỰ KIẾN ${NAM_THI}:\n${lichThiText()}
TRƯỜNG: ${Object.entries(TRUONG).map(([k, v]) => `${k} = ${v.ten}`).join("; ")}.
KHỐI H: thi hình hoạ người + bố cục trang trí màu (ngành đồ hoạ, thời trang, nội thất, mỹ thuật ứng dụng – MTCN, Sư phạm Nghệ thuật, HAU khối H).
KHỐI V: thi Toán + hình hoạ tượng (+ Mỹ thuật 2/bố cục tuỳ trường) (ngành kiến trúc, quy hoạch, xây dựng – HAU, Xây dựng, ĐHQG).
KHOÁ HỌC: Hình hoạ cơ bản (bắt đầu từ 0), Hình hoạ người (Khối H), Hình hoạ tượng (Khối V), Màu & bố cục màu (Khối H), Mỹ thuật 2 (Khối V), Ôn thi cấp tốc (tháng 3–5). Học thử miễn phí.
GIÁO VIÊN: ${GIAO_VIEN.map(g => `${g.ten} (${g.vaiTro}${g.truong ? ", " + g.truong : ""})`).join("; ")}.
HOẠ CỤ BÁN TẠI LỚP: ${hoaCuText()}.
HẠNG (RANK) trên web: F→E→D→C→B→A→S→SS→SSS→SSS+, kiếm XP bằng đi học (+10/buổi), nộp bài (+15), bài ≥8 điểm (+10), bài lên Bài vẽ nổi bật (+100, Top 1 thêm +25). Từ hạng A mỗi hạng cần thêm 2.000 XP.
BÀI TẬP: thầy chấm 3 tiêu chí hình cơ bản, sắc độ, tổng thể; chưa đạt tiêu chí nào thì phải làm lại và bấm "Nộp lại".
HỌC PHÍ: không ghi trên web, hỏi trực tiếp thầy Bình qua Zalo.`;
}
const SYSTEM = () => `Em là "Bé Chì" — trợ lý ảo của Lớp Vẽ Thạch Thất. Xưng "tui" hoặc "Chì", gọi người hỏi là "bạn" hoặc "đồng chí họa sĩ".
TÍNH CÁCH: hài hước, lầy lội, hơi "mất nết" kiểu đứa bạn thân hay cà khịa (trêu chuyện lười vẽ, ngại nộp bài, tẩy thủng giấy…), nhưng NÓI THẬT, không nịnh, không hứa chắc đỗ, và luôn kết bằng một câu khích lệ học vẽ.
GIỚI HẠN: người dùng phần lớn là học sinh — tuyệt đối không chửi thề, không nói tục, không trêu ngoại hình, gia cảnh hay làm ai tổn thương; không nói chuyện người lớn. Chỉ trả lời về: lớp học, luyện thi khối H/V, trường đại học, lịch học/lịch thi, hoạ cụ, cách học vẽ, cách dùng web lớp. Câu ngoài lề thì cà khịa nhẹ rồi kéo về chuyện vẽ.
SỰ THẬT: chỉ dùng thông tin dưới đây. Không biết thì nói thẳng là không biết và bảo nhắn thầy Bình qua Zalo ${LIEN_HE.sdt}. KHÔNG bịa học phí, điểm chuẩn, ngày thi hay tỷ lệ đỗ.
CÁCH TRẢ LỜI: tiếng Việt, ngắn 2–5 câu, có thể dùng 1 emoji. Khi được hỏi cần mua gì, liệt kê món cụ thể kèm giá và nhắc bấm nút "🛒 Soạn tin mua hoạ cụ".
${nguoi ? `NGƯỜI ĐANG HỎI: ${nguoi.ten || "học viên"}${nguoi.khoi ? ", " + nguoi.khoi : ""}${nguoi.coso ? ", cơ sở " + nguoi.coso : ""}${nguoi.vaiTro !== "hv" ? " (thầy cô của lớp)" : ""}.` : ""}
THÔNG TIN LỚP:\n${kienThuc()}`;

/* ---------- Câu trả lời có sẵn (khi chưa bật AI) ---------- */
const CAU = [
  { k: ["dia chi", "o dau", "co so", "cho nao", "duong"], t: () => `Lớp có 2 "hang ổ" nè: ${LIEN_HE.coSo.map(c => `<b>${esc(c.ten)}</b> (${esc(c.diaChi)})`).join(" và ")}. Đi lạc thì gọi ${esc(LIEN_HE.sdt)}, đừng đứng giữa đường vẽ bản đồ nha 😆` },
  { k: ["lich hoc", "may gio", "hoc toi", "ca hoc", "hoc thu may", "hom nay hoc"], t: () => `Lịch học đây, chép vào tay đi khỏi quên:<br>${esc(lichHocText()).replace(/\n/g, "<br>")}<br>Đi đều là lên rank, nghỉ nhiều là rank nó nghỉ chơi với bạn đấy.` },
  { k: ["lich thi", "ngay thi", "thi khi nao", "bao gio thi", "con bao lau"], t: () => `Lịch thi dự kiến ${NAM_THI}:<br>${esc(lichThiText()).replace(/\n/g, "<br>")}<br>Nghe thì xa chứ chớp mắt cái là tới. Vẽ đi, đừng chớp 👀` },
  { k: ["khoi h", "khoi v", "khac nhau", "chon khoi", "nen thi khoi"], t: () => `Gọn nè: <b>Khối H</b> thi hình hoạ người + bố cục màu (thiết kế đồ hoạ, thời trang, nội thất, mỹ thuật ứng dụng). <b>Khối V</b> thi Toán + hình hoạ tượng (kiến trúc, xây dựng, quy hoạch). Thích tô màu bay bổng thì H, thích tính toán nhà cửa thì V. Còn phân vân thì hỏi thầy Bình, thầy soi một phát ra liền.` },
  { k: ["hoc phi", "bao nhieu tien", "gia hoc", "dong tien"], t: () => `Chuyện tiền nong Chì không dám nói bừa đâu, sợ thầy trừ lương 😅. Nhắn thầy Bình qua Zalo ${esc(LIEN_HE.sdt)} để hỏi đúng nhất nhé. Học thử thì miễn phí đó!` },
  { k: ["hoa cu", "can mua", "mua gi", "dung cu", "but chi", "mau bot", "giay", "tay"], t: () => goiYHoaCu() },
  { k: ["truong", "kien truc", "mtcn", "my thuat cong nghiep", "xay dung", "su pham", "dhqg"], t: () => `Các trường học viên lớp hay thi: ${Object.values(TRUONG).map(v => esc(v.ten)).join(", ")}. Xem điểm các anh chị đi trước ở <a href="#bang-vang">Bảng vàng</a> — nhìn mà thèm, thèm thì vẽ.` },
  { k: ["giao vien", "thay co", "ai day", "tro giang"], t: () => `Đội hình thầy cô: ${GIAO_VIEN.map(g => esc(g.ten)).join(", ")}. Toàn người từng ngồi đúng ghế bạn đang ngồi, nên đừng hòng giấu bài xấu nha.` },
  { k: ["rank", "hang", "xp", "len hang", "thanh tuu"], t: () => `Leo rank dễ mà khó: đi học +10 XP, nộp bài +15, bài ≥8 điểm +10, lên Bài vẽ nổi bật +100. Từ hạng A trở đi mỗi hạng cần thêm 2.000 XP — tức là phải cày thật. Bấm vào huy hiệu rank để xem bảng đầy đủ.` },
  { k: ["lam lai", "nop lai", "chua dat", "bai tap", "nop bai"], t: () => `Bài bị "trả về" là do chưa đạt 1 trong 3 tiêu chí: hình cơ bản, sắc độ, tổng thể. Vẽ lại đúng chỗ thầy nhắc rồi bấm <b>Nộp lại</b> trong mục <a href="#bai-tap">Bài tập</a>. Bị trả bài không xấu, không làm lại mới xấu 😤` },
  { k: ["chao", "hello", "hi ", "alo", "xin chao"], t: () => `Chào ${esc((nguoi && nguoi.ten) || "đồng chí hoạ sĩ")}! Chì đây — hỏi gì về lớp, lịch học, khối thi hay hoạ cụ cứ quăng vào. Hỏi xong nhớ đi vẽ nha.` },
  { k: ["cam on", "thank", "tks"], t: () => `Không có chi! Cảm ơn thật lòng thì nộp bài đúng hạn là được rồi 😌` },
  { k: ["luoi", "chan", "nan", "met", "kho qua", "khong ve duoc"], t: () => `Ai mà chẳng có ngày muốn ném bút chì đi. Nhưng bài xấu hôm nay là bậc thang cho bài đẹp tuần sau. Vẽ 20 phút thôi, hẹn giờ luôn — xong rồi tính tiếp. Chì tin bạn làm được 💪` },
];
function goiYHoaCu(khoi) {
  khoi = khoi || (nguoi && nguoi.khoi) || "";
  const list = HOA_CU.filter(h => h.can && h.can.length && (!khoi || h.can.some(c => bo(khoi).includes(bo(c)) || c === "Cơ bản")));
  const tong = list.reduce((a, h) => a + h.gia, 0);
  return `Bộ cơ bản ${khoi ? "cho " + esc(khoi) : "cho người mới"}: ${list.map(h => `${esc(h.ten)} (${vnd(h.gia)})`).join(", ")} — tổng khoảng <b>${vnd(tong)}</b>. Bấm <b>🛒 Soạn tin mua hoạ cụ</b> để Chì soạn sẵn tin gửi thầy. Đừng mua bút xịn rồi để trong hộp làm kỷ niệm nha.`;
}
function traLoiSan(q) {
  const b = " " + bo(q) + " ";
  const hit = CAU.map(c => ({ c, n: c.k.filter(k => b.includes(k)).length })).filter(x => x.n).sort((a, b2) => b2.n - a.n)[0];
  if (hit) return hit.c.t();
  return `Câu này hơi khó với cái đầu bút chì của Chì 😅. Bạn hỏi về <i>lịch học, lịch thi, khối H/V, trường, hoạ cụ, rank</i> thì Chì rành. Còn lại nhắn thầy Bình qua Zalo ${esc(LIEN_HE.sdt)} cho chắc nha.`;
}

/* ---------- AI (Firebase AI Logic · Gemini) ---------- */
async function moAI() {
  if (aiModel || aiLoi) return aiModel;
  try {
    const [appM, aiM] = await Promise.all([import(AI_SDK + "firebase-app.js"), import(AI_SDK + "firebase-ai.js")]);
    const app = appM.getApps().find(a => a.name === "tro-ly") || appM.initializeApp(firebaseConfig, "tro-ly");
    const ai = aiM.getAI(app, { backend: new aiM.GoogleAIBackend() });
    for (const m of AI_MODEL) {
      try {
        const model = aiM.getGenerativeModel(ai, { model: m, systemInstruction: SYSTEM(), generationConfig: { maxOutputTokens: 500, temperature: .9 } });
        await Promise.race([model.countTokens("chào"), new Promise((_, r) => setTimeout(() => r(new Error("cham")), 8000))]);
        aiModel = model; return aiModel;
      } catch (e) { if (!/not found|404|unsupported/i.test(String(e && e.message))) throw e; }
    }
    throw new Error("khong co model");
  } catch (e) {
    aiLoi = true; console.info("Trợ lý dùng câu trả lời có sẵn:", e && e.message);
    return null;
  }
}
function demHomNay() {
  const k = "lvtt-ai-" + new Date().toISOString().slice(0, 10);
  const n = store.get(k, 0); return { n, tang: () => store.set(k, n + 1) };
}

/* ---------- Giao diện ---------- */
function dung() {
  if ($("#tl-cum")) return;
  const w = document.createElement("div");
  w.id = "tl-cum"; w.hidden = true;
  w.innerHTML = `
    <button type="button" class="tl-nut tl-nhac-nut" id="tl-nhac-nut" aria-label="Nhắc việc" aria-expanded="false">🔔<span class="tl-dem" id="tl-dem" hidden></span></button>
    <button type="button" class="tl-nut tl-chat-nut" id="tl-chat-nut" aria-label="Hỏi trợ lý Bé Chì" aria-expanded="false"><span class="tl-mat">✏️</span></button>
    <div class="tl-bong" id="tl-bong" hidden></div>
    <section class="tl-khung" id="tl-nhac" hidden aria-label="Nhắc việc">
      <header><b>🔔 Nhắc việc của em</b><button type="button" class="tl-x" data-dong>✕</button></header>
      <div class="tl-nhac-ds" id="tl-nhac-ds"></div>
    </section>
    <section class="tl-khung tl-chat" id="tl-chat" hidden aria-label="Trợ lý Bé Chì">
      <header><span class="tl-av">✏️</span><div><b>Bé Chì</b><small id="tl-che">Trợ lý lầy lội của lớp</small></div><button type="button" class="tl-x" data-dong>✕</button></header>
      <div class="tl-tabs"><button type="button" data-tab="hoi" aria-selected="true">💬 Hỏi đáp</button><button type="button" data-tab="mua" aria-selected="false">🛒 Soạn tin mua hoạ cụ</button></div>
      <div class="tl-hoi" id="tl-hoi">
        <div class="tl-tin" id="tl-tin" aria-live="polite"></div>
        <div class="tl-goi" id="tl-goi"></div>
        <form class="tl-go" id="tl-go"><input id="tl-nd" maxlength="400" autocomplete="off" placeholder="Hỏi Chì về lớp, khối thi, hoạ cụ…"><button class="btn small primary" type="submit">Gửi</button></form>
      </div>
      <div class="tl-mua" id="tl-mua" hidden></div>
    </section>`;
  document.body.append(w);
  const chat = $("#tl-chat"), pNhac = $("#tl-nhac");
  const mo = (el, nut) => { [chat, pNhac].forEach(x => x !== el && (x.hidden = true)); el.hidden = !el.hidden; $("#tl-bong").hidden = true;
    $("#tl-chat-nut").setAttribute("aria-expanded", !chat.hidden); $("#tl-nhac-nut").setAttribute("aria-expanded", !pNhac.hidden);
    if (!chat.hidden) { if (!lichSu.length) chao(); setTimeout(() => $("#tl-nd").focus({ preventScroll: true }), 50); moAI(); }
    if (!pNhac.hidden) { store.set("lvtt-nhac-xem", nhacKey()); veNhac(); } };
  $("#tl-chat-nut").onclick = () => mo(chat);
  $("#tl-nhac-nut").onclick = () => mo(pNhac);
  $("#tl-bong").onclick = () => mo(pNhac);
  w.querySelectorAll("[data-dong]").forEach(b => b.onclick = () => { chat.hidden = pNhac.hidden = true; });
  document.addEventListener("keydown", e => { if (e.key === "Escape") chat.hidden = pNhac.hidden = true; });
  w.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => {
    w.querySelectorAll("[data-tab]").forEach(x => x.setAttribute("aria-selected", x === b));
    $("#tl-hoi").hidden = b.dataset.tab !== "hoi"; $("#tl-mua").hidden = b.dataset.tab !== "mua";
    if (b.dataset.tab === "mua") veMua();
  });
  $("#tl-go").addEventListener("submit", e => { e.preventDefault(); const q = $("#tl-nd").value.trim(); if (q) { $("#tl-nd").value = ""; hoi(q); } });
  veGoi();
}
function veGoi() {
  const g = ["Lịch học tuần này?", "Khối H khác V thế nào?", "Em cần mua hoạ cụ gì?", "Còn bao lâu nữa thi?", "Bài bị trả thì làm sao?", "Lười vẽ quá 😩"];
  $("#tl-goi").innerHTML = g.map(t => `<button type="button">${esc(t)}</button>`).join("");
  $("#tl-goi").querySelectorAll("button").forEach(b => b.onclick = () => hoi(b.textContent));
}
function themTin(ai, html, dang) {
  const d = document.createElement("div"); d.className = "tl-m " + (ai ? "ai" : "toi") + (dang ? " dang" : "");
  d.innerHTML = html; $("#tl-tin").append(d); $("#tl-tin").scrollTop = $("#tl-tin").scrollHeight; return d;
}
function chao() {
  const ten = (nguoi && nguoi.ten) ? esc(nguoi.ten.split(" ").slice(-1)[0]) : "đồng chí hoạ sĩ";
  themTin(true, `Yo ${ten}! Tui là <b>Bé Chì</b> ✏️ — hỏi gì về lớp, lịch học, khối thi, hoạ cụ cứ hỏi. Tui trả lời thật lòng, hơi mất nết xíu, nhưng mục đích cuối cùng là bắt bạn đi vẽ 😤`);
}
const mdNhe = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
async function hoi(q) {
  themTin(false, esc(q));
  lichSu.push({ role: "user", text: q });
  const cho = themTin(true, `<span class="tl-cham"><i></i><i></i><i></i></span>`, true);
  const dem = demHomNay();
  const model = dem.n < GIOI_HAN_NGAY ? await moAI() : null;
  if (model) {
    try {
      if (!aiChat) aiChat = model.startChat({ history: [] });
      const r = await aiChat.sendMessageStream(q);
      let txt = ""; cho.classList.remove("dang");
      for await (const c of r.stream) { txt += c.text(); cho.innerHTML = mdNhe(txt); $("#tl-tin").scrollTop = $("#tl-tin").scrollHeight; }
      dem.tang(); lichSu.push({ role: "model", text: txt });
      if (/hoạ cụ|họa cụ|mua/i.test(q)) themNutMua(cho);
      return;
    } catch (e) {
      aiChat = null; const m = String(e && e.message);
      if (/permission|403|api.*not.*(enabled|used)|billing/i.test(m)) aiLoi = true;            // chưa bật AI: dùng câu trả lời sẵn
      else if (/429|quota|resource.*exhausted/i.test(m)) { cho.dataset.ban = 1; }               // nhiều người hỏi cùng lúc: trả lời sẵn lần này
    }
  }
  setTimeout(() => { cho.classList.remove("dang"); cho.innerHTML = (cho.dataset.ban ? `<small class="tl-ban">Chì đang bị hỏi dồn quá, trả lời nhanh bản có sẵn nha:</small><br>` : "") + traLoiSan(q); if (/hoa cu|mua/.test(bo(q))) themNutMua(cho); $("#tl-tin").scrollTop = $("#tl-tin").scrollHeight; },
    dem.n >= GIOI_HAN_NGAY ? 300 : 450);
}
function themNutMua(el) {
  const b = document.createElement("button"); b.type = "button"; b.className = "btn small tl-nut-mua"; b.textContent = "🛒 Soạn tin mua hoạ cụ";
  b.onclick = () => document.querySelector('#tl-chat [data-tab="mua"]').click(); el.append(document.createElement("br"), b);
}

/* ---------- Soạn tin mua hoạ cụ ---------- */
let gio = store.get("lvtt-gio", {});
function veMua() {
  const nhom = [...new Set(HOA_CU.map(h => h.loai))];
  const khoi = (nguoi && nguoi.khoi) || "";
  const tong = HOA_CU.reduce((a, h) => a + (gio[h.ma] || 0) * h.gia, 0), n = Object.values(gio).reduce((a, b) => a + b, 0);
  $("#tl-mua").innerHTML = `<div class="tl-mua-dau"><span>Chọn món cần mua, Chì soạn tin gửi thầy.</span><button type="button" class="btn small" id="tl-goi-y">✨ Gợi ý bộ cơ bản${khoi ? " " + esc(khoi) : ""}</button></div>
    <div class="tl-mua-ds">${nhom.map(g => `<h4>${esc(g)}</h4>${HOA_CU.filter(h => h.loai === g).map(h => `<div class="tl-mon"><span>${esc(h.ten)}<small>${vnd(h.gia)}</small></span>
      <span class="tl-sl"><button type="button" data-m="${h.ma}" data-d="-1" aria-label="Bớt">−</button><b>${gio[h.ma] || 0}</b><button type="button" data-m="${h.ma}" data-d="1" aria-label="Thêm">+</button></span></div>`).join("")}`).join("")}</div>
    <div class="tl-mua-cuoi"><div><b>${n} món · ${vnd(tong)}</b><small>Giá tham khảo theo sổ của lớp, thầy xác nhận lại khi giao.</small></div>
      <textarea id="tl-tin-mua" rows="5" readonly>${esc(tinMua())}</textarea>
      <div class="tl-mua-nut"><button type="button" class="btn small" id="tl-chep" ${n ? "" : "disabled"}>📋 Sao chép</button>
      ${nguoi && nguoi.vaiTro === "hv" ? `<button type="button" class="btn small primary" id="tl-gui" ${n ? "" : "disabled"}>📨 Gửi thầy trên web</button>` : ""}
      <a class="btn small" href="https://zalo.me/${esc(LIEN_HE.zalo)}" target="_blank" rel="noopener">Mở Zalo thầy</a>
      ${n ? `<button type="button" class="btn small" id="tl-xoa">Xoá giỏ</button>` : ""}</div></div>`;
  $("#tl-mua").querySelectorAll("[data-m]").forEach(b => b.onclick = () => { const m = b.dataset.m; gio[m] = Math.max(0, (gio[m] || 0) + Number(b.dataset.d)); if (!gio[m]) delete gio[m]; store.set("lvtt-gio", gio); veMua(); });
  $("#tl-goi-y").onclick = () => { HOA_CU.filter(h => h.can && h.can.some(c => c === "Cơ bản" || (khoi && bo(khoi).includes(bo(c))))).forEach(h => gio[h.ma] = gio[h.ma] || 1); store.set("lvtt-gio", gio); veMua(); };
  const chep = $("#tl-chep"); if (chep) chep.onclick = async () => { try { await navigator.clipboard.writeText(tinMua()); chep.textContent = "Đã chép ✓"; } catch (e) { $("#tl-tin-mua").select(); document.execCommand("copy"); chep.textContent = "Đã chép ✓"; } };
  const gui = $("#tl-gui"); if (gui) gui.onclick = async () => {
    gui.disabled = true; gui.textContent = "Đang gửi…";
    try { await window.__guiTinThay(tinMua()); gui.textContent = "Đã gửi thầy ✓"; gio = {}; store.set("lvtt-gio", gio); setTimeout(veMua, 1500); }
    catch (e) { gui.disabled = false; gui.textContent = "Chưa gửi được, thử lại"; }
  };
  const xoa = $("#tl-xoa"); if (xoa) xoa.onclick = () => { gio = {}; store.set("lvtt-gio", gio); veMua(); };
}
function tinMua() {
  const ds = HOA_CU.filter(h => gio[h.ma]);
  if (!ds.length) return "Chưa chọn món nào.";
  const tong = ds.reduce((a, h) => a + gio[h.ma] * h.gia, 0);
  return `🛒 ĐĂNG KÝ MUA HOẠ CỤ\nHọc viên: ${(nguoi && nguoi.ten) || "…"}${nguoi && nguoi.coso ? " · " + nguoi.coso : ""}\n` +
    ds.map((h, i) => `${i + 1}. ${h.ten} × ${gio[h.ma]} = ${vnd(gio[h.ma] * h.gia)}`).join("\n") +
    `\nTổng tạm tính: ${vnd(tong)}\nEm nhận ở buổi học gần nhất ạ.`;
}

/* ---------- Nhắc việc ---------- */
const nhacKey = () => nhac.map(n => n.id).sort().join("|");
function veNhac() {
  const ds = $("#tl-nhac-ds"); if (!ds) return;
  ds.innerHTML = nhac.length ? nhac.map(n => `<a class="tl-nh ${n.muc || ""}" href="${esc(n.link || "#tai-khoan")}"><span>${n.icon || "•"}</span><div><b>${esc(n.tieuDe)}</b>${n.nd ? `<small>${esc(n.nd)}</small>` : ""}</div></a>`).join("")
    : `<p class="tl-rong">Không có việc gì cần nhắc. Rảnh thế thì… vẽ thêm một bài đi 😏</p>`;
  ds.querySelectorAll("a").forEach(a => a.onclick = () => { $("#tl-nhac").hidden = true; });
}
function capNhatDem() {
  const dem = $("#tl-dem"); if (!dem) return;
  const moi = nhac.filter(n => n.muc !== "nhe").length;
  dem.hidden = !moi; dem.textContent = moi;
  // Tự bật bong bóng nhỏ khi có việc mới (mỗi ngày tối đa một lần cho mỗi bộ việc)
  const k = nhacKey(), daXem = store.get("lvtt-nhac-xem", "");
  if (moi && k !== daXem && $("#tl-nhac").hidden && $("#tl-chat").hidden) {
    const b = $("#tl-bong"), quanTrong = nhac.find(n => n.muc === "gap") || nhac[0];
    b.innerHTML = `<b>${quanTrong.icon || "🔔"} ${esc(quanTrong.tieuDe)}</b>${moi > 1 ? `<small>và ${moi - 1} việc khác · bấm để xem</small>` : "<small>Bấm để xem</small>"}`;
    b.hidden = false; clearTimeout(capNhatDem.h); capNhatDem.h = setTimeout(() => { b.hidden = true; }, 9000);
  }
}

/* ---------- Kết nối với app.js ---------- */
window.__troLy = {
  dangNhap(info) {
    nguoi = info; dung();
    document.body.classList.toggle("da-dn", !!info);
    $("#tl-cum").hidden = !info;
    if (!info) { $("#tl-chat").hidden = $("#tl-nhac").hidden = true; lichSu = []; aiChat = null; $("#tl-tin").innerHTML = ""; }
    else if (aiModel && !aiChat) aiModel = null;  // nạp lại lời dặn có tên người dùng
  },
  nhacViec(ds) { nhac = ds || []; dung(); veNhac(); capNhatDem(); },
  trangThaiAI: () => (aiModel ? "ai" : aiLoi ? "san" : "chua"),
};
window.dispatchEvent(new Event("tro-ly-san-sang"));
