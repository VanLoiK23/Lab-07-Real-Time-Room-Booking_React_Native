# Lab 07 - Modify-Extend-Real-Time-Room-Booking

1. **Room model đã được thêm field nào?**  
   Thêm `floor` để lưu tầng của phòng.

2. **Vì sao sửa floor trên Firebase Console mà app tự cập nhật?**  
   Vì `onSnapshot()` lắng nghe thay đổi từ Firestore và cập nhật UI thông qua React state.

3. **Booking payload đã được thêm field nào?**  
   Thêm `bookedBy` để lưu tên người đặt phòng.

4. **bookedBy được lưu vào Firestore như thế nào?**  
   Lấy tên từ `TextInput`, kiểm tra dữ liệu rồi lưu bằng `addDoc()`.

5. **Building filter hoạt động trên dữ liệu nào?**  
   Lọc danh sách `rooms` từ Firestore theo tòa nhà được chọn.

6. **Extension đã chọn là gì?**  
   Available Only Filter, kết hợp với Available Rooms Counter.

7. **Vì sao Phone B thấy booking do Phone A tạo?**  
   Vì cả hai thiết bị dùng `onSnapshot()` để lắng nghe dữ liệu từ Firestore.

8. **Week 7 đã ngăn double booking chưa? Vì sao?**  
   Chưa.

   Realtime không tự giải quyết race condition. Transaction được xử lý ở Week 8.