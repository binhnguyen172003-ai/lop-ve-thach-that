// =====================================================================
//  KẾT NỐI FIREBASE — chỉ sửa một lần khi cài đặt (xem HUONG-DAN.md bước 5)
//  Mã này không phải mật khẩu, để công khai là bình thường.
//  Bảo mật thật nằm ở file firestore.rules.
// =====================================================================
export const firebaseConfig = {
  apiKey: "AIzaSyDUsAVac76QHOZ1gqLmcS_C4LLaWCaCZiU",
  authDomain: "lop-ve-thach-that.firebaseapp.com",
  projectId: "lop-ve-thach-that",
  storageBucket: "lop-ve-thach-that.firebasestorage.app",
  messagingSenderId: "789798524611",
  appId: "1:789798524611:web:87ccb378dca349e7e5f476",
  measurementId: "G-HHDG7Q2LXZ"
};

// Gmail giáo viên quản lý web. Phải trùng với Gmail trong firestore.rules.
export const ADMIN_EMAIL = "binhnguyen172003@gmail.com";
