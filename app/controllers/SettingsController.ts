import { Controller } from '../core/Controller';
import { compareHash } from '../utils';
import { hash } from '../utils';
import SearchPereferenceValidator from '../models/validators/search_pereference_validator';
import SearchPreferenceRepository from '../repositories/SearchPreferenceRepository';
import UserStatus from '../models/enums/UserStatus';
import SessionTokenRepository from '../repositories/SessionTokenRepository';
import RecommendationService from '../services/RecommendationService';
import UserRepository from '../repositories/UserRepository';
import * as es from '../services/ESService';
import QueryBuilder from '../core/query_builder';

export default class SettingsController extends Controller {
  async getSettings(req: any, res: any) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const {
      name,
      title,
      description,
      birthday,
      email,
      gender,
      interested_in,
      smoking,
      drinking,
      height,
      body,
      children,
      pet,
      employment,
      education,
      personality,
      zodiac,
      income,
      password,
      access_token
    } = await userRepository.findById([
      'name',
      'title',
      'description',
      'birthday',
      'email',
      'gender',
      'interested_in',
      'smoking',
      'drinking',
      'height',
      'body',
      'children',
      'pet',
      'employment',
      'education',
      'personality',
      'zodiac',
      'income',
      'password',
      'access_token'
    ], loggedUserId);

    const accountSettings = {
      name,
      title,
      description,
      birthday,
      email,
      gender,
      interested_in
    };

    const profileSettings: any = {
      smoking,
      drinking,
      height,
      body,
      children,
      pet,
      employment,
      education,
      personality,
      zodiac,
      income
    };

    const deactive = {
      skipPassword: !password && !!access_token
    };

    Object.keys(profileSettings).forEach(key => {
      if (!profileSettings[key]) profileSettings[key] = 'not_tell';
    });

    const settings = { accountSettings, profileSettings, deactive };

