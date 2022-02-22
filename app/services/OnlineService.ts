import { currentTimeMs } from '../utils';

// const onlineUpdates: { [key: string]: any } = {};

// const online = (userId: string) => {
//   if (onlineUpdates[userId]) return false;

//   onlineUpdates[userId] = true;

//   setTimeout(() => delete onlineUpdates[userId], 10000);

//   return true;
// };

export default class OnlineService {
  public static readonly ONLINE_TIME = 5 * 60 * 1000; // 5 min

  constructor(private con: any) { }

  // async updateLastOnline(userId: string) {
  // if (!online(userId)) return;

  // await this.setLastOnline(userId, true);
  // }

  // async setLastOnline(userId: string, isOnline: boolean) {
  //   const lastOnlineAt = currentTimeMs();

  //   await this.con.query(
  //     'UPDATE users SET is_online = $1, last_online_at = $2 WHERE id = $3',
  //     [isOnline, lastOnlineAt, userId]
  //   );
  // }

  public static isOnline(lastActivityAt: number) {
    return Date.now() - +lastActivityAt < OnlineService.ONLINE_TIME;
  }

  async areOnline(userIds: string[]) {
    const activities = await this.getLastActivitiesForUsers(userIds);
    const result: { [key: string]: boolean } = {};

    for (const activity of activities) {
      if (OnlineService.isOnline(activity.last_active_at)) {
        result[activity.user_id] = true;
      }
    }

    return result;
  }

  async isOnline(userId: string) {
    const activity = await this.getLastActivitiesForUser(userId);

    if (!activity) return false;

    return OnlineService.isOnline(activity.last_active_at);
  }

  async updateLastActivity(userId: string) {
    return this.updateLastActiveAt(userId);
    // return await Promise.all([
    //   this.updateLastActiveAt(userId),
    //   es.updateLastActiveAtByUserId(es.allIndexes, userId)
    // ]);
  }

  private async getLastActivitiesForUsers(userIds: string[]) {
    if (userIds.length <= 0) return [];

    return (await this.con.query(
      'SELECT * FROM user_activities WHERE user_id = any($1)',
      [userIds]
    )).rows;
  }

  private async getLastActivitiesForUser(userId: string) {
    return (await this.con.query(
      'SELECT * FROM user_activities WHERE user_id = $1',
      [userId]
    )).rows[0];
  }

  private async updateLastActiveAt(userId: string) {
    return await this.con.query(
      `INSERT INTO user_activities (user_id, last_active_at)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE
          SET last_active_at = excluded.last_active_at
      `,
      [userId, currentTimeMs()]
    );
  }
}
