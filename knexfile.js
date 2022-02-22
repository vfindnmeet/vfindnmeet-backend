const config = require('./dist/config/config');
const DB = config.default.DB;

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      user: DB.user,
      database: DB.database,
      password: DB.password
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },
  production: {
    client: 'postgresql',
    connection: DB,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }
};
