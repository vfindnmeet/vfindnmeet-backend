import { v4 } from 'uuid';
import QueryBuilder from '../core/query_builder';
import UserStatus from '../models/enums/UserStatus';
import { calculateAge, currentTimeMs } from '../utils';

const USERS_PER_PAGE = 24;

export default class UserRepository {
  private conn: any;

  constructor(conn: any) {
    this.conn = conn;
  }

  static usersPerPage() {
    return USERS_PER_PAGE;
  }

  async create({ email, password }: { email: string, password: string }) {
    return await this._create({ email, password });
  }

  async createWithAccessToken({ email, name, accessToken }: { email: string, name: string, accessToken: string }) {
    return await this._create({ email, name, accessToken });
  }

  async _create({
    email,
    name,
    password,
    accessToken
  }: {
    email: string,
    name?: string,
    password?: string,
    accessToken?: string
  }) {
    const now = currentTimeMs();

    const insertData: any = {
      id: v4(),
      email: email.trim(),
      // name: name ? name.trim() : name,
      password,
      status: 'onboarding',
      created_at: now,
      last_online_at: now,
      is_online: false,
      verified: false,
      images_count: 0,
      // access_token: accessToken
    };
    const fields: any[] = [];
    const params: any[] = [];

    Object.keys(insertData).forEach(key => {
      if (insertData[key] === null || insertData[key] === undefined) return;

      fields.push(key);
      params.push(insertData[key]);
    });

    const query = `
      INSERT INTO users (${fields.join(', ')}) VALUES
        (${fields.map((_, ix) => `$${1 + ix}`)})
    `;

    await this.conn.query(query, params);

    return {
      id: insertData.id,
      status: insertData.status,
      verified: insertData.verified
    };
  }

  async getUserById(userId: string) {
    const query = `
      SELECT id, name, title, description, email, gender, interested_in, age, status, profile_image_id, is_online
      FROM users WHERE id = $1
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows[0];
  }

  async getUserPasswordById(userId: string) {
    const query = 'SELECT password FROM users WHERE id = $1';
    const result = await this.conn.query(query, [userId]);

    return result.rows[0].password;
  }

  async searchUsers(
    page: number,
    {
      gender, interestedIn, cityId, fromAge, toAge, searchingUserId
    }: {
      gender: string, interestedIn: string, cityId: string, fromAge: number, toAge: number, searchingUserId: string
    },
    order: string
  ) {
    const [fields, params] = this.getSearchParams({ gender, interestedIn, cityId, fromAge, toAge, searchingUserId });

    const sort = order === 'newest_member' ? 'ORDER BY created_at DESC' : 'ORDER BY last_online_at DESC';

    // ORDER BY is_online DESC, last_online_at DESC
    const query = `
      SELECT id, name, age, gender, city_id, profile_image_id, verification_status, is_online
      FROM users
      WHERE status = 'active' AND gender = $1 AND interested_in = $2
      AND id != $3
      ${fields.join(' ')}
      ${sort}
      OFFSET ${(page - 1) * USERS_PER_PAGE}
      LIMIT ${USERS_PER_PAGE}
    `;
    const result = await this.conn.query(query, params);

    return result.rows;
  }

  async getUsersCount(
    { gender, interestedIn, cityId, fromAge, toAge }:
      { gender: string, interestedIn: string, cityId: string, fromAge: number, toAge: number }
  ) {
    const [fields, params] = this.getSearchParams({ gender, interestedIn, cityId, fromAge, toAge });

    const query = `
      SELECT COUNT(*)
      FROM users
      WHERE status = 'active' AND gender = $1 AND interested_in = $2 ${fields.join(' ')}
    `;
    const result = await this.conn.query(query, params);

    return parseInt(result.rows[0].count);
  }

  getSearchParams(
    { gender, interestedIn, cityId, fromAge, toAge, searchingUserId }:
      { gender: string, interestedIn: string, cityId: string, fromAge: number, toAge: number, searchingUserId?: string }
  ) {
    const optional: any = { cityId, fromAge, toAge };
    const params = [gender, interestedIn, searchingUserId].filter(i => i);
    const fields: any[] = [];

    Object.keys(optional).forEach((k) => {
      if (optional[k]) {
        params.push(optional[k]);
        let field = '';
        switch (k) {
          case 'cityId':
            field = 'city_id';
            break;
          case 'fromAge':
          case 'toAge':
            field = 'age';
            break;
        }

        fields.push(`AND ${field} ${k === 'fromAge' ? '>=' : (k === 'toAge' ? '<=' : '=')} $${params.length}`);
      }
    });

    return [fields, params];
  }

  async emailExists(email: string) {
    const query = `
      SELECT COUNT(*) FROM users WHERE email = $1
    `;
    const result = await this.conn.query(query, [email]);

    return !!parseInt(result.rows[0].count);
  }

  async getUserProfileById(userId: string) {
    const query = `
      SELECT id, name, title, description, email, age, title, gender,
      interested_in, height, smoking, drinking, body, children, pet,
      profile_image_id, birthday, city_id, verification_status,
      education, employment, interested_in, looking_for_type,
      personality, zodiac, income, is_online
      FROM users
      WHERE id = $1 AND status = 'active'
      ORDER BY created_at ASC
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows[0];
  }

