/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('bank_account', (table) => {
    // 1. id tự tăng (Primary Key)
    table.increments('id').primary();

    // 2. agency_id: Khóa ngoại liên kết với bảng agency
    // Lưu ý: Dùng .unsigned() để khớp với kiểu dữ liệu increments của bảng cha
    table.integer('agency_id').unsigned().notNullable();
    table.foreign('agency_id')
         .references('id')
         .inTable('agency')
         .onDelete('CASCADE'); // Nếu xóa agency, các tài khoản liên quan sẽ bị xóa theo

    // 3. Các cột thông tin tài khoản
    table.string('account_number').notNullable().comment('Số tài khoản: ví dụ 452368974');
    table.string('bank_name').notNullable().comment('Tên ngân hàng: ví dụ Vietcombank');
    table.string('account_name').notNullable().comment('Tên chủ tài khoản: ví dụ Phạm Quang Huy');

    // 4. active: mặc định là 1 (Sử dụng integer hoặc boolean tùy bạn, ở đây dùng tinyint cho chuẩn DB)
    table.integer('active').defaultTo(1).comment('1: Hoạt động, 0: Tạm dừng');

    // 5. Timestamps (Tùy chọn: tạo created_at và updated_at)
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('bank_account');
};