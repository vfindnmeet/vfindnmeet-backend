import AuthService from '../services/AuthService';
import { Controller } from '../core/Controller';
import LocationService from '../services/LocationService';
import OnlineService from '../services/OnlineService';
import * as es from '../services/ESService';
import SessionTokenRepository from '../repositories/SessionTokenRepository';

export default class AuthController extends Controller {
  async login(req: any, res: any) {
    const email = req.body.email;
    const password = req.body.password;
    const lat = req.body.lat;
    const lon = req.body.lon;
    const pushToken = req.body.pushToken;
    const remember = true; //!!req.body.remember;

    const authService: AuthService = await this.getService('auth_service');
    const locationService: LocationService = await this.getService('location_service');
    const onlineService: OnlineService = await this.getService('online_service');
    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      const user = await authService.login({
        email,
        password,
        remember,
        pushToken,
        isFromMobile: this.isFromMobile(req)
      });

      if (user) {
        await Promise.all([
          locationService.setPosition(user.id, { lat, lon }),
          onlineService.updateLastActivity(user.id),
          // userRepository.updateLastActivity(loggedUserId),
          // es.updateLastActiveAtByUserId(es.allIndexes, loggedUserId)
          es.updateLocationAndLastActiveAtByUserId(
            es.allIndexes,
            user.id,
            { lat, lon }
          ).catch(() => { })
        ]);

        // try {
        //   await es.updateLocationAndLastActiveAtByUserId(
        //     es.allIndexes,
        //     user.id,
        //     { lat, lon }
        //   );
        // } catch (e) {

        // }
      }

      con.query('COMMIT');

      res.json(user);
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async setAuthInfo(req: any, res: any) {
    const token = this.getAuthToken(req);

    const lat = req.body.lat;
    const lon = req.body.lon;
    const pushToken = req.body.pushToken;

    const locationService: LocationService = await this.getService('location_service');
    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const onlineService: OnlineService = await this.getService('online_service');
    const con = await this.getConnection();

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    console.log('token', token);
    console.log('loggedUserId', loggedUserId);
    console.log(lat, lon, pushToken);

    try {
      con.query('BEGIN');

      await Promise.all([
        locationService.setPosition(loggedUserId, { lat, lon }),
        onlineService.updateLastActivity(loggedUserId),
        sessionTokenRepository.setPushToken(token, pushToken),
        es.updateLocationAndLastActiveAtByUserId(
          es.allIndexes,
          loggedUserId,
          { lat, lon }
        ).catch(() => { })
      ]);

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  // async loginWith(req: any, res: any) {
  //   let email = req.body.email;
  //   const name = req.body.name;
  //   const accessToken = req.body.token;

  //   const authService: AuthService = await this.getService('auth_service');
  //   const userService: UserService = await this.getService('user_service');
  //   const locationRepository: LocationRepository = await this.getService('location_repository');

  //   const con = await this.getConnection();

  //   try {
  //     const resp = await axios.get(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);

  //     email = (resp.data.email ?? email).trim();
  //   } catch (e: any) {
  //     if (e.response.status === 400 || e.response.status === 401) {
  //       return Controller.sendError(res, e.response.status, 'Invalid token');
  //     } else {
  //       throw e;
  //     }
  //   }

  //   const foundUser = (await con.query('SELECT id, status, gender, interested_in, age FROM users WHERE email = $1', [email])).rows[0];
  //   const exists = !!foundUser;

  //   let result = {};
  //   try {
  //     con.query('BEGIN');

  //     let activated = false;

  //     if (exists) {
  //       if (foundUser.status === UserStatus.DELETED) {
  //         const { activeStatus }: any = await Promise.all([
  //           userService.setStatus(foundUser.id, UserStatus.ACTIVE),
  //           // compatibilityService.scheduleForCompatibilityCalculation(foundUser.id)
  //         ]);
  //         await es.indexUser({
  //           userId: foundUser.id,
  //           age: foundUser.age,
  //           gender: foundUser.gender,
  //           interestedIn: foundUser.interested_in,
  //           location: await locationRepository.getPosition(foundUser.id)
  //         });

  //         foundUser.status = activeStatus;

  //         activated = true;
  //       }

  //       result = await authService.loginWith(
  //         email,
  //         this.isFromMobile(req),
  //       );
  //     } else {
  //       const r = await userService.signUpWith({ email, name, accessToken });
  //       if (!r?.user) {
  //         throw 'Couldn\'t create user';
  //       }

  //       const authToken = await authService.createAuthTokenForUser(
  //         r.user.id,
  //         false,
  //         this.isFromMobile(req)
  //       );
  //       result = { ...r.user, token: authToken };
  //     }
  //     con.query('COMMIT');

  //     // if (activated) calculateCompatibility(foundUser.id);
  //   } catch (e) {
  //     con.query('ROLLBACK');

  //     throw e;
  //   }

  //   res.json(result);
  // }

  async logout(req: any, res: any) {
    const token = this.getAuthToken(req);

    const authService: AuthService = await this.getService('auth_service');
    await authService.removeAuthToken(token);

    res.json();
  }
}
