exports.up = function(knex) {
  return knex.schema.table('stations', function(table) {
    table.decimal('amount_per_unit', 11, 2).notNullable().defaultTo(1000);
    table.integer('op_per_unit').notNullable().defaultTo(60);
    table.integer('foam_per_unit').notNullable().defaultTo(6);
    table.tinyint('enabled', 1).notNullable().defaultTo(1);
  });
};

exports.down = function(knex) {
  return knex.schema.table('stations', function(table) {
    table.dropColumn('amount_per_unit');
    table.dropColumn('op_per_unit');
    table.dropColumn('foam_per_unit');
    table.dropColumn('enabled');
  });
};