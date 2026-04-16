exports.up = function(knex) {
  return knex.schema.alterTable('agency', (table) => {
    table.integer('province_id').unsigned().nullable().after('id');
    table.foreign('province_id')
         .references('id')
         .inTable('provinces')
         .onDelete('CASCADE') 
         .onUpdate('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('agency', (table) => {
    // Xóa Foreign Key trước, sau đó mới xóa cột
    table.dropForeign('province_id');
    table.dropColumn('province_id');
  });
};