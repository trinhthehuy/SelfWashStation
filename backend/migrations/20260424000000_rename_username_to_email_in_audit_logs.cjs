/**
 * Migration: Rename username to email in audit_logs table for consistency.
 */
exports.up = async function(knex) {
  const hasUsername = await knex.schema.hasColumn('audit_logs', 'username');
  const hasEmail = await knex.schema.hasColumn('audit_logs', 'email');
  
  if (hasUsername && !hasEmail) {
    return knex.schema.alterTable('audit_logs', table => {
      table.renameColumn('username', 'email');
    });
  }
};

exports.down = async function(knex) {
  const hasUsername = await knex.schema.hasColumn('audit_logs', 'username');
  const hasEmail = await knex.schema.hasColumn('audit_logs', 'email');

  if (hasEmail && !hasUsername) {
    return knex.schema.alterTable('audit_logs', table => {
      table.renameColumn('email', 'username');
    });
  }
};
