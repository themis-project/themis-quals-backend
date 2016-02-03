
exports.up = function(knex, Promise) {
  return knex.schema.createTable('team_task_progresses', (table) => {
    table.increments('id').primary()
    table.integer('teamId').notNullable().references('id').inTable('teams')
    table.integer('taskId').notNullable().references('id').inTable('tasks')
    table.dateTime('createdAt').notNullable()
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('team_task_progresses')
}