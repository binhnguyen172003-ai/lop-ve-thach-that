// =====================================================================
//  KẾT NỐI FIREBASE — chỉ sửa một lần khi cài đặt (xem HUONG-DAN.md bước 5)
//  Mã này không phải mật khẩu, để công khai là bình thường.
//  Bảo mật thật nằm ở file firestore.rules.
// =====================================================================
export const firebaseConfig = {
  apiKey: "DAN_API_KEY_VAO_DAY",
  authDomain: "ten-du-an.firebaseapp.com",
  projectId: "ten-du-an",
  storageBucket: "ten-du-an.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxx"
};

// Gmail giáo viên quản lý web. Phải trùng với Gmail trong firestore.rules.
export const ADMIN_EMAIL = "binhnguyen172003@gmail.com";
