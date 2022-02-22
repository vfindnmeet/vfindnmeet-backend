import { v4 } from 'uuid';
import { currentTimeMs } from '../utils';

export default class ProfileQuestionsRepository {
  constructor(private conn: any) { }

  async findAllQuestions() {
    const query = 'SELECT * FROM profile_questions';
    const result = await this.conn.query(query);

    return result.rows;
  }

  async findUserAnswers(userId: string[]) {
    // const query = `
    //   SELECT qa.*, q.text AS question_text
    //   FROM profile_question_answers qa
    //   JOIN profile_questions q ON q.id = qa.question_id
    //   WHERE qa.user_id = $1`;
    const query = `
      SELECT id, question_id, text
      FROM profile_question_answers
      WHERE user_id = $1
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async insertOrUpdate({
    questionId,
    answerId,
    userId,
    answer
  }: {
    questionId: string,
    answerId: string,
    userId: string,
    answer: string
  }) {
    if (answerId) {
      await this.conn.query(
        'UPDATE profile_question_answers SET question_id = $1, text = $2 WHERE id = $3',
        [questionId, answer, answerId]
      );

      return {
        id: answerId, questionId, answer, userId
      }
    } else {
      const createdAt = currentTimeMs();
      const id = v4();

      const result = await this.conn.query(
        'INSERT INTO profile_question_answers (id, question_id, user_id, text, created_at) VALUES ($1, $2, $3, $4, $5)',
        [id, questionId, userId, answer, createdAt]
      );

      return {
        id, questionId, userId, answer, createdAt
      }
    }
    // const query = `
    //   INSERT INTO profile_question_answers (question_id, user_id, text, created_at)
    //   VALUES ($1, $2, $3, $4, $5)
    //   ON CONFLICT (question_id, user_id) DO UPDATE
    //         text = excluded.text
    // `;
    // const result = await this.conn.query(query, [questionId, userId, answer, createdAt]);

    // return result.rows;
  }

  async delete(answerId: string, userId: string) {
    await this.conn.query(
      'DELETE FROM profile_question_answers WHERE id = $1 AND user_id = $2',
      [answerId, userId]
    );
  }
}
