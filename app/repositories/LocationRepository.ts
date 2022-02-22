const { translate } = require('../utils');

export default class LocationRepository {
  private conn: any;

  constructor(conn: any) {
    this.conn = conn;
  }

  async findCountriesById(ids: string[]) {
    ids = [...new Set(ids)];
    if (0 === ids.length) return [];

    const query = `SELECT * FROM countries WHERE id IN (${ids.map((_, ix) => `$${ix + 1}`)})`;
    const result = await this.conn.query(query, ids);

    return result.rows;
  }

  async findCitiesById(ids: string[]) {
    if (!ids || 0 === ids.length) return [];

    const query = `SELECT id, name, country_id FROM cities WHERE id IN (${ids.map((_, ix) => `$${ix + 1}`)})`;
    const result = await this.conn.query(query, ids);

    return result.rows;
  }

  async findCityById(id: string) {
    const query = 'SELECT * FROM cities WHERE id = $1';
    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async findCitiesByCountryId(id: string) {
    const query = 'SELECT id, name FROM cities WHERE country_id = $1';
    const result = await this.conn.query(query, [id]);

    return result.rows;
  }

  async findCountryById(id: string) {
    const query = 'SELECT * FROM countries WHERE id = $1';
    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async search(text: string) {
    const chars: string[] = text.trim().toLowerCase().split('');
    chars[0] = text[0].toUpperCase();
    text = chars.join('');
    let translated = translate(text);

    if ('Sofiya' === translated) {
      translated = 'Sofia';
    }

    const query = 'SELECT * FROM cities WHERE name LIKE $1 OR name LIKE $2';
    const result = await this.conn.query(query, [`${text}%`, `${translated}%`]);

    return result.rows;
  }

  async getPosition(userId: string) {
    return (await this.conn.query(`SELECT lat, lon FROM positions WHERE user_id = $1`, [userId])).rows[0];
  }

  async updatePosition(userId: string, location: { lat: number; lon: number; }) {
    if (!location.lat || !location.lon) return;

    return await this.conn.query(
      `INSERT INTO positions (user_id, lat, lon)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id)
        DO UPDATE SET lat = excluded.lat, lon = excluded.lon`,
      [userId, location.lat, location.lon]
    )
  }
}
