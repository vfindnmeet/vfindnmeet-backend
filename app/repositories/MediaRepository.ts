import { currentTimeMs } from '../utils';
import { v4, V4Options } from 'uuid';

export default class MediaRepository {
  private conn: any;

  constructor(conn: any) {
    this.conn = conn;
  }

  async createMediaMetadata(type: string, mimeType: string, imgId?: string) {
    const id = imgId ?? v4();
    const createdAt = currentTimeMs();
    const query = 'INSERT INTO media_metadatas (id, type, mime_type, created_at) VALUES ($1, $2, $3, $4)';
    await this.conn.query(query, [id, type, mimeType, createdAt]);

    return { id, type, createdAt };
  }

  // async createUserImage(userId: string, imageId: string, position: number) {
  async createUserImage(userId: string, imageId: string, createdAt?: number) {
    createdAt = createdAt ? createdAt : currentTimeMs();
    const query = 'INSERT INTO user_images (user_id, image_id, created_at) VALUES ($1, $2, $3)';
    await this.conn.query(query, [userId, imageId, createdAt]);

    return { userId, imageId, createdAt };
  }

  async getMediaMetadata(id: string) {
    const query = 'SELECT * FROM media_metadatas WHERE id = $1';
    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async getUserImages(userId: string) {
    const query = 'SELECT * FROM user_images WHERE user_id = $1 ORDER BY created_at ASC';
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  // async getUserImage(userId: string, position: number) {
  //   const query = 'SELECT * FROM user_images WHERE user_id = $1 AND position = $2';
  //   const result = await this.conn.query(query, [userId, position]);

  //   return result.rows[0];
  // }

  async deleteMediaMetadata(ids: string[]) {
    if (!Array.isArray(ids) || 0 === ids.length) return;

    const query = `DELETE FROM media_metadatas WHERE id = (${ids.map((_, ix) => `$${ix + 1}`).join(', ')})`;
    await this.conn.query(query, ids);
  }

  async deleteUserImage(userId: string, imageId: string) {
    const query = 'DELETE FROM user_images WHERE user_id = $1 AND image_id = $2';
    await this.conn.query(query, [userId, imageId]);
  }
  // async deleteUserImage(userId: string, position: number) {
  //   const query = 'DELETE FROM user_images WHERE user_id = $1 AND position = $2';
  //   await this.conn.query(query, [userId, position]);
  // }

  // async changeUserImagePosition(userId: string, position: number) {
  //   const query = 'UPDATE user_images SET position = position - 1 WHERE user_id = $1 AND position > $2';
  //   await this.conn.query(query, [userId, position]);
  // }
}
