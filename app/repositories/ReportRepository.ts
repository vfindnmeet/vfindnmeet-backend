import { currentTimeMs } from '../utils';

export default class ReportRepository {
  private conn: any;

  constructor(conn: any) {
    this.conn = conn;
  }

  async isReported(reporterId: string, reportedId: string) {
    const query = `
      SELECT COUNT(*) FROM reports
      WHERE reporter_user_id = $1 AND reported_user_id = $2
    `;

    const result = await this.conn.query(query, [reporterId, reportedId]);

    return 0 !== parseInt(result.rows[0].count);
  }

  async hasReported(reporterId: string, reportedIds: string[]) {
    if (!reportedIds || 0 === reportedIds.length) return {};

    const query = `
      SELECT reported_user_id FROM reports
      WHERE reporter_user_id = $1 AND reported_user_id IN (${reportedIds.map((id, ix) => `$${ix + 2}`)})
    `;

    let result: any = await this.conn.query(query, [reporterId, ...reportedIds]);
    result = result.rows.map((i: any) => i.reported_user_id);

    const res: any = {};
    for (const id of reportedIds) {
      res[id] = !!result.filter((i: string) => i === id).length;
    }

    return res;
  }

  async createReport({ fromUserId, toUserId, type, details }: { fromUserId: string, toUserId: string, type: string, details: string }) {
    const createdAt = currentTimeMs();
    const query = 'INSERT INTO reports (reporter_user_id, reported_user_id, type, details, created_at) VALUES ($1, $2, $3, $4, $5)';
    await this.conn.query(query, [fromUserId, toUserId, type, details, createdAt]);

    return { fromUserId, toUserId, type, details, createdAt };
  }

  async createFeedback({ userId, type, details }: { userId: string, type: string, details: string }) {
    const createdAt = currentTimeMs();
    const query = 'INSERT INTO feedbacks (user_id, type, details, created_at) VALUES ($1, $2, $3, $4)';
    await this.conn.query(query, [userId, type, details, createdAt]);

    return { userId, type, details, createdAt };
  }
}
