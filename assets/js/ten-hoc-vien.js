const collator = new Intl.Collator("vi", { sensitivity: "variant", numeric: true });

export function soSanhTenHocVien(a, b) {
  const tach = value => String(value || "").trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  const x = tach(a?.ten), y = tach(b?.ten);
  const ten = collator.compare(x.at(-1) || "", y.at(-1) || "");
  if (ten) return ten;
  const dem = collator.compare(x.slice(1, -1).join(" "), y.slice(1, -1).join(" "));
  if (dem) return dem;
  return collator.compare(x[0] || "", y[0] || "") || collator.compare(String(a?.id || ""), String(b?.id || ""));
}
