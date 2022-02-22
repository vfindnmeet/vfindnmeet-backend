import { v4 } from 'uuid';
import NotFoundError from '../errors/NotFoundError';
import UnauthorizedError from '../errors/UnauthorizedError';
import UserStatus from '../models/enums/UserStatus';
import UserRepository from '../repositories/UserRepository';
import LocationRepository from '../repositories/LocationRepository';
import { currentTimeMs, compareHash } from '../utils';
import * as es from './ESService';

export default class AuthService {
  constructor(
    private conn: any,
    private userRepository: UserRepository,
    private locationRepository: LocationRepository
  ) { }

  async login({
    email,
    password,
    remember,
    isFromMobile,
    pushToken
  }: {
    email: string;
    password: string;
    isFromMobile: boolean;
    remember?: boolean;
    pushToken?: string;
  }) {
    const user = (await this.conn.query(
      'SELECT id, name, email, age, gender, interested_in, status, verification_status, password FROM users WHERE email = $1',
      [email.trim()]
    )).rows[0];

    if (!user) {
      // return loginError;
      throw new NotFoundError();
    }

    const match = await compareHash(password, user.password);
    if (!match) {
      // return loginError;
      throw new UnauthorizedError();
    }

    if (user.status === UserStatus.DELETED) {
      user.status = await this.userRepository.setStatus(user.id, UserStatus.ACTIVE);
      await es.indexUser({
        userId: user.id,
        age: user.age,
        gender: user.gender,
        interestedIn: user.interested_in,
        location: await this.locationRepository.getPosition(user.id)
      });
    }

    const token = await this.createAuthTokenForUser({
      userId: user.id,
      remember,
      isFromMobile,
      pushToken
    });

    return {
      // loggedIn: true,
      token,
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      gender: user.gender,
      verificationStatus: user.verification_status
    };
  }

  // async loginWith(email: string, isFromMobile: boolean) {
  //   const query = `
  //     select id, name, email, gender, status, verification_status, password FROM users WHERE email = $1
  //   `;
  //   const loginError = { loggedIn: false };

  //   const result = await this.conn.query(query, [email.trim()]);
  //   const user = result.rows[0];
  //   if (!user || 'deleted' === user.status) return loginError;

  //   const token = await this.createAuthTokenForUser(user.id, false, isFromMobile);

  //   return {
  //     loggedIn: true,
  //     token,
  //     id: user.id,
  //     name: user.name,
  //     email: user.email,
  //     status: user.status,
  //     gender: user.gender,
  //     verificationStatus: user.verification_status
  //   };
  // }

  async removeAuthToken(token: string) {
    const query = `
      DELETE FROM session_tokens WHERE token = $1
    `;

    return await this.conn.query(query, [token]);
  }

  async createAuthTokenForUser({
    userId,
    isFromMobile,
    remember = true,
    pushToken,
  }: {
    userId: string;
    isFromMobile: boolean;
    remember?: boolean;
    pushToken?: string;
  }) {
    const token = v4();

    await this.conn.query(
      'INSERT INTO session_tokens (user_id, token, remember, is_mobile, push_token, created_at) VALUES($1, $2, $3, $4, $5, $6)',
      [userId, token, remember, isFromMobile, pushToken, currentTimeMs()]
    );

    return token;
  }
}
