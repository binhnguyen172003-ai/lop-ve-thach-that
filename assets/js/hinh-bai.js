// Hình minh hoạ cho giáo trình (vẽ sẵn bằng SVG, tự đổi màu theo nền sáng/tối).
// Tạo bằng công cụ, sửa chú thích ở GAN nếu cần. Mã bài trùng với data/bai-hoc.js.
export const HINH = {"5-vung": "<svg viewBox=\"0 0 360 200\" role=\"img\" aria-label=\"Năm vùng sáng tối trên khối cầu\" xmlns=\"http://www.w3.org/2000/svg\"><defs><radialGradient id=\"hb-cau\" cx=\"36%\" cy=\"32%\" r=\"72%\"><stop offset=\"0\" stop-color=\"#f7f7f7\"/><stop offset=\".33\" stop-color=\"#c9c9c9\"/><stop offset=\".6\" stop-color=\"#6b6b6b\"/><stop offset=\".74\" stop-color=\"#3b3b3b\"/><stop offset=\".9\" stop-color=\"#5e5e5e\"/><stop offset=\"1\" stop-color=\"#4a4a4a\"/></radialGradient>\n<radialGradient id=\"hb-bong\" cx=\"40%\" cy=\"50%\" r=\"60%\"><stop offset=\"0\" stop-color=\"#1b1b1b\" stop-opacity=\".85\"/><stop offset=\"1\" stop-color=\"#1b1b1b\" stop-opacity=\"0\"/></radialGradient></defs><ellipse cx=\"190\" cy=\"168\" rx=\"92\" ry=\"16\" fill=\"url(#hb-bong)\"/><circle cx=\"150\" cy=\"105\" r=\"62\" fill=\"url(#hb-cau)\"/><path d=\"M40 22l38 30\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\"/><path d=\"M78 52l-10-1 4-9\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\"/><text x=\"24\" y=\"16\" font-size=\"11\" text-anchor=\"start\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">Nguồn sáng</text><path d=\"M128 78L228 26\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.2\"/><circle cx=\"128\" cy=\"78\" r=\"2.5\" fill=\"currentColor\"/><text x=\"232\" y=\"30\" font-size=\"12\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">1 · Sáng</text><path d=\"M165 88L246 54\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.2\"/><circle cx=\"165\" cy=\"88\" r=\"2.5\" fill=\"currentColor\"/><text x=\"250\" y=\"58\" font-size=\"12\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">2 · Trung gian</text><path d=\"M188 128L258 92\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.2\"/><circle cx=\"188\" cy=\"128\" r=\"2.5\" fill=\"currentColor\"/><text x=\"262\" y=\"96\" font-size=\"12\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">3 · Tối (lõi bóng)</text><path d=\"M198 146L258 124\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.2\"/><circle cx=\"198\" cy=\"146\" r=\"2.5\" fill=\"currentColor\"/><text x=\"262\" y=\"128\" font-size=\"12\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">4 · Phản quang</text><path d=\"M236 170L264 154\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.2\"/><circle cx=\"236\" cy=\"170\" r=\"2.5\" fill=\"currentColor\"/><text x=\"268\" y=\"158\" font-size=\"12\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">5 · Bóng đổ</text></svg>", "khoi-co-ban": "<svg viewBox=\"0 0 360 200\" role=\"img\" aria-label=\"Năm khối cơ bản với cạnh khuất và trục\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M10 40H350\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><text x=\"12\" y=\"34\" font-size=\"10\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">Tầm mắt</text><path d=\"M30 95l30-14 30 14v48l-30 14-30-14z M30 95l30 14 30-14 M60 109v48\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M30 143l30-14 30 14 M60 81v48\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><text x=\"60\" y=\"180\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);\">Lập phương</text><ellipse cx=\"135\" cy=\"92\" rx=\"26\" ry=\"7\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M109 92v52M161 92v52M109 144a26 10 0 0 0 52 0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M109 144a26 10 0 0 1 52 0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M135 86v66\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\" stroke-width=\"1.2\"/><text x=\"135\" y=\"180\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);\">Trụ</text><path d=\"M205 76L180 146M205 76l25 70M180 146a25 9 0 0 0 50 0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M180 146a25 9 0 0 1 50 0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M205 76v70\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\" stroke-width=\"1.2\"/><text x=\"205\" y=\"180\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);\">Nón</text><circle cx=\"268\" cy=\"118\" r=\"28\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M240 118a28 9 0 0 0 56 0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M240 118a28 9 0 0 1 56 0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M268 90v56\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\" stroke-width=\"1.2\"/><text x=\"268\" y=\"180\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);\">Cầu</text><path d=\"M330 78L308 138l22 10 18-14z M330 78l18 56 M330 78v70\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M308 138l18-8 22 4\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><text x=\"330\" y=\"180\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);\">Chóp</text><text x=\"180\" y=\"196\" font-size=\"10\" text-anchor=\"middle\" style=\"fill:var(--accent);font-family:var(--f-body);\">Nét đứt: cạnh khuất · nét màu: trục đối xứng</text></svg>", "phoi-canh": "<svg viewBox=\"0 0 360 200\" role=\"img\" aria-label=\"Hình hộp vẽ theo phối cảnh hai điểm tụ\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M6 60H354\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.4\"/><text x=\"180\" y=\"52\" font-size=\"10\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);\">Đường tầm mắt</text><circle cx=\"20\" cy=\"60\" r=\"4\" fill=\"var(--accent)\"/><circle cx=\"340\" cy=\"60\" r=\"4\" fill=\"var(--accent)\"/><text x=\"22\" y=\"78\" font-size=\"10\" text-anchor=\"start\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">Điểm tụ trái</text><text x=\"338\" y=\"78\" font-size=\"10\" text-anchor=\"end\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">Điểm tụ phải</text><path d=\"M180.0 100.0L340.0 60.0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M180.0 172.0L340.0 60.0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M118.0 84.5L340.0 60.0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M118.0 128.6L340.0 60.0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M180.0 100.0L20.0 60.0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M180.0 172.0L20.0 60.0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M250.0 82.5L20.0 60.0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M250.0 123.0L20.0 60.0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M118.0 84.5L180.0 100.0L250.0 82.5L189.6 76.6Z M118.0 128.6L180.0 172.0L250.0 123.0 M118.0 84.5L118.0 128.6 M180.0 100.0L180.0 172.0 M250.0 82.5L250.0 123.0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.4\"/><path d=\"M118.0 128.6L189.6 106.5L250.0 123.0 M189.6 76.6L189.6 106.5\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"4 4\" opacity=\".7\"/><text x=\"180\" y=\"192\" font-size=\"10\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);\">Cạnh đứng luôn thẳng đứng · cạnh ngang chạy về 2 điểm tụ</text></svg>", "elip": "<svg viewBox=\"0 0 360 200\" role=\"img\" aria-label=\"Elip càng xa tầm mắt càng tròn\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M10 34H350\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><text x=\"12\" y=\"28\" font-size=\"10\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">Tầm mắt</text><ellipse cx=\"120\" cy=\"70\" rx=\"48\" ry=\"6\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.4\"/><ellipse cx=\"120\" cy=\"115\" rx=\"48\" ry=\"12\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><ellipse cx=\"120\" cy=\"160\" rx=\"48\" ry=\"18\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.4\"/><path d=\"M72 70V160M168 70V160\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M176 72H200\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\" style=\"stroke:var(--accent)\"/><text x=\"206\" y=\"76\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Gần tầm mắt → elip dẹt</text><path d=\"M176 117H200\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\" style=\"stroke:var(--accent)\"/><text x=\"206\" y=\"121\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Xa hơn → tròn hơn</text><path d=\"M176 164H200\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\" style=\"stroke:var(--accent)\"/><text x=\"206\" y=\"168\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Xa nhất → tròn nhất</text><text x=\"180\" y=\"194\" font-size=\"10\" text-anchor=\"middle\" style=\"fill:var(--accent);font-family:var(--f-body);\">Đáy cốc, chai, lọ luôn tròn hơn miệng khi nhìn từ trên xuống</text></svg>", "lien-hop": "<svg viewBox=\"0 0 360 200\" role=\"img\" aria-label=\"Khối trụ cắm vào khối hộp và đường giao tuyến\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M60 100l70-30 90 26-70 32z\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M60 100v58l90 28 70-32V96\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M150 128v58\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><ellipse cx=\"140\" cy=\"96\" rx=\"32\" ry=\"11\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\" stroke-width=\"2.4\"/><path d=\"M108 96V40M172 96V40\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><ellipse cx=\"140\" cy=\"40\" rx=\"32\" ry=\"10\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M176 100L238 118\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\"/><text x=\"242\" y=\"116\" font-size=\"11\" text-anchor=\"start\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">Giao tuyến:</text><text x=\"242\" y=\"131\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">chỗ trụ chạm</text><text x=\"242\" y=\"146\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">mặt hộp (elip)</text><text x=\"180\" y=\"14\" font-size=\"10\" text-anchor=\"middle\" style=\"fill:var(--accent);font-family:var(--f-body);\">Dựng từng khối riêng, rồi tìm đường giao nhau</text></svg>", "to-hop": "<svg viewBox=\"0 0 370 204\" role=\"img\" aria-label=\"Bố cục tam giác cho tổ hợp ba khối\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"64\" y=\"12\" width=\"230\" height=\"166\" rx=\"4\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.4\"/><path d=\"M150 56l34-14 34 14v58l-34 14-34-14z M150 56l34 14 34-14 M184 70v58\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><ellipse cx=\"112\" cy=\"104\" rx=\"22\" ry=\"7\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M90 104v48M134 104v48M90 152a22 8 0 0 0 44 0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"244\" cy=\"148\" r=\"22\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M184 34L100 164H262Z\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\" stroke-dasharray=\"6 5\" stroke-width=\"1.6\"/><text x=\"300\" y=\"40\" font-size=\"10\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Khối chính</text><text x=\"300\" y=\"54\" font-size=\"10\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">cao, ở giữa</text><text x=\"4\" y=\"110\" font-size=\"10\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Khối phụ</text><text x=\"300\" y=\"150\" font-size=\"10\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Điểm</text><text x=\"300\" y=\"164\" font-size=\"10\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">cân bằng</text><text x=\"180\" y=\"198\" font-size=\"10\" text-anchor=\"middle\" style=\"fill:var(--accent);font-family:var(--f-body);\">Bố cục tam giác · khối trước che một phần khối sau</text></svg>", "tinh-vat": "<svg viewBox=\"0 0 360 200\" role=\"img\" aria-label=\"Các bước dựng hình một chiếc lọ đối xứng\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M150 18V190\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\" stroke-width=\"1.2\"/><rect x=\"108\" y=\"26\" width=\"84\" height=\"152\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M138 30h24M140 58h20M110 128h80M132 176h36\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M140 30C136 40 138 52 142 58 C122 74 110 98 110 128 C110 150 118 166 132 176 L168 176 C182 166 190 150 190 128 C190 98 178 74 158 58 C162 52 164 40 160 30Z\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.4\"/><ellipse cx=\"150\" cy=\"30\" rx=\"10\" ry=\"3\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><ellipse cx=\"150\" cy=\"176\" rx=\"18\" ry=\"5\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M196 32H214\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\"/><text x=\"218\" y=\"36\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">1 · Khung + trục giữa</text><path d=\"M196 60H214\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\"/><text x=\"218\" y=\"64\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">2 · Cổ, vai</text><path d=\"M196 130H214\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\"/><text x=\"218\" y=\"134\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">3 · Chỗ rộng nhất</text><path d=\"M196 178H214\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1\"/><text x=\"218\" y=\"182\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">4 · Đáy tròn hơn miệng</text></svg>", "ty-le-mat": "<svg viewBox=\"0 0 360 200\" role=\"img\" aria-label=\"Tỷ lệ ba phần trên khuôn mặt\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M150 22C186 22 208 50 208 88C208 112 204 130 196 146C186 166 168 182 150 182C132 182 114 166 104 146C96 130 92 112 92 88C92 50 114 22 150 22Z\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.4\" opacity=\".55\"/><path d=\"M126 172L124 198M174 172L176 198\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\".55\"/><path d=\"M93 96C82 92 80 122 94 134M207 96C218 92 220 122 206 134\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\".55\"/><path d=\"M90 104C86 108 87 118 92 124M210 104C214 108 213 118 208 124\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.2\" opacity=\".55\"/><path d=\"M108 94Q123 85 139 91M161 91Q177 85 192 94\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"/><path d=\"M113 103Q125 94 137 102Q125 108 113 103Z M163 102Q175 94 187 103Q175 108 163 102Z\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M113 103Q125 93 137 102M163 102Q175 93 187 103\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.8\"/><circle cx=\"125\" cy=\"101.5\" r=\"3.6\" fill=\"currentColor\"/><circle cx=\"175\" cy=\"101.5\" r=\"3.6\" fill=\"currentColor\"/><path d=\"M141 114C140 121 139 126 138 131M159 114C160 121 161 126 162 131\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.1\" opacity=\".45\"/><path d=\"M138 131Q134 139 142 140Q146 137 150 141Q154 137 158 140Q166 139 162 131\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M143 136q2-2 4 0M153 136q2-2 4 0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.4\"/><path d=\"M128 155Q139 149 150 152Q161 149 172 155\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M128 155Q150 158 172 155\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.6\"/><path d=\"M134 158Q150 167 166 158\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M150 14V190\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\" stroke-width=\"1.2\"/><path d=\"M84 46H232\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><text x=\"240\" y=\"50\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Chân tóc</text><path d=\"M84 92H232\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><text x=\"240\" y=\"96\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Lông mày</text><path d=\"M84 140H232\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><text x=\"240\" y=\"144\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Chân mũi</text><path d=\"M84 182H232\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><text x=\"240\" y=\"186\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Cằm</text><path d=\"M222 50v38M222 96v40M222 144v34\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\" stroke-width=\"2\"/><text x=\"300\" y=\"114\" font-size=\"11\" text-anchor=\"start\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">3 phần</text><text x=\"300\" y=\"128\" font-size=\"11\" text-anchor=\"start\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">bằng nhau</text><path d=\"M84 102H112\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\" stroke-width=\"1.4\"/><text x=\"4\" y=\"98\" font-size=\"10\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Mắt ở</text><text x=\"4\" y=\"113\" font-size=\"10\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">giữa đầu</text></svg>", "tam-giac-mat": "<svg viewBox=\"0 0 360 200\" role=\"img\" aria-label=\"Tam giác nối hai mắt và miệng\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M150 22C186 22 208 50 208 88C208 112 204 130 196 146C186 166 168 182 150 182C132 182 114 166 104 146C96 130 92 112 92 88C92 50 114 22 150 22Z\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.4\" opacity=\".55\"/><path d=\"M126 172L124 198M174 172L176 198\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\".55\"/><path d=\"M93 96C82 92 80 122 94 134M207 96C218 92 220 122 206 134\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\".55\"/><path d=\"M90 104C86 108 87 118 92 124M210 104C214 108 213 118 208 124\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.2\" opacity=\".55\"/><path d=\"M108 94Q123 85 139 91M161 91Q177 85 192 94\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"/><path d=\"M113 103Q125 94 137 102Q125 108 113 103Z M163 102Q175 94 187 103Q175 108 163 102Z\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M113 103Q125 93 137 102M163 102Q175 93 187 103\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.8\"/><circle cx=\"125\" cy=\"101.5\" r=\"3.6\" fill=\"currentColor\"/><circle cx=\"175\" cy=\"101.5\" r=\"3.6\" fill=\"currentColor\"/><path d=\"M141 114C140 121 139 126 138 131M159 114C160 121 161 126 162 131\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.1\" opacity=\".45\"/><path d=\"M138 131Q134 139 142 140Q146 137 150 141Q154 137 158 140Q166 139 162 131\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M143 136q2-2 4 0M153 136q2-2 4 0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.4\"/><path d=\"M128 155Q139 149 150 152Q161 149 172 155\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M128 155Q150 158 172 155\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.6\"/><path d=\"M134 158Q150 167 166 158\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M125 101.5L175 101.5L150 155Z\" fill=\"var(--accent)\" fill-opacity=\".12\" stroke=\"var(--accent)\" stroke-width=\"2\"/><text x=\"222\" y=\"92\" font-size=\"12\" text-anchor=\"start\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">Tam giác mặt:</text><text x=\"222\" y=\"108\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">2 mắt + giữa miệng</text><text x=\"222\" y=\"124\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">Đặt đúng tam giác này</text><text x=\"222\" y=\"140\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">thì mặt giống người mẫu</text></svg>", "dau-khoi": "<svg viewBox=\"0 0 360 200\" role=\"img\" aria-label=\"Đầu người giản lược thành khối hộp\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M110 50l60-20 70 22-60 22z\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M110 50v96l70 30V74M240 52v94l-60 30\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.4\"/><path d=\"M145 62v104\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\" stroke-width=\"1.4\"/><path d=\"M110 92l70 22 60-20\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M110 122l70 24 60-20\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\"/><path d=\"M145 110l-7 18h13z\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M134 146h22\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><text x=\"250\" y=\"96\" font-size=\"10\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Lông mày</text><text x=\"250\" y=\"126\" font-size=\"10\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Chân mũi</text><text x=\"14\" y=\"116\" font-size=\"10\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Mặt trước</text><text x=\"250\" y=\"64\" font-size=\"10\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Mặt bên</text><text x=\"180\" y=\"196\" font-size=\"10\" text-anchor=\"middle\" style=\"fill:var(--accent);font-family:var(--f-body);\">Vạt mảng: coi đầu là khối hộp, mỗi mặt một sắc độ</text></svg>", "sac-do": "<svg viewBox=\"0 0 360 190\" role=\"img\" aria-label=\"Thang chín bậc sắc độ từ trắng đến đen\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"18\" y=\"40\" width=\"36\" height=\"70\" fill=\"#ffffff\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"36\" y=\"128\" font-size=\"12\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">1</text><rect x=\"54\" y=\"40\" width=\"36\" height=\"70\" fill=\"#e1e1e1\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"72\" y=\"128\" font-size=\"12\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">2</text><rect x=\"90\" y=\"40\" width=\"36\" height=\"70\" fill=\"#c4c4c4\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"108\" y=\"128\" font-size=\"12\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">3</text><rect x=\"126\" y=\"40\" width=\"36\" height=\"70\" fill=\"#a6a6a6\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"144\" y=\"128\" font-size=\"12\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">4</text><rect x=\"162\" y=\"40\" width=\"36\" height=\"70\" fill=\"#898989\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"180\" y=\"128\" font-size=\"12\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">5</text><rect x=\"198\" y=\"40\" width=\"36\" height=\"70\" fill=\"#6c6c6c\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"216\" y=\"128\" font-size=\"12\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">6</text><rect x=\"234\" y=\"40\" width=\"36\" height=\"70\" fill=\"#4e4e4e\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"252\" y=\"128\" font-size=\"12\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">7</text><rect x=\"270\" y=\"40\" width=\"36\" height=\"70\" fill=\"#313131\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"288\" y=\"128\" font-size=\"12\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">8</text><rect x=\"306\" y=\"40\" width=\"36\" height=\"70\" fill=\"#141414\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"324\" y=\"128\" font-size=\"12\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">9</text><text x=\"18\" y=\"30\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Trắng giấy</text><text x=\"342\" y=\"30\" font-size=\"11\" text-anchor=\"end\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Đậm nhất</text><text x=\"180\" y=\"156\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:var(--accent);font-family:var(--f-body);\">Mỗi bậc chỉ đậm hơn bậc trước một chút, đều tay</text><text x=\"180\" y=\"174\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);\">HB–2B: bậc 1–4 · 3B–6B: bậc 5–9</text></svg>", "vong-12": "<svg viewBox=\"0 0 360 210\" role=\"img\" aria-label=\"Vòng thuần sắc 12 màu\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M129.8 32.7A78 78 0 0 1 170.2 32.7L159.3 73.2A36 36 0 0 0 140.7 73.2Z\" fill=\"#fdd835\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M170.2 32.7A78 78 0 0 1 205.2 52.8L175.5 82.5A36 36 0 0 0 159.3 73.2Z\" fill=\"#c0ca33\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M205.2 52.8A78 78 0 0 1 225.3 87.8L184.8 98.7A36 36 0 0 0 175.5 82.5Z\" fill=\"#43a047\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M225.3 87.8A78 78 0 0 1 225.3 128.2L184.8 117.3A36 36 0 0 0 184.8 98.7Z\" fill=\"#00897b\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M225.3 128.2A78 78 0 0 1 205.2 163.2L175.5 133.5A36 36 0 0 0 184.8 117.3Z\" fill=\"#1e88e5\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M205.2 163.2A78 78 0 0 1 170.2 183.3L159.3 142.8A36 36 0 0 0 175.5 133.5Z\" fill=\"#3949ab\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M170.2 183.3A78 78 0 0 1 129.8 183.3L140.7 142.8A36 36 0 0 0 159.3 142.8Z\" fill=\"#8e24aa\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M129.8 183.3A78 78 0 0 1 94.8 163.2L124.5 133.5A36 36 0 0 0 140.7 142.8Z\" fill=\"#c2185b\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M94.8 163.2A78 78 0 0 1 74.7 128.2L115.2 117.3A36 36 0 0 0 124.5 133.5Z\" fill=\"#e53935\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M74.7 128.2A78 78 0 0 1 74.7 87.8L115.2 98.7A36 36 0 0 0 115.2 117.3Z\" fill=\"#f4511e\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M74.7 87.8A78 78 0 0 1 94.8 52.8L124.5 82.5A36 36 0 0 0 115.2 98.7Z\" fill=\"#fb8c00\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M94.8 52.8A78 78 0 0 1 129.8 32.7L140.7 73.2A36 36 0 0 0 124.5 82.5Z\" fill=\"#ffb300\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><text x=\"150.0\" y=\"20.0\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Vàng</text><text x=\"229.7\" y=\"158.0\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Lam</text><text x=\"70.3\" y=\"158.0\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Đỏ</text><text x=\"229.7\" y=\"66.0\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Lục</text><text x=\"150.0\" y=\"204.0\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Tím</text><text x=\"70.3\" y=\"66.0\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Cam</text><text x=\"268\" y=\"70\" font-size=\"11\" text-anchor=\"start\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">Màu cơ bản:</text><text x=\"268\" y=\"86\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">Đỏ · Vàng · Lam</text><text x=\"268\" y=\"112\" font-size=\"11\" text-anchor=\"start\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">Màu bậc 2:</text><text x=\"268\" y=\"128\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">Cam · Lục · Tím</text><text x=\"268\" y=\"154\" font-size=\"11\" text-anchor=\"start\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">Đối diện nhau</text><text x=\"268\" y=\"170\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">= cặp bổ túc</text></svg>", "vong-24": "<svg viewBox=\"0 0 360 210\" role=\"img\" aria-label=\"Vòng thuần sắc 24 màu\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M139.8 30.7A78 78 0 0 1 160.2 30.7L154.7 72.3A36 36 0 0 0 145.3 72.3Z\" fill=\"#fdd835\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M160.2 30.7A78 78 0 0 1 179.8 35.9L163.8 74.7A36 36 0 0 0 154.7 72.3Z\" fill=\"#ded134\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M179.8 35.9A78 78 0 0 1 197.5 46.1L171.9 79.4A36 36 0 0 0 163.8 74.7Z\" fill=\"#c0ca33\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M197.5 46.1A78 78 0 0 1 211.9 60.5L178.6 86.1A36 36 0 0 0 171.9 79.4Z\" fill=\"#82b53d\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M211.9 60.5A78 78 0 0 1 222.1 78.2L183.3 94.2A36 36 0 0 0 178.6 86.1Z\" fill=\"#43a047\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M222.1 78.2A78 78 0 0 1 227.3 97.8L185.7 103.3A36 36 0 0 0 183.3 94.2Z\" fill=\"#229461\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M227.3 97.8A78 78 0 0 1 227.3 118.2L185.7 112.7A36 36 0 0 0 185.7 103.3Z\" fill=\"#00897b\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M227.3 118.2A78 78 0 0 1 222.1 137.8L183.3 121.8A36 36 0 0 0 185.7 112.7Z\" fill=\"#0f88b0\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M222.1 137.8A78 78 0 0 1 211.9 155.5L178.6 129.9A36 36 0 0 0 183.3 121.8Z\" fill=\"#1e88e5\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M211.9 155.5A78 78 0 0 1 197.5 169.9L171.9 136.6A36 36 0 0 0 178.6 129.9Z\" fill=\"#2c68c8\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M197.5 169.9A78 78 0 0 1 179.8 180.1L163.8 141.3A36 36 0 0 0 171.9 136.6Z\" fill=\"#3949ab\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M179.8 180.1A78 78 0 0 1 160.2 185.3L154.7 143.7A36 36 0 0 0 163.8 141.3Z\" fill=\"#6436aa\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M160.2 185.3A78 78 0 0 1 139.8 185.3L145.3 143.7A36 36 0 0 0 154.7 143.7Z\" fill=\"#8e24aa\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M139.8 185.3A78 78 0 0 1 120.2 180.1L136.2 141.3A36 36 0 0 0 145.3 143.7Z\" fill=\"#a81e82\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M120.2 180.1A78 78 0 0 1 102.5 169.9L128.1 136.6A36 36 0 0 0 136.2 141.3Z\" fill=\"#c2185b\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M102.5 169.9A78 78 0 0 1 88.1 155.5L121.4 129.9A36 36 0 0 0 128.1 136.6Z\" fill=\"#d42848\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M88.1 155.5A78 78 0 0 1 77.9 137.8L116.7 121.8A36 36 0 0 0 121.4 129.9Z\" fill=\"#e53935\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M77.9 137.8A78 78 0 0 1 72.7 118.2L114.3 112.7A36 36 0 0 0 116.7 121.8Z\" fill=\"#ec452a\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M72.7 118.2A78 78 0 0 1 72.7 97.8L114.3 103.3A36 36 0 0 0 114.3 112.7Z\" fill=\"#f4511e\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M72.7 97.8A78 78 0 0 1 77.9 78.2L116.7 94.2A36 36 0 0 0 114.3 103.3Z\" fill=\"#f86e0f\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M77.9 78.2A78 78 0 0 1 88.1 60.5L121.4 86.1A36 36 0 0 0 116.7 94.2Z\" fill=\"#fb8c00\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M88.1 60.5A78 78 0 0 1 102.5 46.1L128.1 79.4A36 36 0 0 0 121.4 86.1Z\" fill=\"#fda000\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M102.5 46.1A78 78 0 0 1 120.2 35.9L136.2 74.7A36 36 0 0 0 128.1 79.4Z\" fill=\"#ffb300\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><path d=\"M120.2 35.9A78 78 0 0 1 139.8 30.7L145.3 72.3A36 36 0 0 0 136.2 74.7Z\" fill=\"#fec61a\" stroke=\"var(--sheet,#fff)\" stroke-width=\"1.5\"/><text x=\"150.0\" y=\"20.0\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Vàng</text><text x=\"229.7\" y=\"158.0\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Lam</text><text x=\"70.3\" y=\"158.0\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Đỏ</text><text x=\"268\" y=\"80\" font-size=\"11\" text-anchor=\"start\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">24 màu:</text><text x=\"268\" y=\"96\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">thêm 1 màu trung</text><text x=\"268\" y=\"112\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">gian giữa mỗi cặp</text><text x=\"268\" y=\"128\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">màu cạnh nhau</text></svg>", "ba-mau": "<svg viewBox=\"0 0 360 214\" role=\"img\" aria-label=\"Pha hai màu cơ bản thành màu bậc hai\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"60\" cy=\"26\" r=\"17\" fill=\"#e53935\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"60\" y=\"57\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Đỏ</text><text x=\"105\" y=\"32\" font-size=\"20\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">+</text><circle cx=\"150\" cy=\"26\" r=\"17\" fill=\"#fdd835\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"150\" y=\"57\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Vàng</text><text x=\"195\" y=\"32\" font-size=\"20\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">=</text><circle cx=\"240\" cy=\"26\" r=\"17\" fill=\"#fb8c00\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"240\" y=\"57\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Cam</text><circle cx=\"60\" cy=\"90\" r=\"17\" fill=\"#fdd835\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"60\" y=\"121\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Vàng</text><text x=\"105\" y=\"96\" font-size=\"20\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">+</text><circle cx=\"150\" cy=\"90\" r=\"17\" fill=\"#1e88e5\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"150\" y=\"121\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Lam</text><text x=\"195\" y=\"96\" font-size=\"20\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">=</text><circle cx=\"240\" cy=\"90\" r=\"17\" fill=\"#43a047\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"240\" y=\"121\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Lục</text><circle cx=\"60\" cy=\"154\" r=\"17\" fill=\"#1e88e5\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"60\" y=\"185\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Lam</text><text x=\"105\" y=\"160\" font-size=\"20\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">+</text><circle cx=\"150\" cy=\"154\" r=\"17\" fill=\"#e53935\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"150\" y=\"185\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Đỏ</text><text x=\"195\" y=\"160\" font-size=\"20\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">=</text><circle cx=\"240\" cy=\"154\" r=\"17\" fill=\"#8e24aa\" stroke=\"currentColor\" stroke-width=\"1\"/><text x=\"240\" y=\"185\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Tím</text><text x=\"300\" y=\"100\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">3 màu</text><text x=\"300\" y=\"116\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);\">\"ông bà\"</text></svg>", "sang-toi": "<svg viewBox=\"0 0 360 185\" role=\"img\" aria-label=\"Một màu làm sáng bằng trắng và làm tối bằng đen\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"18\" y=\"44\" width=\"36\" height=\"66\" fill=\"#d2e7fa\" stroke=\"currentColor\" stroke-width=\"1\"/><rect x=\"54\" y=\"44\" width=\"36\" height=\"66\" fill=\"#a5cff5\" stroke=\"currentColor\" stroke-width=\"1\"/><rect x=\"90\" y=\"44\" width=\"36\" height=\"66\" fill=\"#78b8ef\" stroke=\"currentColor\" stroke-width=\"1\"/><rect x=\"126\" y=\"44\" width=\"36\" height=\"66\" fill=\"#4ba0ea\" stroke=\"currentColor\" stroke-width=\"1\"/><rect x=\"162\" y=\"44\" width=\"36\" height=\"66\" fill=\"#1e88e5\" stroke=\"currentColor\" stroke-width=\"1\"/><rect x=\"198\" y=\"44\" width=\"36\" height=\"66\" fill=\"#186db7\" stroke=\"currentColor\" stroke-width=\"1\"/><rect x=\"234\" y=\"44\" width=\"36\" height=\"66\" fill=\"#125289\" stroke=\"currentColor\" stroke-width=\"1\"/><rect x=\"270\" y=\"44\" width=\"36\" height=\"66\" fill=\"#0c365c\" stroke=\"currentColor\" stroke-width=\"1\"/><rect x=\"306\" y=\"44\" width=\"36\" height=\"66\" fill=\"#061b2e\" stroke=\"currentColor\" stroke-width=\"1\"/><path d=\"M36 124H168\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\"/><path d=\"M192 124H324\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><text x=\"102\" y=\"142\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">+ trắng: làm sáng</text><text x=\"258\" y=\"142\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">+ đen: làm tối</text><text x=\"180\" y=\"36\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Màu gốc</text><text x=\"180\" y=\"170\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:currentColor;font-family:var(--f-body);\">Làm tương tự với cả 12 màu trên vòng thuần sắc</text></svg>", "ty-le-than": "<svg viewBox=\"0 0 330 190\" role=\"img\" aria-label=\"Tỷ lệ cơ thể người cao tám đầu\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M40 12H142\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\" stroke-width=\"1\"/><text x=\"34\" y=\"16\" font-size=\"10\" text-anchor=\"end\" style=\"fill:currentColor;font-family:var(--f-body);\">0</text><path d=\"M40 33H142\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\" stroke-width=\"1\"/><text x=\"34\" y=\"37\" font-size=\"10\" text-anchor=\"end\" style=\"fill:currentColor;font-family:var(--f-body);\">1</text><path d=\"M40 54H142\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\" stroke-width=\"1\"/><text x=\"34\" y=\"58\" font-size=\"10\" text-anchor=\"end\" style=\"fill:currentColor;font-family:var(--f-body);\">2</text><path d=\"M40 75H142\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\" stroke-width=\"1\"/><text x=\"34\" y=\"79\" font-size=\"10\" text-anchor=\"end\" style=\"fill:currentColor;font-family:var(--f-body);\">3</text><path d=\"M40 96H142\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\" stroke-width=\"1\"/><text x=\"34\" y=\"100\" font-size=\"10\" text-anchor=\"end\" style=\"fill:currentColor;font-family:var(--f-body);\">4</text><path d=\"M40 117H142\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\" stroke-width=\"1\"/><text x=\"34\" y=\"121\" font-size=\"10\" text-anchor=\"end\" style=\"fill:currentColor;font-family:var(--f-body);\">5</text><path d=\"M40 138H142\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\" stroke-width=\"1\"/><text x=\"34\" y=\"142\" font-size=\"10\" text-anchor=\"end\" style=\"fill:currentColor;font-family:var(--f-body);\">6</text><path d=\"M40 159H142\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\" stroke-width=\"1\"/><text x=\"34\" y=\"163\" font-size=\"10\" text-anchor=\"end\" style=\"fill:currentColor;font-family:var(--f-body);\">7</text><path d=\"M40 180H142\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-dasharray=\"5 5\" opacity=\".55\" stroke-width=\"1\"/><text x=\"34\" y=\"184\" font-size=\"10\" text-anchor=\"end\" style=\"fill:currentColor;font-family:var(--f-body);\">8</text><ellipse cx=\"110\" cy=\"22.5\" rx=\"8\" ry=\"10.5\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M110 33v6\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M89 41H131\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M89 41L96 96H124L131 41\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M89 41L83 75L80 104.4M131 41L137 75L140 104.4\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M99 96L100 138L102 180h-6M121 96L120 138L118 180h6\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"102\" cy=\"54\" r=\"1.6\" fill=\"currentColor\"/><circle cx=\"118\" cy=\"54\" r=\"1.6\" fill=\"currentColor\"/><circle cx=\"110\" cy=\"75\" r=\"1.6\" fill=\"currentColor\"/><path d=\"M89 47h42\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\" stroke-width=\"1.4\"/><text x=\"150\" y=\"37\" font-size=\"10.5\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">1 · Cằm</text><text x=\"150\" y=\"58\" font-size=\"10.5\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">2 · Ngực (núm vú)</text><text x=\"150\" y=\"79\" font-size=\"10.5\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">3 · Rốn</text><text x=\"150\" y=\"100\" font-size=\"10.5\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">4 · Háng = giữa người</text><text x=\"150\" y=\"121\" font-size=\"10.5\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">5 · Giữa đùi</text><text x=\"150\" y=\"142\" font-size=\"10.5\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">6 · Dưới gối</text><text x=\"150\" y=\"163\" font-size=\"10.5\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">7 · Giữa cẳng chân</text><text x=\"150\" y=\"184\" font-size=\"10.5\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);\">8 · Gót chân</text><text x=\"150\" y=\"24\" font-size=\"10.5\" text-anchor=\"start\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">Vai rộng ≈ 2 đầu</text></svg>", "co-mat": "<svg viewBox=\"0 0 330 222\" role=\"img\" aria-label=\"Các cơ chính trên khuôn mặt\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M150 22C186 22 208 50 208 88C208 112 204 130 196 146C186 166 168 182 150 182C132 182 114 166 104 146C96 130 92 112 92 88C92 50 114 22 150 22Z\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.4\" opacity=\".55\"/><path d=\"M126 172L124 198M174 172L176 198\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\".55\"/><path d=\"M93 96C82 92 80 122 94 134M207 96C218 92 220 122 206 134\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\".55\"/><path d=\"M90 104C86 108 87 118 92 124M210 104C214 108 213 118 208 124\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.2\" opacity=\".55\"/><path d=\"M108 94Q123 85 139 91M161 91Q177 85 192 94\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"/><path d=\"M113 103Q125 94 137 102Q125 108 113 103Z M163 102Q175 94 187 103Q175 108 163 102Z\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M113 103Q125 93 137 102M163 102Q175 93 187 103\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.8\"/><circle cx=\"125\" cy=\"101.5\" r=\"3.6\" fill=\"currentColor\"/><circle cx=\"175\" cy=\"101.5\" r=\"3.6\" fill=\"currentColor\"/><path d=\"M141 114C140 121 139 126 138 131M159 114C160 121 161 126 162 131\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.1\" opacity=\".45\"/><path d=\"M138 131Q134 139 142 140Q146 137 150 141Q154 137 158 140Q166 139 162 131\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M143 136q2-2 4 0M153 136q2-2 4 0\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.4\"/><path d=\"M128 155Q139 149 150 152Q161 149 172 155\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M128 155Q150 158 172 155\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.6\"/><path d=\"M134 158Q150 167 166 158\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M110 40Q150 26 190 40L190 76Q150 70 110 76Z\" fill=\"#f2994a\" fill-opacity=\".32\" stroke=\"#f2994a\" stroke-width=\"1.2\"/><path d=\"M192 48H212\" stroke=\"#f2994a\" stroke-width=\"2\"/><text x=\"216\" y=\"52\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Cơ trán</text><path d=\"M108 102a19 12 0 1 0 38 0a19 12 0 1 0 -38 0Z M154 102a19 12 0 1 0 38 0a19 12 0 1 0 -38 0Z\" fill=\"#56ccf2\" fill-opacity=\".32\" stroke=\"#56ccf2\" stroke-width=\"1.2\"/><path d=\"M192 88H212\" stroke=\"#56ccf2\" stroke-width=\"2\"/><text x=\"216\" y=\"92\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Cơ vòng mắt</text><path d=\"M114 116L140 150L136 156L108 122Z M186 116L160 150L164 156L192 122Z\" fill=\"#eb5757\" fill-opacity=\".32\" stroke=\"#eb5757\" stroke-width=\"1.2\"/><path d=\"M192 120H212\" stroke=\"#eb5757\" stroke-width=\"2\"/><text x=\"216\" y=\"124\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Cơ gò má lớn</text><path d=\"M100 120Q96 146 112 160L124 150Q110 136 112 118Z M200 120Q204 146 188 160L176 150Q190 136 188 118Z\" fill=\"#bb6bd9\" fill-opacity=\".32\" stroke=\"#bb6bd9\" stroke-width=\"1.2\"/><path d=\"M202 146H222\" stroke=\"#bb6bd9\" stroke-width=\"2\"/><text x=\"226\" y=\"150\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Cơ cắn (nhai)</text><path d=\"M150 158m-24 0a24 10 0 1 0 48 0a24 10 0 1 0 -48 0\" fill=\"#6fcf97\" fill-opacity=\".32\" stroke=\"#6fcf97\" stroke-width=\"1.2\"/><path d=\"M192 172H212\" stroke=\"#6fcf97\" stroke-width=\"2\"/><text x=\"216\" y=\"176\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Cơ vòng miệng</text><text x=\"4\" y=\"214\" font-size=\"10\" text-anchor=\"start\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">Mỗi cơ kéo da theo một hướng: cười = cơ gò má lớn kéo khoé miệng lên</text></svg>", "xuong-chan": "<svg viewBox=\"0 0 330 196\" role=\"img\" aria-label=\"Ba phần xương bàn chân và vòm chân\" xmlns=\"http://www.w3.org/2000/svg\"><g transform=\"matrix(1 0 0 1.9 0 -124)\"><path d=\"M30 150C40 120 60 110 80 112L120 96L190 108L262 128L300 140C304 148 300 154 292 154H40Z\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\".35\"/><path d=\"M34 148C34 128 48 116 70 118C84 120 88 136 84 150Z\" fill=\"#f2994a\" fill-opacity=\".35\" stroke=\"#f2994a\" vector-effect=\"non-scaling-stroke\"/><path d=\"M70 118L96 98L126 104L112 126Z\" fill=\"#f2994a\" fill-opacity=\".25\" stroke=\"#f2994a\" vector-effect=\"non-scaling-stroke\"/><path d=\"M112 126L126 104L160 110L150 132Z\" fill=\"#f2c94c\" fill-opacity=\".3\" stroke=\"#f2c94c\" vector-effect=\"non-scaling-stroke\"/><path d=\"M150 132L160 110L240 124L236 140Z\" fill=\"#56ccf2\" fill-opacity=\".3\" stroke=\"#56ccf2\" vector-effect=\"non-scaling-stroke\"/><path d=\"M236 140L240 124L300 140L296 150Z\" fill=\"#6fcf97\" fill-opacity=\".35\" stroke=\"#6fcf97\" vector-effect=\"non-scaling-stroke\"/><path d=\"M84 150Q160 118 236 146\" stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"stroke:var(--accent)\" stroke-dasharray=\"5 4\" vector-effect=\"non-scaling-stroke\"/></g><text x=\"160\" y=\"188\" font-size=\"10.5\" text-anchor=\"middle\" style=\"fill:var(--accent);font-family:var(--f-body);font-weight:700\">Vòm bàn chân: chỉ gót và đầu ngón chạm đất</text><rect x=\"26\" y=\"9\" width=\"10\" height=\"10\" rx=\"2\" fill=\"#f2994a\" fill-opacity=\".6\"/><text x=\"40\" y=\"18\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Cổ chân: 7 xương (to nhất là xương gót)</text><rect x=\"26\" y=\"27\" width=\"10\" height=\"10\" rx=\"2\" fill=\"#56ccf2\" fill-opacity=\".6\"/><text x=\"40\" y=\"36\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Bàn chân: 5 xương dài</text><rect x=\"26\" y=\"45\" width=\"10\" height=\"10\" rx=\"2\" fill=\"#6fcf97\" fill-opacity=\".6\"/><text x=\"40\" y=\"54\" font-size=\"11\" text-anchor=\"start\" style=\"fill:currentColor;font-family:var(--f-body);font-weight:700\">Ngón chân: 14 đốt</text></svg>"};
export const GAN = {
 "bai-hh-01": [
  {
   "h": "sac-do",
   "chu": "Thang sắc độ: luyện tay đánh đều từ nhạt tới đậm trước khi vẽ khối."
  }
 ],
 "bai-hh-02": [
  {
   "h": "5-vung",
   "chu": "5 vùng sáng tối trên khối cầu – nhớ thứ tự này cho mọi khối."
  }
 ],
 "bai-hh-03": [
  {
   "h": "khoi-co-ban",
   "chu": "5 khối cơ bản: vẽ cả cạnh khuất (nét đứt) để hình đứng vững."
  },
  {
   "h": "elip",
   "chu": "Quy luật elip cho khối trụ, nón."
  }
 ],
 "bai-hh-04": [
  {
   "h": "lien-hop",
   "chu": "Khối liên hợp: dựng từng khối rồi tìm giao tuyến."
  }
 ],
 "bai-hh-05": [
  {
   "h": "to-hop",
   "chu": "Bố cục tam giác cho tổ hợp khối."
  }
 ],
 "bai-hh-06": [
  {
   "h": "phoi-canh",
   "chu": "Phối cảnh 2 điểm tụ: kiểm tra mọi cạnh ngang."
  },
  {
   "h": "elip",
   "chu": "Elip đúng thì khối trụ mới đứng thẳng."
  }
 ],
 "bai-hh-07": [
  {
   "h": "tinh-vat",
   "chu": "Dựng hình lọ: khung → trục → các mốc elip → nét viền."
  },
  {
   "h": "elip",
   "chu": "Miệng dẹt hơn đáy khi nhìn từ trên xuống."
  }
 ],
 "bai-hh-08": [
  {
   "h": "to-hop",
   "chu": "Sắp tĩnh vật theo bố cục tam giác, vật trước che vật sau."
  }
 ],
 "bai-hh-09": [
  {
   "h": "5-vung",
   "chu": "Nghiên cứu sáng tối: đủ 5 vùng trên từng vật."
  }
 ],
 "bai-hh-10": [
  {
   "h": "ty-le-mat",
   "chu": "Tỷ lệ 3 phần của khuôn mặt (mặt nạ)."
  },
  {
   "h": "tam-giac-mat",
   "chu": "Tam giác mặt."
  }
 ],
 "bai-hh-11": [
  {
   "h": "dau-khoi",
   "chu": "Tượng vạt mảng: đầu là khối hộp, mỗi mặt một sắc độ."
  }
 ],
 "bai-tuong-01": [
  {
   "h": "dau-khoi",
   "chu": "Khối đầu giản lược trước khi vào chi tiết."
  },
  {
   "h": "ty-le-mat",
   "chu": "Tỷ lệ mặt."
  }
 ],
 "bai-tuong-03": [
  {
   "h": "5-vung",
   "chu": "Ánh sáng trên tượng: tìm lõi bóng và phản quang."
  }
 ],
 "bai-hhn-02": [
  {
   "h": "ty-le-mat",
   "chu": "Vị trí mắt, mũi, miệng trên khuôn mặt."
  },
  {
   "h": "co-mat",
   "chu": "Cơ quanh mắt và miệng quyết định nét mặt."
  }
 ],
 "bai-hhn-03": [
  {
   "h": "tam-giac-mat",
   "chu": "Tam giác mặt: 2 mắt + miệng."
  },
  {
   "h": "ty-le-mat",
   "chu": "Kiểm tra tỷ lệ 3 phần."
  }
 ],
 "bai-hhn-01": [
  {
   "h": "ty-le-than",
   "chu": "Tỷ lệ 8 đầu: người đứng cao khoảng 8 lần chiều cao đầu."
  },
  {
   "h": "co-mat",
   "chu": "Các cơ chính trên mặt – biết cơ nằm đâu thì vẽ biểu cảm đúng."
  }
 ],
 "bai-hhn-06": [
  {
   "h": "ty-le-than",
   "chu": "Đặt mốc tỷ lệ trước khi vẽ thân, tay, chân."
  },
  {
   "h": "xuong-chan",
   "chu": "Xương bàn chân giản lược: 3 phần + vòm chân."
  }
 ],
 "bai-hhn-07": [
  {
   "h": "ty-le-than",
   "chu": "Toàn thân: kiểm tra 8 mốc tỷ lệ."
  }
 ],
 "bai-hhn-05": [
  {
   "h": "ty-le-mat",
   "chu": "Chân dung: dựng tỷ lệ trước, chi tiết sau."
  },
  {
   "h": "tam-giac-mat",
   "chu": "Tam giác mặt."
  }
 ],
 "bai-mau-03": [
  {
   "h": "sac-do",
   "chu": "Cầu thang sáng tối: các bậc đều nhau."
  }
 ],
 "bai-mau-04": [
  {
   "h": "ba-mau",
   "chu": "Ba màu \"ông bà\" pha ra màu bậc hai."
  }
 ],
 "bai-mau-05": [
  {
   "h": "vong-12",
   "chu": "Vòng 12 màu."
  }
 ],
 "bai-mau-06": [
  {
   "h": "vong-24",
   "chu": "Vòng 24 màu."
  }
 ],
 "bai-mau-07": [
  {
   "h": "sang-toi",
   "chu": "Làm sáng – làm tối một màu."
  }
 ]
};

