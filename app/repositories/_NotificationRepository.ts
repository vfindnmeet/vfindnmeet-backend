// import uuid from 'uuid';
// import { currentTimeMs } from '../utils';

// export default class NotificationRepository {
//   private conn: any;

//   constructor(conn: any) {
//     this.conn = conn;
//   }

//   async getAllForUser(userId: string) {
//     const query = 'SELECT * FROM notifications WHERE to_user_id = $1 ORDER BY created_at DESC';
//     const result = await this.conn.query(query, [userId]);

//     return result.rows;
//   }

//   async notSeenCountFor(userId: string) {
//     const query = 'SELECT COUNT(*) FROM notifications WHERE to_user_id = $1 AND seen = false';
//     const result = await this.conn.query(query, [userId]);

//     return parseInt(result.rows[0].count);
//   }

//   async notSeenVisitsCountFor(userId: string) {
//     const query = 'SELECT COUNT(*) FROM notifications WHERE to_user_id = $1 AND type = \'view\' AND seen = false';
//     const result = await this.conn.query(query, [userId]);

//     return parseInt(result.rows[0].count);
//   }

//   async notSeenMatchesCountFor(userId: string) {
//     const query = 'SELECT COUNT(*) FROM notifications WHERE to_user_id = $1 AND type != \'view\' AND seen = false';
//     const result = await this.conn.query(query, [userId]);

//     return parseInt(result.rows[0].count);
//   }

//   async seeNotifs(userId: string, types?: string[]) {
//     if (types) {
//       types = !Array.isArray(types) ? [types] : types;
//       const query = `UPDATE notifications SET seen = true WHERE to_user_id = $1 AND type IN (${types.map((type, ix) => `$${2 + ix}`)})`;
//       return await this.conn.query(query, [userId, ...types]);
//     }

//     const query = 'UPDATE notifications SET seen = true WHERE to_user_id = $1';
//     return await this.conn.query(query, [userId]);
//   }

//   async create(fromUserId: string, toUserId: string, relId: string, type: string) {
//     const id = uuid.v4();
//     const createdAt = currentTimeMs();
//     const relType = 'intro'; //'friend_request'
//     const query = `
//     INSERT INTO notifications (id, from_user_id, to_user_id, type, seen, rel_id, rel_type, created_at) VALUES
//     ($1, $2, $3, $4, false, $5, $6, $7)`;
//     await this.conn.query(query, [id, fromUserId, toUserId, type, relId, relType, createdAt]);

//     return { id, fromUserId, toUserId, type, relId, relType, createdAt };
//   }

//   async delete(relId: string, relType: string) {
//     const query = 'DELETE FROM notifications WHERE rel_id = $1 AND rel_type = $2';
//     await this.conn.query(query, [relId, relType]);
//   }
// }
