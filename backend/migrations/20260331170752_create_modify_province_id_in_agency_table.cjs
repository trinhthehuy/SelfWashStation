exports.up = function(knex) {
  return knex.schema.alterTable('agency', (table) => {
    // Sử dụng .alter() ở cuối để báo cho Knex biết đây là lệnh thay đổi cột cũ
    table.integer('province_id')
         .unsigned()
         .notNullable()
         .alter(); 
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('agency', (table) => {
    // Khi rollback thì cho phép null trở lại
    table.integer('province_id')
         .unsigned()
         .nullable()
         .alter();
  });
};