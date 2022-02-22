import LocationService from '../services/LocationService';
import { Controller } from '../core/Controller';
import SessionTokenRepository from '../repositories/SessionTokenRepository';
// import UserRepository from '../repositories/UserRepository';
import OnlineService from '../services/OnlineService';
import * as es from '../services/ESService';

export default class LocationController extends Controller {
  async search(req: any, res: any) {
    const { text } = req.query;

    const locationService = await this.getService('location_service');
    const locations = await locationService.search(text);

    res.json(locations);
  }

  async cities(req: any, res: any) {
    const { countryId } = req.query;

    const locationService = await this.getService('location_service');
    const locations = await locationService.getCitiesForCountry(countryId);

    res.json(locations);
  }

  async updatePosition(req: any, res: any) {
    const token = this.getAuthToken(req);

    const { lat, lon } = req.body;

    const locationService: LocationService = await this.getService('location_service');
    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    // const userRepository: UserRepository = await this.getService('user_repository');
    const onlineService: OnlineService = await this.getService('online_service');
    const con = await this.getConnection();

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    try {
      con.query('BEGIN');

      await Promise.all([
        locationService.setPosition(loggedUserId, { lat, lon }),
        onlineService.updateLastActivity(loggedUserId),
        // userRepository.updateLastActivity(loggedUserId),
        // es.updateLastActiveAtByUserId(es.allIndexes, loggedUserId)
      ]);
      await es.updateLocationAndLastActiveAtByUserId(
        es.allIndexes,
        loggedUserId,
        { lat, lon }
      );

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }
}
