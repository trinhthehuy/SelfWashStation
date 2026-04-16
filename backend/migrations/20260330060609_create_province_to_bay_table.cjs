/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // 1. PROVINCES
    if (!await knex.schema.hasTable('provinces')) {
        await knex.schema.createTable('provinces', (table) => {
            table.increments('id').primary();
            table.string('province_name', 100).notNullable().unique();
            table.string('province_code', 10).notNullable().unique();            
        });
    }

    // 2. WARDS
    if (!await knex.schema.hasTable('wards')) {
        await knex.schema.createTable('wards', (table) => {
            table.increments('id').primary();
            table.string('ward_name', 100).notNullable();
            table.string('ward_type', 20).notNullable();
            table.string('ward_code', 100).notNullable().unique();
            table.integer('province_id').unsigned().notNullable();
            table.foreign('province_id').references('id').inTable('provinces');
        });
    }

    // 3. AGENCY (Đã sửa logic if/else)
    if (!await knex.schema.hasTable('agency')) {
        await knex.schema.createTable('agency', (table) => {
            table.increments('id').primary();
            table.string('agency_name', 200).notNullable();
            table.string('tax_code', 20);
            table.integer('ward_id').unsigned().notNullable();
            table.text('address');
            table.string('phone', 20);
            table.string('email', 100);
            table.tinyint('is_active', 1).defaultTo(1);
            table.timestamps(true, true); // Tạo created_at và updated_at tự động chuẩn xác
            table.foreign('ward_id').references('id').inTable('wards');
        });
    }

    // 4. STATIONS
    if (!await knex.schema.hasTable('stations')) {
        await knex.schema.createTable('stations', (table) => {
            table.increments('id').primary();
            table.string('station_name', 20).notNullable().unique();
            table.text('address');
            table.decimal('latitude', 10, 8);
            table.decimal('longitude', 11, 8);
            table.integer('province_id').unsigned().notNullable();
            table.integer('ward_id').unsigned().notNullable();
            table.integer('agency_id').unsigned().notNullable();
            table.string('transfer_prefix', 10).notNullable().unique();
            table.json('bank_account').nullable();
            table.tinyint('is_active', 1).defaultTo(1);
            table.timestamps(true, true);

            table.foreign('province_id').references('id').inTable('provinces');
            table.foreign('ward_id').references('id').inTable('wards');
            table.foreign('agency_id').references('id').inTable('agency');
        });
    }

    // 5. WASH_BAYS
    if (!await knex.schema.hasTable('wash_bays')) {
        await knex.schema.createTable('wash_bays', (table) => {
            table.increments('id').primary();
            table.string('bay_code', 20).notNullable();
            table.enum('bay_status', ['active', 'inactive', 'maintenance']).defaultTo('active');
            table.integer('station_id').unsigned().notNullable();
            table.timestamps(true, true);

            table.foreign('station_id').references('id').inTable('stations').onDelete('CASCADE');
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Xóa theo thứ tự ngược lại để tránh lỗi Khóa ngoại (Foreign Key Constraint)
    await knex.schema.dropTableIfExists('wash_bays');
    await knex.schema.dropTableIfExists('stations');
    await knex.schema.dropTableIfExists('agency');
    await knex.schema.dropTableIfExists('wards');
    await knex.schema.dropTableIfExists('provinces');
};