import { currentTimeMs } from '../utils';

export default class RecommendationRepository {
  constructor(private conn: any) { }

  async getForUser(userId: string) {
    const result = await this.conn.query(
      'SELECT * FROM recomendations WHERE user_id = $1 ORDER BY added_at ASC',
      [userId]
    );

    return result.rows;
  }

  async get(userId: string, recommendedUserId: string) {
    const result = await this.conn.query(
      'SELECT * FROM recomendations WHERE user_id = $1 AND recommended_user_id = $2',
      [userId, recommendedUserId]
    );

    return result.rows[0];
  }

  async getSwipedUserIds(userId: string) {
    const result = await this.conn.query(
      'SELECT recommended_user_id FROM recomendations_history WHERE user_id = $1',
      [userId]
    );

    return result.rows.map(({ recommended_user_id }: any) => recommended_user_id);
  }

  async deleteForUser(userId: string) {
    const result = await this.conn.query(
      'DELETE FROM recomendations WHERE user_id = $1',
      [userId]
    );

    return result.rows;
  }

  async delete(userId: string, recommendedUserId: string) {
    const result = await this.conn.query(
      'DELETE FROM recomendations WHERE user_id = $1 AND recommended_user_id = $2',
      [userId, recommendedUserId]
    );

    return result.rows;
  }

  async getCalculationsForUser(userId: string) {
    const result = await this.conn.query(
      'SELECT * FROM recomendation_calculations WHERE user_id = $1',
      [userId]
    );

    return result.rows[0];
  }

  async addRecommendations(userId: string, recommendations: { user_id: string; added_at: number; distanceInKm: number }[]) {
    if (recommendations.length <= 0) return [];

    let c = 2;
    const fields: string[] = [];
    const params: any[] = [];
    for (let i = 0; i < recommendations.length; i++) {
      fields.push(`($1, $${c++}, $${c++}, $${c++})`);
      params.push(
        recommendations[i].user_id,
        recommendations[i].added_at,
        recommendations[i].distanceInKm
      );
    }

    await this.conn.query(
      `INSERT INTO recomendations (user_id, recommended_user_id, added_at, distance_in_km) VALUES ${fields.join(', ')}`,
      [userId, ...params]
    );
  }

  async addRecommendationHistory({ userId, recommendedUserId, addedAt, swipe }: {
    userId: string; recommendedUserId: string; addedAt: number; swipe: string
  }) {
    console.log('xx', userId, recommendedUserId, addedAt, swipe);
    return await this.conn.query(
      'INSERT INTO recomendations_history (user_id, recommended_user_id, added_at, swipe) VALUES ($1, $2, $3, $4)',
      [userId, recommendedUserId, addedAt, swipe]
    );
  }

  async updateRecommendationCalculation({
    userId,
    // calculatedAt,
    lastTimestamp
  }: {
    userId: string;
    // calculatedAt: number;
    lastTimestamp: number;
  }) {
    const lastCalculation = (await this.conn.query(
      'SELECT * FROM recomendation_calculations WHERE user_id = $1',
      [userId]
    )).rows[0];

    if (lastCalculation) {
      return await this.conn.query(
        'UPDATE recomendation_calculations SET calculated_at = $1, last_timestamp = $2 WHERE user_id = $3',
        [
          // lastCalculation?.calculated_at ?? currentTimeMs(),
          currentTimeMs(),
          lastTimestamp ?? lastCalculation.last_timestamp,
          userId
        ]
      );
    } else {
      return await this.conn.query(
        'INSERT INTO recomendation_calculations (user_id, calculated_at, last_timestamp) VALUES ($1, $2, $3)',
        [
          userId,
          currentTimeMs(),
          lastTimestamp
        ]
      );
    }
    //   const query = `
    //    INSERT INTO recomendation_calculations (user_id, calculated_at, last_timestamp)
    //    VALUES ($1, $2, $3)
    //    ON CONFLICT (user_id) DO UPDATE
    //     calculated_at = excluded.calculated_at, last_timestamp = excluded.last_timestamp
    //  `;

    //   return await this.conn.query(
    //     query,
    //     [userId, calculatedAt, lastTimestamp]
    //   );
  }

  // async getExcludedUserIds(userId: string) {
  //   const result = await this.conn.query(
  //     'SELECT exclude_user_id FROM exclude_user_ids WHERE user_id = $1',
  //     [userId]
  //   );

  //   return result.rows.map(({ exclude_user_id }: any) => exclude_user_id);
  // }

  async getLikedUserIds(userId: string) {
    const result = await this.conn.query(
      'SELECT to_user_id FROM likes WHERE from_user_id = $1',
      [userId]
    );

    return result.rows.map(({ to_user_id }: any) => to_user_id);
  }

  async getMatchedUserIds(userId: string) {
    const result = await this.conn.query(
      'SELECT user_one_id, user_two_id FROM matches WHERE user_one_id = $1 OR user_two_id = $1',
      [userId]
    );

    return result.rows.map(({ user_one_id, user_two_id }: any) => user_one_id === userId ? user_two_id : user_one_id);
  }
}