// Ảnh tượng lớp tự chụp (Canva "TƯỢNG CHỤP P2"), xếp từ cơ bản lên nâng cao.
export const TUONG = [
 {
  "ma": "mat-na",
  "ten": "Mặt nạ vạt mảng",
  "cap": 1,
  "capTen": "Cơ bản",
  "meo": "Chỉ có mảng phẳng, ranh giới sáng tối rõ: tập chia mảng lớn, không vẽ chi tiết.",
  "anh": [
   "assets/img/tuong/mat-na-1.webp",
   "assets/img/tuong/mat-na-2.webp",
   "assets/img/tuong/mat-na-3.webp"
  ]
 },
 {
  "ma": "doi-mu",
  "ten": "Người đội mũ – mảng khối rõ",
  "cap": 1,
  "capTen": "Cơ bản",
  "meo": "Mũ là khối hộp vạt cạnh: nhìn ra khối đầu như khối hình học trước khi vào mặt.",
  "anh": [
   "assets/img/tuong/doi-mu-1.webp",
   "assets/img/tuong/doi-mu-2.webp",
   "assets/img/tuong/doi-mu-3.webp"
  ]
 },
 {
  "ma": "giai-phau",
  "ten": "Đầu giải phẫu cơ mặt",
  "cap": 1,
  "capTen": "Cơ bản",
  "meo": "Thấy rõ cơ dưới da: hiểu vì sao má, khoé miệng, trán nhô hay lõm.",
  "anh": [
   "assets/img/tuong/giai-phau-1.webp",
   "assets/img/tuong/giai-phau-2.webp",
   "assets/img/tuong/giai-phau-3.webp"
  ]
 },
 {
  "ma": "em-be",
  "ten": "Em bé",
  "cap": 1,
  "capTen": "Cơ bản",
  "meo": "Khối tròn, ít góc cạnh: tập chuyển sắc độ mềm trên mặt cong.",
  "anh": [
   "assets/img/tuong/em-be-1.webp",
   "assets/img/tuong/em-be-2.webp",
   "assets/img/tuong/em-be-3.webp"
  ]
 },
 {
  "ma": "be-gai",
  "ten": "Bé gái tóc ngắn",
  "cap": 2,
  "capTen": "Trung cấp",
  "meo": "Đủ mắt mũi miệng nhưng nét nhẹ; tóc gọn thành một khối.",
  "anh": [
   "assets/img/tuong/be-gai-1.webp",
   "assets/img/tuong/be-gai-2.webp",
   "assets/img/tuong/be-gai-3.webp"
  ]
 },
 {
  "ma": "toc-ven",
  "ten": "Thiếu nữ tóc vén",
  "cap": 2,
  "capTen": "Trung cấp",
  "meo": "Tóc vén sau gáy: tập vẽ tóc thành mảng lớn, giữ khối đầu tròn.",
  "anh": [
   "assets/img/tuong/toc-ven-1.webp",
   "assets/img/tuong/toc-ven-2.webp",
   "assets/img/tuong/toc-ven-3.webp"
  ]
 },
 {
  "ma": "toc-mai",
  "ten": "Nam tóc mái",
  "cap": 2,
  "capTen": "Trung cấp",
  "meo": "Mái tóc lệch tạo bóng đổ lên trán: tập bóng đổ nhỏ.",
  "anh": [
   "assets/img/tuong/toc-mai-1.webp",
   "assets/img/tuong/toc-mai-2.webp",
   "assets/img/tuong/toc-mai-3.webp"
  ]
 },
 {
  "ma": "toc-re",
  "ten": "Nam tóc rẽ ngôi",
  "cap": 2,
  "capTen": "Trung cấp",
  "meo": "Đường ngôi tóc và cấu trúc gò má rõ, cằm có vết vỡ: so tỷ lệ kỹ.",
  "anh": [
   "assets/img/tuong/toc-re-1.webp",
   "assets/img/tuong/toc-re-2.webp",
   "assets/img/tuong/toc-re-3.webp"
  ]
 },
 {
  "ma": "thanh-nien",
  "ten": "Thanh niên bán thân",
  "cap": 2,
  "capTen": "Trung cấp",
  "meo": "Có cổ và vai: tập nối đầu – cổ – thân cho đứng thẳng.",
  "anh": [
   "assets/img/tuong/thanh-nien-1.webp",
   "assets/img/tuong/thanh-nien-2.webp",
   "assets/img/tuong/thanh-nien-3.webp"
  ]
 },
 {
  "ma": "nam-gay",
  "ten": "Nam trung niên má hóp",
  "cap": 2,
  "capTen": "Trung cấp",
  "meo": "Má hóp, xương gò má lộ: tập diễn tả xương dưới da.",
  "anh": [
   "assets/img/tuong/nam-gay-1.webp",
   "assets/img/tuong/nam-gay-2.webp",
   "assets/img/tuong/nam-gay-3.webp"
  ]
 },
 {
  "ma": "toc-bui",
  "ten": "Thiếu nữ tóc búi",
  "cap": 3,
  "capTen": "Nâng cao",
  "meo": "Tóc búi hai bên nhiều lớp: vừa giữ khối lớn vừa có chi tiết.",
  "anh": [
   "assets/img/tuong/toc-bui-1.webp",
   "assets/img/tuong/toc-bui-2.webp",
   "assets/img/tuong/toc-bui-3.webp"
  ]
 },
 {
  "ma": "cu-gia",
  "ten": "Cụ già đeo kính",
  "cap": 3,
  "capTen": "Nâng cao",
  "meo": "Nếp nhăn, kính, râu dài: chọn chi tiết chính, không vẽ đều tay.",
  "anh": [
   "assets/img/tuong/cu-gia-1.webp",
   "assets/img/tuong/cu-gia-2.webp",
   "assets/img/tuong/cu-gia-3.webp"
  ]
 },
 {
  "ma": "david",
  "ten": "Tượng David (đầu)",
  "cap": 3,
  "capTen": "Nâng cao",
  "meo": "Tóc xoăn nhiều lọn, ánh mắt mạnh: tượng thi phổ biến, cần đủ cấp độ sáng tối.",
  "anh": [
   "assets/img/tuong/david-1.webp",
   "assets/img/tuong/david-2.webp",
   "assets/img/tuong/david-3.webp"
  ]
 },
 {
  "ma": "rau",
  "ten": "Đàn ông râu quai nón",
  "cap": 3,
  "capTen": "Nâng cao",
  "meo": "Râu tóc dày, băng đô: chia lọn theo khối, tránh vẽ từng sợi.",
  "anh": [
   "assets/img/tuong/rau-1.webp",
   "assets/img/tuong/rau-2.webp",
   "assets/img/tuong/rau-3.webp"
  ]
 },
 {
  "ma": "ban-than-nu",
  "ten": "Bán thân thiếu nữ quấn khăn",
  "cap": 3,
  "capTen": "Nâng cao",
  "meo": "Vai, ngực, nếp vải và tóc quấn: bài tổng hợp khó nhất.",
  "anh": [
   "assets/img/tuong/ban-than-nu-1.webp",
   "assets/img/tuong/ban-than-nu-2.webp"
  ]
 }
];
export const TUONG_BAI = {"bai-tuong-02": ["mat-na", "doi-mu", "giai-phau", "em-be", "be-gai", "toc-ven", "toc-mai", "toc-re", "thanh-nien", "nam-gay", "toc-bui", "cu-gia", "david", "rau", "ban-than-nu"], "bai-tuong-03": ["david", "thanh-nien", "cu-gia", "toc-bui", "ban-than-nu"], "bai-hh-10": ["mat-na"], "bai-hh-11": ["mat-na", "doi-mu"], "bai-tuong-01": ["giai-phau", "nam-gay"], "bai-hhn-05": ["be-gai", "toc-ven", "thanh-nien"]};