  async getUserInfoById(userId: string) {
    const query = `
      SELECT id, gender, interested_in FROM users WHERE id = $1
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows[0];
  }

  async getUserSettings(userId: string) {
    const query = `
      SELECT id, name, title, description, birthday, email, gender
      FROM users
      WHERE id = $1
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows[0];
  }

  async setCityId(userId: string, cityId: string) {
    const query = `
      UPDATE users SET city_id = $1 WHERE id = $2
    `;
    const result = await this.conn.query(query, [cityId, userId]);

    return result.rows[0];
  }

  async setVerificationStatus(userId: string, status: string) {
    const query = `
      UPDATE users SET verification_status = $1 WHERE id = $2
    `;
    const result = await this.conn.query(query, [status, userId]);

    return result.rows[0];
  }

  async setAccountSettings(userId: string, {
    name, title, description, birthday
  }: { name: string, title: string, description: string, birthday: string }) {
    const query = `
      UPDATE users SET name = $1, title = $2, description = $3, birthday = $4, age = $5
      WHERE id = $6
    `;
    const result = await this.conn.query(query,
      [name, title, description, birthday, calculateAge(new Date(birthday)), userId]
    );

    return result.rows[0];
  }

  async setOnboardingAccountInfo(userId: string, {
    name, birthday, gender, interested_in, city, age
  }: {
    name: string, birthday: string, gender: string, interested_in: string, city: string, age: number
  }) {
    const query = `
      UPDATE users SET city_id = $1, name = $2, birthday = $3, gender = $4, interested_in = $5, age = $6 WHERE id = $7
    `;
    const result = await this.conn.query(query,
      [city, name.trim(), new Date(birthday), gender, interested_in, age, userId]
    );

    return result.rows[0];
  }

  async setProfileSettings(id: string, fields: any[]) {
    const { query, values } = QueryBuilder.update('users', fields, { id });
    if (values.length <= 0) return;

    const result = await this.conn.query(query, values);

    return result.rows[0];
  }

  async setPassword(userId: string, password: string) {
    const query = `
      UPDATE users SET password = $1 WHERE id = $2
    `;
    await this.conn.query(query, [password, userId]);
  }

  async setStatus(userId: string, status: string) {
    const toUpdate: any = { status };
    if (status === UserStatus.DELETED) {
      toUpdate.deleted_at = currentTimeMs();
    }
    // if (status !== UserStatusType.ACTIVE) {
    //   toUpdate.active_at = null;
    // } else if (status === UserStatusType.ACTIVE) {
    //   toUpdate.active_at = currentTimeMs();
    // }
    const fields: any[] = [];
    const params: any[] = [];

    Object.keys(toUpdate).forEach(key => {
      fields.push(key);
      params.push(toUpdate[key]);
    });

    const query = `
      UPDATE users SET ${fields.map((field, ix) => `${field} = $${1 + ix}`)} WHERE id = $${fields.length + 1}
    `;
    await this.conn.query(query, [...params, userId]);

    return status;
  }

  async setUserSettings(userId: string, {
    name, title, description, birthday, email, gender, interested_in, smoking, drinking, height, body, children_status, pet_status
  }: {
    name: string,
    title: string,
    description: string,
    birthday: string,
    email: string,
    gender: string,
    interested_in: string,
    smoking: string,
    drinking: string,
    height: string,
    body: string,
    children_status: string,
    pet_status: string
  }) {
    const query = `
      UPDATE users SET name = $1, title = $2, description = $3, birthday = $4, email = $5, gender = $6,
      interested_in = $7, smoking = $8, drinking = $9, height = $10, body = $11, children_status = $12, pet_status = $13
      WHERE id = $14
    `;
    const result = await this.conn.query(query,
      [name, title, description, birthday, email, gender, interested_in, smoking, drinking, height, body, children_status, pet_status, userId]
    );

    return result.rows[0];
  }

  async setUserProfileImage(userId: string, imageId: string) {
    const query = `
      UPDATE users SET profile_image_id = $1 WHERE id = $2
    `;
    const result = await this.conn.query(query, [imageId, userId]);

    return result.rows[0];
  }

  async setBlurredProfileImage(userId: string, imageId: string) {
    const query = `
      UPDATE users SET blurred_profile_image_id = $1 WHERE id = $2
    `;
    const result = await this.conn.query(query, [imageId, userId]);

    return result.rows[0];
  }

  async getUsersById(userIds: string[]) {
    if (userIds.length === 0) return [];

    const inq = userIds.map((userId, ix) => `$${ix + 1}`);
    const result = await this.conn.query(
      `SELECT id, name, email, age, gender, city_id, profile_image_id FROM users WHERE id IN (${inq.join(', ')})`,
      userIds
    );

    return result.rows;
  }

