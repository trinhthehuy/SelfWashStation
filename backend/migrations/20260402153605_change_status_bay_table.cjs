exports.up = async function(knex) {
    // 1. Thêm cột mới tạm thời (kiểu integer hoặc boolean)
    await knex.schema.table('wash_bays', (table) => {
        table.integer('bay_status_new').defaultTo(1); 
    });

    // 2. Chuyển đổi dữ liệu từ cột cũ sang cột mới
    // Quy ước: 'active' -> 1, các trạng thái còn lại ('inactive', 'maintenance') -> 0
    await knex('wash_bays').where('bay_status', 'active').update({ bay_status_new: 1 });
    await knex('wash_bays').whereIn('bay_status', ['inactive', 'maintenance']).update({ bay_status_new: 0 });

    // 3. Xóa cột cũ và đổi tên cột mới
    await knex.schema.table('wash_bays', (table) => {
        table.dropColumn('bay_status');
    });

    await knex.schema.table('wash_bays', (table) => {
        table.renameColumn('bay_status_new', 'bay_status');
    });
};

exports.down = async function(knex) {
    // Phục hồi lại trạng thái ENUM nếu muốn rollback
    await knex.schema.table('wash_bays', (table) => {
        table.enum('bay_status_old', ['active', 'inactive', 'maintenance']).defaultTo('active');
    });

    await knex('wash_bays').where('bay_status', 1).update({ bay_status_old: 'active' });
    await knex('wash_bays').where('bay_status', 0).update({ bay_status_old: 'inactive' });

    await knex.schema.table('wash_bays', (table) => {
        table.dropColumn('bay_status');
    });

    await knex.schema.table('wash_bays', (table) => {
        table.renameColumn('bay_status_old', 'bay_status');
    });
};