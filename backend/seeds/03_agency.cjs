/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // 1. Xóa toàn bộ dữ liệu cũ
  await knex('agency').del();

  // 2. Định nghĩa dữ liệu thô
  const rawAgencies = [
    { name: 'Trần Quang Thanh', tax: '3702581234', ward: '544', addr: 'Số 121 Trần Hưng Đạo', tel: '02743822444', mail: 'thanhtq@gmail.com', active: 1 },
    { name: 'Phạm Long Thành', tax: '3603554321', ward: '544', addr: '45 Hùng Vương', tel: '02513501234', mail: 'longthanh@gmail.com', active: 1 },
    { name: 'Phạm Quang Huy', tax: '0101239876', ward: '544', addr: '24 Nguyễn Công Trứ', tel: '02439485761', mail: 'huyph@gmail.com', active: 1 },
    { name: 'Trần Mai Hoa', tax: '1800156789', ward: '544', addr: '240 Trần Phú', tel: '02923888999', mail: 'hoamai@gmail.com', active: 1 },
    { name: 'Lê Thị Hòa', tax: '0303516677', ward: '544', addr: '157 Nguyễn Văn Linh', tel: '02363555666', mail: 'hoalethi@gmail.com', active: 1 },
    { name: 'Trương Văn Nam', tax: '0300588555', ward: '544', addr: '12 Đường Hoàng Hoa Thám', tel: '02837201234', mail: 'namtv@gmail.com', active: 0 },
    { name: 'Phạm Quang Thanh', tax: '0312007474', ward: '567', addr: '405 đường 30/6', tel: '1900636677', mail: 'thanhtp@gmail.com', active: 1 },
    { name: 'Nguyễn Quang Nhật', tax: '0100108624', ward: '567', addr: '15 Quang Trung', tel: '02438691234', mail: 'nhatnq@gmail.com', active: 1 },
    { name: 'Cây xăng Tam Cốc', tax: '3500123789', ward: '567', addr: 'số 1 đường Tam Cốc', tel: '02543852111', mail: 'tamcocpetro@gmail.com', active: 1 },
    { name: 'Tạp hóa Tổng hợp Minh Anh', tax: '8012345678', ward: '567', addr: '59 Xuân Thành', tel: '02993833444', mail: 'minhanh_store@gmail.com', active: 1 }
  ];

  // 3. Format lại dữ liệu cho khớp chính xác với các cột trong Database
  const formattedAgencies = rawAgencies.map((item) => ({
    agency_name: item.name,
    tax_code: item.tax,
    ward_id: item.ward,
    address: item.addr,
    phone: item.tel,
    email: item.mail,
    is_active: item.active,
    // Đảm bảo có cả thời gian tạo và cập nhật nếu bảng yêu cầu
    created_at: knex.fn.now(),
    updated_at: knex.fn.now()
  }));

  // 4. Chèn dữ liệu đã format
  await knex('agency').insert(formattedAgencies);
};