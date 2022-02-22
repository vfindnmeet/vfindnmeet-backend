import InterestRepository from "../repositories/InterestRepository";
import SessionTokenRepository from "../repositories/SessionTokenRepository";
import { Controller } from '../core/Controller';

export default class InterestController extends Controller {
  async getAll(req: any, res: any) {
    const interestRepository: InterestRepository = await this.getService('hobbie_repository');
    const interests = await interestRepository.findAll();

    res.json(interests);
  }

  async setActivities(req: any, res: any) {
    const token = this.getAuthToken(req);
    const interestIds = req.body.interestIds;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const interestRepository: InterestRepository = await this.getService('hobbie_repository');
    const con = await this.getConnection();

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    try {
      con.query('BEGIN');

      await interestRepository.deleteForUser(loggedUserId)
      await interestRepository.setForUser(loggedUserId, interestIds),

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }
}
