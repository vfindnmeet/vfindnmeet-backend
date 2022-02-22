import { Controller } from '../core/Controller';
import SessionTokenRepository from '../repositories/SessionTokenRepository';
import PersonalityService from '../services/PersonalityService';
import BadRequestError from '../errors/BadRequestError';

export default class PersonalityController extends Controller {
  async get(req: any, res: any) {
    const con = await this.getConnection();

    const questions = (await con.query('SELECT id, text, category FROM personality_questions', [])).rows;

    res.json(questions);
  }

  async getPersonality(req: any, res: any) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const con = await this.getConnection();

    const personality = (await con.query('SELECT * FROM personalities WHERE user_id = $1', [loggedUserId])).rows[0];

    res.json({ personality });
    // res.json(questions);
  }

  async calculate(req: any, res: any) {
    const token = this.getAuthToken(req);
    const { answers }: { answers: { [key: string]: number } } = req.body;

    console.log('answers:');
    console.log(JSON.stringify(answers, null, 2));

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const con = await this.getConnection();
    const personalityService = new PersonalityService(con);

    // const updatesCount = await personalityService.getPersonalityUpdatesCount(loggedUserId);
    // if (updatesCount >= PersonalityService.UPDATES_COUNT) {
    //   throw new BadRequestError('Personality updates count reached.');
    // }

    const questions: {
      id: number;
      category: number;
      type: string;
    }[] = (await con.query('SELECT id, category, type FROM personality_questions', [])).rows;

    try {
      con.query('BEGIN');

      const personality = personalityService.calculatePersonality(questions, answers);
      const personalityType = personality.map(({ type }) => type).join('');

      const calculation: any = {};
      personality.forEach(({ type, percentage }) => {
        calculation[type] = percentage;
      });

      // await Promise.all([
      //   con.query(
      //     'DELETE FROM personalities WHERE user_id = $1',
      //     [loggedUserId]
      //   ),
      // ]);

      // await con.query(
      //   'INSERT INTO personalities (user_id, personality, calculation, answers, updates_count, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ' +
      //     'ON CONFLICT (user_id) ' +
      //     'DO UPDATE SET personality = excluded.personality, ' +
      //       'calculation = excluded.calculation, ' +
      //       'answers = excluded.answers, ' +
      //       'updates_count = personalities.updates_count + 1, ' +
      //       'updated_at = excluded.updated_at',
      //   [loggedUserId, personalityType, calculation, answers, 1, currentTimeMs()]
      // );

      await Promise.all([
        // con.query(
        //   'INSERT INTO personalities (user_id, personality, calculation, answers, created_at) VALUES ($1, $2, $3, $4, $5)',
        //   [loggedUserId, personalityType, calculation, answers, currentTimeMs()],
        // ),
        personalityService.updatePersonality({
          userId: loggedUserId, personalityType, calculation, answers
        }),
        con.query(
          'UPDATE user_info SET personality_type = $1 WHERE user_id = $2',
          [personalityType, loggedUserId],
        ),
      ]);

      con.query('COMMIT');

      res.json({
        personality: personalityType,
        calculation
      });
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async setPersonality(req: any, res: any) {
    const token = this.getAuthToken(req);
    const { personality }: { personality: string; } = req.body;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const con = await this.getConnection();
    const personalityService = new PersonalityService(con);

    // const updatesCount = await personalityService.getPersonalityUpdatesCount(loggedUserId);
    // if (updatesCount >= PersonalityService.UPDATES_COUNT) {
    //   throw new BadRequestError('Personality updates count reached.');
    // }

    try {
      con.query('BEGIN');

      await Promise.all([
        // personalityService.setPersonality({
        //   userId: loggedUserId,
        //   personalityType: personality,
        // }),
        personalityService.updatePersonality({
          userId: loggedUserId,
          personalityType: personality,
        }),
        con.query(
          'UPDATE user_info SET personality_type = $1 WHERE user_id = $2',
          [personality, loggedUserId],
        ),
      ]);

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }
}
