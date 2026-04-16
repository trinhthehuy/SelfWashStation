exports.up = function(knex) {
  return knex.schema.alterTable('agency', (table) => {
    // Chuyển identity_number sang NOT NULL
    // .alter() là bắt buộc để áp dụng thay đổi cho cột đã tồn tại
    table.string('identity_number', 20)
         .notNullable()
         .alter();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('agency', (table) => {
    // Hoàn tác: Cho phép null trở lại
    table.string('identity_number', 20)
         .nullable()
         .alter();
  });
};