const APP_PAGE_ID = 'd71e949a-f899-4160-8356-42a9e7616acb';

export default class PushNotificationRepository {
  constructor(private conn: any) { }

  async findById(id: string) {
    const result = await this.conn.query(
      'SELECT messages, received_likes, matches FROM push_notification_settings WHERE user_id = $1',
      [id]
    );

    return result.rows[0];
  }
}
