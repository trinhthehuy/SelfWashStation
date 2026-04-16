/**
 * Migration: Tạo bảng audit_logs — ghi nhật ký thao tác ghi của hệ thống
 */
exports.up = async function (knex) {
  await knex.schema.createTable('audit_logs', (table) => {
    table.bigIncrements('id').primary();

    // Thông tin người thực hiện (snapshot tại thời điểm ghi, không FK để tránh orphan khi user bị xóa)
    table.integer('user_id').unsigned().nullable();
    table.string('username', 64).notNullable();
    table.string('role', 20).notNullable();

    // Loại hành động
    table.string('action', 50).notNullable();

    // Đối tượng bị tác động
    table.string('entity_type', 50).nullable();
    table.integer('entity_id').unsigned().nullable();
    table.string('entity_name', 200).nullable();

    // Chi tiết bổ sung (diff, payload tóm tắt)
    table.json('details').nullable();

    // Địa chỉ IP của người thực hiện
    table.string('ip_address', 45).nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes để tối ưu filter/search
    table.index('created_at', 'idx_audit_created_at');
    table.index('user_id', 'idx_audit_user_id');
    table.index('action', 'idx_audit_action');
    table.index('entity_type', 'idx_audit_entity_type');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('audit_logs');
};