// Thuật ngữ giải phẫu Trung – Việt (để đọc sách vẽ tiếng Trung). Chỉ giữ từ hay gặp khi vẽ người.
export const THUAT_NGU = [
 {
  "nhom": "Xương",
  "trung": "头骨",
  "viet": "Hộp sọ",
  "ve": "Khối đầu: dựng hộp sọ trước, mặt sau"
 },
 {
  "nhom": "Xương",
  "trung": "额骨",
  "viet": "Xương trán",
  "ve": "Mảng trán, chỗ chuyển sáng tối trên trán"
 },
 {
  "nhom": "Xương",
  "trung": "颧骨",
  "viet": "Xương gò má",
  "ve": "Điểm nhô cao nhất bên mặt, bắt sáng"
 },
 {
  "nhom": "Xương",
  "trung": "下颌骨",
  "viet": "Xương hàm dưới",
  "ve": "Góc hàm, đường viền cằm"
 },
 {
  "nhom": "Xương",
  "trung": "锁骨",
  "viet": "Xương đòn",
  "ve": "Hai thanh ngang dưới cổ, nối vai"
 },
 {
  "nhom": "Xương",
  "trung": "胸骨",
  "viet": "Xương ức",
  "ve": "Giữa ngực, nơi hai xương đòn gặp nhau"
 },
 {
  "nhom": "Xương",
  "trung": "肋骨",
  "viet": "Xương sườn",
  "ve": "Khung ngực hình quả trứng"
 },
 {
  "nhom": "Xương",
  "trung": "骨盆",
  "viet": "Khung chậu",
  "ve": "Khối hông, nghiêng ngược chiều vai khi đứng dồn chân"
 },
 {
  "nhom": "Xương",
  "trung": "股骨",
  "viet": "Xương đùi",
  "ve": "Xương dài nhất, hơi chéo vào trong"
 },
 {
  "nhom": "Xương",
  "trung": "髌骨",
  "viet": "Xương bánh chè",
  "ve": "Đầu gối nhìn thấy rõ"
 },
 {
  "nhom": "Xương",
  "trung": "胫骨 / 腓骨",
  "viet": "Xương chày / xương mác",
  "ve": "Cẳng chân; mép xương chày thẳng, sát da"
 },
 {
  "nhom": "Xương",
  "trung": "足骨 / 跟骨",
  "viet": "Xương bàn chân / xương gót",
  "ve": "Bàn chân có vòm, gót là khối to"
 },
 {
  "nhom": "Cơ",
  "trung": "额肌",
  "viet": "Cơ trán",
  "ve": "Nếp nhăn ngang trán khi nhướn mày"
 },
 {
  "nhom": "Cơ",
  "trung": "眼轮匝肌",
  "viet": "Cơ vòng mắt",
  "ve": "Bọng mắt, nếp chân chim"
 },
 {
  "nhom": "Cơ",
  "trung": "颧大肌",
  "viet": "Cơ gò má lớn",
  "ve": "Kéo khoé miệng lên khi cười"
 },
 {
  "nhom": "Cơ",
  "trung": "咬肌",
  "viet": "Cơ cắn (nhai)",
  "ve": "Làm góc hàm vuông, rõ ở nam"
 },
 {
  "nhom": "Cơ",
  "trung": "口轮匝肌",
  "viet": "Cơ vòng miệng",
  "ve": "Khối nhô quanh môi"
 },
 {
  "nhom": "Cơ",
  "trung": "胸锁乳突肌",
  "viet": "Cơ ức đòn chũm",
  "ve": "Hai dải chéo ở cổ khi quay đầu"
 },
 {
  "nhom": "Cơ",
  "trung": "斜方肌",
  "viet": "Cơ thang",
  "ve": "Dốc vai từ cổ xuống"
 },
 {
  "nhom": "Cơ",
  "trung": "三角肌",
  "viet": "Cơ delta (cơ vai)",
  "ve": "Khối tròn đầu vai"
 },
 {
  "nhom": "Cơ",
  "trung": "胸大肌",
  "viet": "Cơ ngực lớn",
  "ve": "Mảng ngực, nối vào cánh tay"
 },
 {
  "nhom": "Cơ",
  "trung": "腹直肌",
  "viet": "Cơ thẳng bụng",
  "ve": "Các múi bụng"
 },
 {
  "nhom": "Cơ",
  "trung": "肱二头肌 / 肱三头肌",
  "viet": "Cơ nhị đầu / tam đầu cánh tay",
  "ve": "Mặt trước / mặt sau bắp tay"
 },
 {
  "nhom": "Cơ",
  "trung": "股四头肌",
  "viet": "Cơ tứ đầu đùi",
  "ve": "Mặt trước đùi"
 },
 {
  "nhom": "Cơ",
  "trung": "腓肠肌",
  "viet": "Cơ bắp chân",
  "ve": "Bắp chân sau, phần to nhất ở trên"
 },
 {
  "nhom": "Cơ",
  "trung": "胫骨前肌",
  "viet": "Cơ chày trước",
  "ve": "Dải cơ phía trước cẳng chân"
 },
 {
  "nhom": "Cơ",
  "trung": "趾长伸肌 / 拇长伸肌",
  "viet": "Cơ duỗi dài các ngón / ngón cái",
  "ve": "Gân nổi trên mu bàn chân"
 },
 {
  "nhom": "Cơ",
  "trung": "跟腱",
  "viet": "Gân gót (gân Asin)",
  "ve": "Dải gân sau cổ chân, nối bắp chân với gót"
 },
 {
  "nhom": "Khác",
  "trung": "肌腱",
  "viet": "Gân",
  "ve": "Phần cơ dạng dải, chỗ cơ bám vào xương"
 },
 {
  "nhom": "Khác",
  "trung": "外侧 / 内侧",
  "viet": "Mặt ngoài / mặt trong",
  "ve": "Hướng nhìn của hình"
 },
 {
  "nhom": "Khác",
  "trung": "完成",
  "viet": "Hoàn chỉnh",
  "ve": "Hình ghép đủ các lớp"
 }
];
export const THUAT_NGU_BAI = ["bai-hhn-01", "bai-hhn-06", "bai-tuong-01"];
