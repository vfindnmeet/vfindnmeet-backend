import { v4 } from 'uuid';
import { currentTimeMs } from '../utils';

const INTROS_PER_PAGE = 30;

export default class LikeRepository {
  constructor(private conn: any) { }

  async create(fromUserId: string, toUserId: string, message?: string) {
    const id = v4();
    const createdAt = currentTimeMs();
    const seen = false;
    const query = `INSERT INTO likes (id, from_user_id, to_user_id, message, created_at)
      VALUES ($1, $2, $3, $4, $5)`;
    await this.conn.query(query, [id, fromUserId, toUserId, message, createdAt]);

    return { id, fromUserId, toUserId, message, seen, createdAt };
  }

  async incrementLikesCountForUser(userId: string) {
    // const query = 'UPDATE user_stats_count SET likes_count = likes_count + 1 WHERE user_id = $1';
    const query = `INSERT INTO user_stats_count (user_id, likes_count, matches_count)
    VALUES ($1, 1, 0)
    ON CONFLICT (user_id)
    DO UPDATE SET likes_count = user_stats_count.likes_count + 1`;

    await this.conn.query(query, [userId]);
  }

  async decrementLikesCountForUser(userId: string) {
    const query = 'UPDATE user_stats_count SET likes_count = likes_count - 1 WHERE user_id = $1';

    await this.conn.query(query, [userId]);
  }

  async getLikesCount(userId: string) {
    const query = 'SELECT likes_count FROM user_stats_count WHERE user_id = $1';

    return (await this.conn.query(query, [userId])).rows[0]?.likes_count ?? 0;
  }

  // async create(fromUserId: string, toUserId: string, message?: string) {
  //   const id = uuid.v4();
  //   const createdAt = currentTimeMs();
  //   const seen = false;
  //   const query = `INSERT INTO likes (id, from_user_id, to_user_id, message, created_at)
  //     VALUES ($1, $2, $3, $4, $5)`;
  //   await this.conn.query(query, [id, fromUserId, toUserId, message, createdAt]);

  //   return { id, fromUserId, toUserId, message, seen, createdAt };
  // }

  async createMediaMetadata(type: string, mimeType: string) {
    const id = v4();
    const createdAt = currentTimeMs();
    const query = 'INSERT INTO media_metadatas (id, type, mime_type, created_at) VALUES ($1, $2, $3, $4)';
    await this.conn.query(query, [id, type, mimeType, createdAt]);

    return { id, type, createdAt };
  }

  async getMediaMetadata(id: string) {
    const query = 'SELECT * FROM media_metadatas WHERE id = $1';
    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async getForUser(userId: string, page: number) {
    page = page || 1;

    const query = `
      SELECT * FROM likes
      WHERE to_user_id = $1
      ORDER BY created_at DESC
      OFFSET ${(page - 1) * INTROS_PER_PAGE}
      LIMIT ${INTROS_PER_PAGE}
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async getFromUser(userId: string, page: number) {
    page = page || 1;

    const query = `
      SELECT * FROM likes
      WHERE from_user_id = $1
      ORDER BY created_at DESC
      OFFSET ${(page - 1) * INTROS_PER_PAGE}
      LIMIT ${INTROS_PER_PAGE}
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async getLikeFor(fromUserId: string, toUserId: string) {
    return (await this.conn.query(
      'SELECT * FROM likes WHERE from_user_id = $1 AND to_user_id = $2',
      [fromUserId, toUserId])
    ).rows[0];
  }

  // async getIntroById(id: string) {
  //   const query = `
  //     SELECT * FROM intros WHERE id = $1
  //   `;
  //   const result = await this.conn.query(query, [id]);

  //   return result.rows[0];
  // }

  async getById(id: string) {
    const query = 'SELECT * FROM likes WHERE id = $1';

    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async updateMessage(message: string, id: string) {
    const query = 'update likes SET message = $1 WHERE id = $2';

    await this.conn.query(query, [message, id]);
  }

  async delete(id: string) {
    const query = 'DELETE FROM likes WHERE id = $1';

    await this.conn.query(query, [id]);
  }

  async isLiked(fromUserId: string, toUserId: string) {
    const query = `
      SELECT COUNT(*) FROM likes
      WHERE from_user_id = $1 AND to_user_id = $2
    `;

    const result = await this.conn.query(query, [fromUserId, toUserId]);

    return 0 !== parseInt(result.rows[0].count);
  }

  async getByUserIds(fromUserId: string, toUserId: string) {
    const query = `
      SELECT * FROM likes WHERE from_user_id = $1 AND to_user_id = $2
    `;

    const result = await this.conn.query(query, [fromUserId, toUserId]);

    return result.rows[0];
  }
}
