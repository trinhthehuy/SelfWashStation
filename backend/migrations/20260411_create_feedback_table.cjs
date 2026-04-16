/**
 * Migration: Tạo bảng feedback (góp ý & phản hồi)
 */
exports.up = async function (knex) {
  await knex.schema.createTable('feedback', (table) => {
    table.increments('id').primary();
    table.integer('agency_id').unsigned().notNullable()
      .references('id').inTable('agency').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('content').notNullable();
    table
      .enum('status', ['pending', 'replied'])
      .notNullable()
      .defaultTo('pending');
    table.text('reply').nullable();
    table.string('replied_by', 100).nullable();   // username của sa/engineer
    table.timestamp('replied_at').nullable();
    table.tinyint('is_read_by_agency').notNullable().defaultTo(0); // 0 = chưa đọc reply
    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('feedback');
};
