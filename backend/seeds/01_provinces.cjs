/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  //await knex('provinces').del();

  // Inserts seed entries
  await knex('provinces').insert([
    { id: 1, province_name: 'Hà Nội', province_code: 'HN' },
    { id: 2, province_name: 'Bắc Ninh', province_code: 'BN' },
    { id: 3, province_name: 'Quảng Ninh', province_code: 'QH' },
    { id: 4, province_name: 'Hải Phòng', province_code: 'HP' },
    { id: 5, province_name: 'Hưng Yên', province_code: 'HY' },
    { id: 6, province_name: 'Ninh Bình', province_code: 'NB' },
    { id: 7, province_name: 'Cao Bằng', province_code: 'CB' },
    { id: 8, province_name: 'Tuyên Quang', province_code: 'TQ' },
    { id: 9, province_name: 'Lào Cai', province_code: 'LI' },
    { id: 10, province_name: 'Thái Nguyên', province_code: 'TN' },
    { id: 11, province_name: 'Lạng Sơn', province_code: 'LS' },
    { id: 12, province_name: 'Phú Thọ', province_code: 'PT' },
    { id: 13, province_name: 'Điện Biên', province_code: 'DB' },
    { id: 14, province_name: 'Lai Châu', province_code: 'LU' },
    { id: 15, province_name: 'Sơn La', province_code: 'SL' },
    { id: 16, province_name: 'Thanh Hóa', province_code: 'TH' },
    { id: 17, province_name: 'Nghệ An', province_code: 'NA' },
    { id: 18, province_name: 'Hà Tĩnh', province_code: 'HT' },
    { id: 19, province_name: 'Quảng Trị', province_code: 'QT' },
    { id: 20, province_name: 'Huế', province_code: 'HU' },
    { id: 21, province_name: 'Đà Nẵng', province_code: 'DN' },
    { id: 22, province_name: 'Quảng Ngãi', province_code: 'QI' },
    { id: 23, province_name: 'Khánh Hòa', province_code: 'KH' },
    { id: 24, province_name: 'Gia Lai', province_code: 'GL' },
    { id: 25, province_name: 'Đắk Lắk', province_code: 'DL' },
    { id: 26, province_name: 'Lâm Đồng', province_code: 'LD' },
    { id: 27, province_name: 'Tây Ninh', province_code: 'TI' },
    { id: 28, province_name: 'Đồng Nai', province_code: 'DI' },
    { id: 29, province_name: 'Hồ Chí Minh', province_code: 'HC' },
    { id: 30, province_name: 'Vĩnh Long', province_code: 'VL' },
    { id: 31, province_name: 'Đồng Tháp', province_code: 'DT' },
    { id: 32, province_name: 'An Giang', province_code: 'AG' },
    { id: 33, province_name: 'Cần Thơ', province_code: 'CT' },
    { id: 34, province_name: 'Cà Mau', province_code: 'CM' }
  ]);
};
