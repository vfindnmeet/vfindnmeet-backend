import { Controller } from '../core/Controller';
import { currentTimeMs } from '../utils';
import SessionTokenRepository from '../repositories/SessionTokenRepository';

export default class FeedbackController extends Controller {
  async add(req: any, res: any) {
    const token = this.getAuthToken(req);
    const { type, details } = req.body;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      await con.query(
        'INSERT INTO feedbacks (user_id, type, details, created_at) VALUES ($1, $2, $3, $3)',
        [loggedUserId, type, details, currentTimeMs()]
      );

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }
}