    res.json(settings);
  }

  async setAccountSettings(req: any, res: any) {
    const token = this.getAuthToken(req);
    const { name, title, description, birthday, email, gender, interested_in } = req.body;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const user = await userRepository.setAccountSettings(
      loggedUserId,
      { name, title, description, birthday, email, gender, interested_in }
    );

    res.json(user);
  }

  async setProfileSettings(req: any, res: any) {
    const token = this.getAuthToken(req);
    const {
      body,
      children,
      drinking,
      education,
      employment,
      height,
      personality,
      pet,
      smoking,
      zodiac,
      income
    } = req.body;

    const payload: any = {
      body,
      children,
      drinking,
      education,
      employment,
      height,
      personality,
      pet,
      smoking,
      zodiac,
      income
    };

    Object.keys(payload).forEach(key => {
      if ('not_tell' === payload[key]) payload[key] = null;
    });

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const user = await userRepository.setProfileSettings(loggedUserId, payload);

    res.json(user);
  }

  async changePassword(req: any, res: any) {
    const token = this.getAuthToken(req);
    const { password, newPassword } = req.body;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const passwordHash = await userRepository.getUserPasswordById(loggedUserId);

    const matches = await compareHash(password, passwordHash);
    if (!matches) {
      return res.status(400).end();
    }
    const newPasswordHash = await hash(newPassword);
    await userRepository.setPassword(loggedUserId, newPasswordHash);

    res.status(201).end();
  }

  async deactivate(req: any, res: any) {
    const token = this.getAuthToken(req);
    const { password } = req.body;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const user = await userRepository.findById('password status', loggedUserId);

    if (user.status !== UserStatus.ACTIVE) {
      return res.status(201).end();
    }

    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      // if (!user.password && !!user.access_token) {
      if (!user.password) {
        await this._deactive(loggedUserId, token);

        res.status(201).end();
        return;
      }

      const matches = await compareHash(password, user.password);
      if (!matches) {
        return res.status(400).end();
      }

      await this._deactive(loggedUserId, token);

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  private async _deactive(loggedUserId: any, token: any) {
    const userRepository = await this.getService('user_repository');
    const authService = await this.getService('auth_service');

    await Promise.all([
      userRepository.setStatus(loggedUserId, UserStatus.DELETED),
      authService.removeAuthToken(token)
    ]);
    await es.deleteByUserId(es.allIndexes, loggedUserId);
  }

  async setLocation(req: any, res: any) {
    const token = this.getAuthToken(req);
    const { locationId } = req.params;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await userRepository.setCityId(loggedUserId, locationId);

    res.status(201).end();
  }

  async getSearchPreferences(req: any, res: any) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const searchPreferenceRepository: SearchPreferenceRepository = await this.getService('search_preference_repository');
    // const userRepository = await this.getService('user_repository');
    // const locationService = await this.getService('location_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    // const [searchPreferences, { looking_for_type }] = await Promise.all([
    //   searchPreferenceRepository.getForUser(loggedUserId),
    //   userRepository.findById(['looking_for_type'], loggedUserId)
    // ]);
    const searchPreferences = await searchPreferenceRepository.getForUser(loggedUserId);

    // const location = await locationService.getLocationById(searchPreferences.city_id);

    const result = {
      fromAge: searchPreferences?.from_age ?? SearchPreferenceRepository.MIN_AGE,
      toAge: searchPreferences?.to_age ?? SearchPreferenceRepository.MAX_AGE,
      distance: searchPreferences?.distance ?? 60,
      income: searchPreferences?.income,
      // lookingFor: looking_for_type || 0,
      // location: {
      //   cityId: location.id,
      //   name: '',
      //   fullName: location.fullName
      // }
    };

    console.log(result);

    return res.json(result);
  }

  async setSearchPreferences(req: any, res: any) {
    const token = this.getAuthToken(req);
    let { fromAge, toAge, distance, income } = req.body;

    console.log({ fromAge, toAge, distance, income });

    const validator = new SearchPereferenceValidator({ fromAge, toAge, distance });
    if (!validator.validate()) {
      return res.status(400).json(validator.errors);
    }

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const searchPreferenceRepository: SearchPreferenceRepository = await this.getService('search_preference_repository');
    const recommendationService: RecommendationService = await this.getService('recommendation_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      const searchPreferences = await searchPreferenceRepository.getForUser(loggedUserId);
      await searchPreferenceRepository.setForUser(loggedUserId, { fromAge, toAge, distance, income });
      if (
        searchPreferences.fromAge != fromAge ||
        searchPreferences.toAge != toAge ||
        searchPreferences.distance != distance
      ) {
        await recommendationService.calculate(loggedUserId, { fromAge, toAge, distance }, true);
      }

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async setDescription(req: any, res: any) {
    const token = this.getAuthToken(req);
    const { description } = req.body;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await userRepository.update(loggedUserId, { description });

    res.status(201).end();
  }

  async getSettingsInfo(req: any, res: any) {
    const token: string = this.getAuthToken(req);

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const userRepository: UserRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const [user, notif] = await Promise.all([
      userRepository.findById(
        [
          'id',
          'name',
          'age',
          'gender',
          'interested_in',
          'title',
          'birthday'
        ],
        loggedUserId
      ),
      (await this.getConnection()).query('SELECT * FROM push_notification_settings WHERE user_id = $1', [loggedUserId])
    ]);

    res.json({
      user,
      notif: notif.rows[0]
    });
  }

  async setPushNotifSettings(req: any, res: any) {
    const token = this.getAuthToken(req);
    const {
      messages,
      likes,
      matches
    } = req.body;

    const fields: {[key: string]: boolean} = {};
    if (messages !== undefined) fields.messages = messages;
    if (likes !== undefined) fields.received_likes = likes;
    if (matches !== undefined) fields.matches = matches;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const { query, values } = QueryBuilder.update('push_notification_settings', fields, { user_id: loggedUserId });

    if (values.length > 0) {
      await (await this.getConnection()).query(query, values);
    }

    res.status(201).end();
  }
}
