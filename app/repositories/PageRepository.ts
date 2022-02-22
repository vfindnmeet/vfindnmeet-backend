const APP_PAGE_ID = 'd71e949a-f899-4160-8356-42a9e7616acb';

export default class PageRepository {
  private conn: any;

  constructor(conn: any) {
    this.conn = conn;
  }

  async findById(fields: string[], id: string) {
    const query = `SELECT ${fields.join(', ')} FROM pages WHERE id = $1`;
    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async findByIds(fields: string[], ids: string[]) {
    if (0 === ids.length) return [];

    const query = `SELECT ${fields.join(', ')} FROM pages WHERE id IN (${ids.map((_, ix) => `$${ix + 1}`).join(', ')})`;
    const result = await this.conn.query(query, ids);

    return result.rows;
  }

  static getAppPageId() {
    return APP_PAGE_ID;
  }
}
