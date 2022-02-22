import { Controller } from '../core/Controller';
import SessionTokenRepository from '../repositories/SessionTokenRepository';

export default class NotificationController extends Controller {
  async registerToken(req: any, res: any) {
    const token = this.getAuthToken(req);

    const pushToken = req.body.token;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    await sessionTokenRepository.setPushToken(token, pushToken);

    res.status(201).end();
  }
}
