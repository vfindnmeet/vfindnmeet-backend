import SessionTokenRepository from '../repositories/SessionTokenRepository';
import { Controller } from '../core/Controller';
import ProfileQuestionsRepository from '../repositories/ProfileQuestionsRepository';

export default class ProfileQuestionsController extends Controller {
  async getAllQuestions(req: any, res: any) {
    const profileQuestionsRepository: ProfileQuestionsRepository = await this.getService('profile_questions_repository');

    const allQuestions = await profileQuestionsRepository.findAllQuestions();
    const questions: { [key: string]: string } = {};
    allQuestions.forEach((question: any) => {
      questions[question.id] = question.text;
    });

    res.json(questions);
  }

  async get(req: any, res: any) {
    const token = this.getAuthToken(req);
    const userId = req.params.id;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const profileQuestionsRepository: ProfileQuestionsRepository = await this.getService('profile_questions_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const questions: { [key: string]: any } = {};
    const answersResult = await profileQuestionsRepository.findUserAnswers(userId);
    const answers = answersResult.map((answer: any) => ({
      category_id: answer.category_id,
      question_id: answer.question_id,
      question_text: answer.question_text,
      answer_text: answer.text
    }));

    if (userId === loggedUserId) {
      const allQuestions = await profileQuestionsRepository.findAllQuestions();

      allQuestions.forEach((question: any) => {
        if (!questions[question.category_id]) questions[question.category_id] = [];

        questions[question.category_id].push({
          question_id: question.id,
          question_text: question.text
        });
      });
    }

    res.json({ answers, questions });
  }

  async save(req: any, res: any) {
    const token = this.getAuthToken(req);
    const { questionId, answerId, answer } = req.body;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const profileQuestionsRepository: ProfileQuestionsRepository = await this.getService('profile_questions_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const result = await profileQuestionsRepository.insertOrUpdate({
      questionId,
      answerId,
      userId: loggedUserId,
      answer
    });

    res.json({
      answerId: result.id,
      questionId: result.questionId,
      answer: result.answer
    });
  }

  async delete(req: any, res: any) {
    const token = this.getAuthToken(req);
    const { answerId } = req.body;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const profileQuestionsRepository: ProfileQuestionsRepository = await this.getService('profile_questions_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await profileQuestionsRepository.delete(answerId, loggedUserId);

    res.status(201).end();
  }
}
