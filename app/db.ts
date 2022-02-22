import { Pool } from 'pg';
import config from './config/config';
import { error } from './core/logger';
import { isProd } from './utils';

class Connection {
  pool: any;

  constructor() {
    this.pool = new Pool(config.DB);
  }

  async handleWithDBClient(handle: any, errorHandle?: any) {
    const client = await this.getClient();

    try {
      await handle(client);
    } catch(err) {
      error(err);
      if (errorHandle) errorHandle();
    } finally {
      client.release();
    }
  }

  async getClient() {
    const con = await this.pool.connect();

    if (1 || isProd()) return con;

    return {
      async query(query: any, params: any) {
        console.log(new Date());
        console.log(query.trim().split(/\s+/).join(' '));

        return con.query(query, params);
      },
      async release() {
        return await con.release();
      }
    };
  }
}

const connection = new Connection();

export const handleWithDBClient = connection.handleWithDBClient.bind(connection);
export const getClient = connection.getClient.bind(connection);

// module.exports = {
//   handleWithDBClient: connection.handleWithDBClient.bind(connection),
//   getClient: connection.getClient.bind(connection)
// };
