import { currentTimeMs } from '../utils';

export default class SearchPreferenceRepository {
  public static MIN_AGE = 18;
  public static MAX_AGE = 70;

  private conn: any;

  constructor(conn: any) {
    this.conn = conn;
  }

  async getForUser(userId: string) {
    const result = await this.conn.query('SELECT * FROM search_preferences WHERE user_id = $1', [userId]);

    return result.rows[0];
  }

  async setForUser(userId: string, { fromAge, toAge, distance, income }: { fromAge: number, toAge: number, distance: number, income: any }) {
    const result = await this.conn.query(
      'UPDATE search_preferences SET from_age = $1, to_age = $2, distance = $3, income = $4 WHERE user_id = $5',
      [fromAge, toAge, distance, income, userId]
    );

    return result.rows[0];
  }

  async create(userId: string, { fromAge, toAge, distance }: { fromAge: number, toAge: number, distance: number }) {
    return await this.conn.query(
      'INSERT INTO search_preferences (user_id, from_age, to_age, distance, created_at) VALUES ($1, $2, $3, $4, $5)',
      [userId, fromAge, toAge, distance, currentTimeMs()]
    );
  }
}
