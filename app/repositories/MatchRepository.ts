import { currentTimeMs } from '../utils';

export default class MatchRepository {
  private conn: any;

  constructor(conn: any) {
    this.conn = conn;
  }

  async getMatchesFor(userId: string) {
    const query = `
      SELECT * FROM matches
      WHERE user_one_id = $1 OR user_two_id = $1
    `;

    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async areMatched(userOneId: string, userTwoId: string) {
    const query = `
      SELECT COUNT(*) FROM matches
      WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)
    `;

    const result = await this.conn.query(query, [userOneId, userTwoId]);

    return 0 !== parseInt(result.rows[0].count);
  }

  async unmatch(userOneId: string, userTwoId: string) {
    const query = `
      DELETE FROM matches WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)
    `;

    await this.conn.query(query, [userOneId, userTwoId]);
  }

  async create(userOneId: string, userTwoId: string) {
    const query = `
      INSERT INTO matches (user_one_id, user_two_id, created_at) VALUES ($1, $2, $3)
    `;
    const createdAt = currentTimeMs();
    await this.conn.query(query, [userOneId, userTwoId, createdAt]);

    return { userOneId, userTwoId, createdAt };
  }
}
