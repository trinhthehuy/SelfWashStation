exports.up = function(knex) {
  return knex.schema.alterTable('agency', (table) => {
    // Sử dụng .alter() để thay đổi thuộc tính của cột đã tồn tại
    // Chèn thêm .defaultTo() nếu bạn muốn các bản ghi cũ nhận giá trị mặc định thay vì báo lỗi
    table.string('identity_number', 20).notNullable().alter();
    table.string('phone', 20).notNullable().alter();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('agency', (table) => {
    // Hoàn tác: Cho phép null trở lại
    table.string('identity_number', 20).nullable().alter();
    table.string('phone', 20).nullable().alter();
  });
};