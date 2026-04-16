exports.up = function(knex) {
  return knex.schema.alterTable('agency', (table) => {
    // 1. Thêm cột identity_number (thường là string để tránh mất số 0 ở đầu)
    // Bạn có thể thêm .unique() nếu mỗi agency chỉ tương ứng với 1 số định danh duy nhất
    table.string('identity_number', 20).nullable().unique().after('agency_name'); // Điều chỉnh độ dài tùy theo nhu cầu

  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('agency', (table) => {
    // Hoàn tác: Xóa cột identity_number
    table.dropColumn('identity_number');

  });
};