  async getUsersImage(userIds: string[]) {
    if (userIds.length === 0) return [];

    const inq = userIds.map((_, ix) => `$${ix + 1}`);
    const result = await this.conn.query(
      `SELECT id, name, gender, profile_image_id FROM users WHERE id IN (${inq.join(', ')})`,
      userIds
    );

    return result.rows;
  }

  async findAllIds() {
    const query = `
      SELECT id FROM users
    `;
    const result = await this.conn.query(query);

    return result.rows.map((user: any) => user.id);
  }

  async findInterestedIds({
    gender,
    interested_in,
    timeInterval
  }: {
    gender: string,
    interested_in: string,
    timeInterval: { to: string, from: string }
  }) {
    let whereActiveAt = '';
    const params = [gender, interested_in];

    if (timeInterval?.from) {
      whereActiveAt += ` AND active_at >= $${params.length + 1}`;
      params.push(timeInterval.from);
    }
    if (timeInterval?.to) {
      whereActiveAt += ` AND active_at < $${params.length + 1}`;
      params.push(timeInterval.to);
    }

    const query = `
      SELECT id, active_at FROM users
      WHERE interested_in = $1 AND gender = $2 ${whereActiveAt}
      ORDER BY active_at DESC
      LIMIT 100
    `;
    const result = await this.conn.query(query, params);

    return result.rows;
  }

  async findById(fields: any, id: string) {
    if (typeof fields === 'string') {
      fields = fields.trim().split(/\s+/);
    }
    const query = `SELECT ${fields.join(', ')} FROM users WHERE id = $1`;
    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async findInfoById(fields: any, id: string) {
    if (typeof fields === 'string') {
      fields = fields.trim().split(/\s+/);
    }
    const query = `SELECT ${fields.join(', ')} FROM user_info WHERE user_id = $1`;
    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async findByIds(fields: any[], ids: any[]) {
    if (0 === ids.length) return [];

    const query = `SELECT ${fields.join(', ')} FROM users WHERE id IN (${ids.map((_, ix) => `$${ix + 1}`).join(', ')}) AND status = '${UserStatus.ACTIVE}'`;
    const result = await this.conn.query(query, ids);

    return result.rows;
  }

  async updateDefinedFields(userId: string, fieldsToUpdate: { [key: string]: any }) {
    const fields: { [key: string]: any } = {};

    Object.keys(fieldsToUpdate).forEach(key => {
      if (fieldsToUpdate[key] === undefined) return;

      fields[key] = fieldsToUpdate[key];
    });

    return await this.update(userId, fields);
  }

  async update(userId: string, fieldsToUpdate: any) {
    const fields: any[] = [];
    const values: any[] = [];

    Object.keys(fieldsToUpdate).forEach(field => {
      fields.push(field);
      values.push(fieldsToUpdate[field]);
    });

    const query = `
      UPDATE users
      SET ${fields.map((field, ix) => `${field} = $${ix + 1}`).join(', ')}
      WHERE id = $${fields.length + 1}
    `;
    const result = await this.conn.query(query, [...values, userId]);

    return result.rows[0];
  }

  async updateInfoDefinedFields(userId: string, fieldsToUpdate: { [key: string]: any }) {
    const fields: any[] = [];
    const values: any[] = [];

    console.log('fieldsToUpdate:');
    console.log(JSON.stringify(fieldsToUpdate, null, 2));

    if (fieldsToUpdate.length <= 0) return;

    Object.keys(fieldsToUpdate)
      .filter(key => fieldsToUpdate[key] !== undefined)
      .forEach(field => {
        fields.push(field);
        values.push(!fieldsToUpdate[field] ? null : fieldsToUpdate[field]);
      });

    const query = `
      UPDATE user_info
      SET ${fields.map((field, ix) => `${field} = $${ix + 1}`).join(', ')}
      WHERE user_id = $${fields.length + 1}
    `;
    const result = await this.conn.query(query, [...values, userId]);

    return result.rows[0];
  }

  async incrementMatchesCountForUser(userId: string) {
    // const query = 'UPDATE user_stats_count SET matches_count = matches_count + 1 WHERE user_id = $1';
    const query = `INSERT INTO user_stats_count (user_id, likes_count, matches_count)
    VALUES ($1, 0, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET matches_count = user_stats_count.matches_count + 1`;

    await this.conn.query(query, [userId]);
  }

  async setCompatibilityProcessedAt(userId: string) {
    const query = `
      UPDATE users SET compatibility_processed_at = $1 WHERE id = $2
    `;
    await this.conn.query(query, [currentTimeMs(), userId]);
  }

  async setInterestsProcessedAt(userId: string) {
    const query = `
      UPDATE users SET interests_processed_at = $1 WHERE id = $2
    `;
    await this.conn.query(query, [currentTimeMs(), userId]);
  }

  async incrementImagesCount(userId: string) {
    await this.conn.query(
      'UPDATE users SET images_count = images_count + 1 WHERE id = $1',
      [userId]
    );
  }

  async decrementImagesCount(userId: string) {
    await this.conn.query(
      'UPDATE users SET images_count = images_count - 1 WHERE id = $1',
      [userId]
    );
  }
}
