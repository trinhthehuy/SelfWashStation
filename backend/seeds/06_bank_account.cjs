/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  const tableName = 'bank_account';

  // 1. Danh sách Agency Name tương ứng với ID từ ảnh bạn cung cấp
  const agencyMap = {
    1: 'Trần Quang Tuấn',
    2: 'Phạm Long Thành',
    3: 'Phạm Quang Huy',
    4: 'Trần Mai Hoa',
    5: 'Lê Thị Hòa',
    6: 'Trương Văn Nam',
    7: 'Phạm Quang Thanh',
    8: 'Nguyễn Quang Nhật',
    9: 'Cây xăng Tam Cốc',
    10: 'Tạp hóa Tổng hợp Minh Anh',
    11: 'Trịnh Xuân Thành',
    13: 'Trần Quang Tuấn'
  };

  // 2. Danh sách ngân hàng
  const bankList = [
    { name: 'Ngoại thương Việt Nam', code: 'Vietcombank' },
    { name: 'Việt Nam Thịnh Vượng', code: 'VPBank' },
    { name: 'Kỹ Thương Việt Nam', code: 'Techcombank' },
    { name: 'Đầu tư và Phát triển Việt Nam', code: 'BIDV' },
    { name: 'Quân đội', code: 'MBBank' },
    { name: 'Công Thương Việt Nam', code: 'VietinBank' },
    { name: 'Á Châu', code: 'ACB' },
    { name: 'Sài Gòn – Hà Nội', code: 'SHB' },
    { name: 'Phát triển Thành phố Hồ Chí Minh', code: 'HDBank' },
    { name: 'Quốc tế Việt Nam', code: 'VIB' },
    { name: 'Lộc Phát Việt Nam', code: 'LPBank' },
    { name: 'Đông Nam Á', code: 'SeABank' },
    { name: 'Tiên Phong', code: 'TPBank' },
    { name: 'Hàng hải Việt Nam', code: 'MSB' },
    { name: 'Phương Đông', code: 'OCB' },
    { name: 'Sài Gòn', code: 'SCB' },
    { name: 'Sài Gòn Thương Tín', code: 'Sacombank' },
    { name: 'Xuất Nhập khẩu Việt Nam', code: 'Eximbank' },
    { name: 'Nam Á', code: 'Nam A Bank' },
    { name: 'Quốc Dân', code: 'NCB' },
    { name: 'An Bình', code: 'ABBANK' },
    { name: 'Bắc Á', code: 'Bac A Bank' },
    { name: 'Đại Chúng Việt Nam', code: 'PVCombank' },
    { name: 'Việt Nam Thương Tín', code: 'VietBank' },
    { name: 'Bản Việt', code: 'BVBank' },
    { name: 'Việt Á', code: 'Viet A Bank' },
    { name: 'Thịnh vượng và Phát triển', code: 'PGBank' },
    { name: 'Kiên Long', code: 'Kienlongbank' },
    { name: 'Sài Gòn Công Thương', code: 'Saigonbank' },
    { name: 'Bảo Việt', code: 'Baoviet Bank' }
  ];
  // 3. Xóa dữ liệu cũ
  await knex(tableName).del();

  const seedData = [];

  // 4. Duyệt qua danh sách Agency ID đã định nghĩa
  const agencyIds = Object.keys(agencyMap);

  for (const id of agencyIds) {
    const agencyId = parseInt(id);
    const agencyName = agencyMap[agencyId];
    
    // Mỗi agency tạo ngẫu nhiên 2 tài khoản
    for (let i = 0; i < 2; i++) {
      const randomBank = bankList[Math.floor(Math.random() * bankList.length)];
      
      seedData.push({
        agency_id: agencyId,
        account_number: Math.floor(100000000 + Math.random() * 900000000).toString(),
        bank_name: randomBank.code,
        // Lấy chính xác tên từ agencyMap
        account_name: agencyName, 
        active: 1,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    }
  }

  // 5. Insert vào DB
  await knex(tableName).insert(seedData);
  console.log(`✅ Đã tạo thành công ${seedData.length} tài khoản khớp với tên đại lý.`);
};