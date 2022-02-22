import { v4 } from 'uuid';
import { currentTimeMs } from '../utils';

export default class VerificationRequestRepository {
  constructor(private conn: any) {}

  async create({ userId, imageId, status }: { userId: string, imageId: string, status: string }) {
    const id = v4();
    const createdAt = currentTimeMs();

    await this.conn.query(
      'INSERT INTO verification_requests (id, user_id, image_id, status, created_at) VALUES ($1, $2, $3, $4, $5)',
      [id, userId, imageId, status, createdAt]
    );

    return { id, userId, imageId, status, createdAt };
  }

  async deleteForUser(userId: string) {
    await this.conn.query(
      'DELETE FROM verification_requests WHERE user_id = $1',
      [userId]
    );
  }

  async updateStatusForUser(userId: string, status: string) {
    await this.conn.query(
      'UPDATE verification_requests set status = $1 WHERE user_id = $2',
      [status, userId]
    );
  }
}
