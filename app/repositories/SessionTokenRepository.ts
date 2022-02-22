export default class SessionTokenRepository {
  private conn: any;

  constructor(conn: any) {
    this.conn = conn;
  }

  async getUserId(token: string) {
    const result = await this.conn.query('SELECT user_id, remember, created_at FROM session_tokens WHERE token = $1', [token]);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return result.rows[0].user_id;
  }

  async getByToken(token: string) {
    const result = await this.conn.query('SELECT user_id, remember, created_at FROM session_tokens WHERE token = $1', [token]);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async getPushTokensForUser(userId: string) {
    return (await this.conn.query(
      'SELECT push_token FROM session_tokens WHERE user_id = $1',
      [userId]
    )).rows
      .map(({ push_token }: any) => push_token);
  }

  async removeByToken(token: string) {
    const query = `
      DELETE FROM session_tokens WHERE token = $1
    `;

    return await this.conn.query(query, [token]);
  }

  async setPushToken(authToken: string, pushToken: string) {
    return await this.conn.query(
      'UPDATE session_tokens SET push_token = $1 WHERE token = $2',
      [pushToken, authToken]
    );
  }
}
