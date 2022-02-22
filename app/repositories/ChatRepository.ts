import { v4 } from 'uuid';
import { currentTimeMs } from '../utils';

export enum GameTypes {
  WOULD_YOU_RATHER = 1,
  ANSWER_QUESTIONS = 2
};

export enum WouldYouRatherGameStage {
  PROMPT = 1,
  ANSWER_SELECTED = 2,
};

export enum QuestionGameStage {
  PROMPT = 1,
  ANSWER_TO = 2,
  ANSWER_FROM = 3
};

export type BaseChatMessage = {
  userId: string;
  chatId: string;
  text?: string;
  imageId?: string;

  gameInfoId?: string;
  // gameType?: number;
  // gameStage?: number;
};

export default class ChatRepository {
  public static readonly MESSAGES_PER_PAGE = 40;

  constructor(private conn: any) { }

  // CHATS

  async getChatsById(chatIds: string[]) {
    if (!chatIds || 0 === chatIds.length) return [];

    const query = `
      SELECT * FROM chats WHERE id IN (${chatIds.map((_, ix) => `$${ix + 1}`)}) ORDER BY last_message_at DESC
    `;
    const result = await this.conn.query(query, chatIds);

    return result.rows;
  }

  async createChat(memberOneId: string, memberTwoId: string) {
    const chatId = v4();

    const query = `
    INSERT INTO chats (id, member_one_id, member_two_id, last_message_at, created_at) VALUES ($1, $2, $3, $4, $5)
    `;

    await this.conn.query(query, [chatId, memberOneId, memberTwoId, null, currentTimeMs()]);

    return chatId;
  }

  async updateLastChatMessage(chatId: string, timestamp: number, messageId: string) {
    const query = 'UPDATE chats SET last_message_at = $1, last_message_id = $2 WHERE id = $3';

    await this.conn.query(query, [timestamp, messageId, chatId]);

    return chatId;
  }

  async updateNotSeenCount(chatId: string, userId: string) {
    const query = `
    INSERT INTO not_seen_chat_messages_count (chat_id, user_id, not_seen_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (chat_id, user_id)
       DO UPDATE SET not_seen_count = not_seen_chat_messages_count.not_seen_count + 1
    `;
    // const query = 'UPDATE not_seen_chat_messages_count SET not_seen_count = not_seen_count + 1 WHERE chat_id = $1 AND user_id = $2';

    await this.conn.query(query, [chatId, userId]);

    return chatId;
  }

  async seeChat(chatId: string, userId: string) {
    const query = 'UPDATE not_seen_chat_messages_count SET not_seen_count = 0 WHERE chat_id = $1 AND user_id = $2';
    // const query = 'UPDATE not_seen_chat_messages_count SET not_seen_count = not_seen_count + 1 WHERE chat_id = $1 AND user_id = $2';

    await this.conn.query(query, [chatId, userId]);

    return chatId;
  }

  async getNotSeenCountForUser(chatIds: string[], userId: string) {
    if (chatIds.length <= 0) return {};

    const query = 'SELECT * FROM not_seen_chat_messages_count WHERE chat_id = any($1)';

    const notSeenMap: { [key: string]: number } = {};

    (await this.conn.query(query, [chatIds])).rows
      .forEach((row: any) => {
        if (userId !== row.user_id) {
          return;
        }

        notSeenMap[row.chat_id] = row.not_seen_count;
      });

    return notSeenMap;
  }

  async getNotSeenMessagesCountPerChatForUser(userId: string) {
    const query = 'SELECT * FROM not_seen_chat_messages_count WHERE user_id = $1';

    const notSeenMap: { [key: string]: number } = {};

    (await this.conn.query(query, [userId])).rows
      .forEach((row: any) => {
        notSeenMap[row.chat_id] = +row.not_seen_count;
      });

    return notSeenMap;
  }

  async getAllNotSeenCount(userId: string) {
    const query = 'SELECT not_seen_count FROM not_seen_chat_messages_count WHERE user_id = $1';

    let notSeenCount: number = 0;

    (await this.conn.query(query, [userId])).rows
      .forEach((row: any) => {
        notSeenCount += row.not_seen_count;
      });

    return notSeenCount;
  }

  // CHAT_MEMBERS

  async getCommonChatId(memberOneId: string, memberTwoId: string) {
    const query = `
    SELECT id
    FROM chats
    WHERE (member_one_id = $1 AND member_two_id = $2) OR (member_one_id = $2 AND member_two_id = $1)
    `;

    const result = await this.conn.query(query, [memberOneId, memberTwoId]);

    return result.rows[0]?.id ?? null;
    // return result.rows.length === 1 ? result.rows[0].chat_id : null;
  }

  async getChatIdsForUser(relId: string) {
    const query = 'SELECT chat_id FROM chats WHERE member_one_id = $1 OR member_two_id = $1';
    const result = await this.conn.query(query, [relId]);

    return result.rows.map((chat: any) => chat.chat_id);
  }

  async getUserChats(relId: string) {
    const query = 'SELECT * FROM chats WHERE member_one_id = $1 OR member_two_id = $1';
    const result = await this.conn.query(query, [relId]);

    return result.rows;
  }

  async getChatMembers(chatId: string) {
    const query = 'SELECT member_one_id, member_two_id FROM chats WHERE id = $1'

    const result = await this.conn.query(query, [chatId]);

    return result.rows[0];
  }

  // CHAT_MESSAGES

  async getChatMessages(chatId: string) {
    const query = `
    SELECT * FROM chat_messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT ${ChatRepository.MESSAGES_PER_PAGE}
    `;

    const result = await this.conn.query(query, [chatId]);

    return result.rows;
  }

  async getChatMessagesByIds(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const query = `SELECT * FROM chat_messages WHERE id IN (${ids.map((_, ix) => `$${ix + 1}`)})`;

    const result = await this.conn.query(query, ids);

    return result.rows;
  }

  async getChatMessagesAfter(chatId: string, createdAt: number) {
    if (!chatId) return [];

    const result = !createdAt ?
      (await this.conn.query(
        'SELECT * FROM chat_messages WHERE chat_id = $1 ORDER BY created_at DESC',
        [chatId]
      )) :
      (await this.conn.query(
        'SELECT * FROM chat_messages WHERE chat_id = $1 AND created_at > $2 ORDER BY created_at DESC',
        [chatId, createdAt]
      ));

    return result.rows;
  }

  async loadChatMessages(chatId: string, ts: number) {
    const query = `
      SELECT * FROM chat_messages
      WHERE chat_id = $1 AND created_at < $2
      ORDER BY created_at DESC
      LIMIT ${ChatRepository.MESSAGES_PER_PAGE}
    `;

    return (await this.conn.query(query, [chatId, ts])).rows;
  }

  async createMessage({
    userId,
    chatId,
    text,
    imageId,
    gameInfoId
  }: BaseChatMessage) {
    const query = `
    INSERT INTO chat_messages (id, member_id, chat_id, text, images_count, game_info_id, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    const message = { id: v4(), userId, chatId, text, createdAt: currentTimeMs() };
    await this.conn.query(
      query,
      [
        message.id,
        userId,
        chatId,
        text,
        !!imageId ? 1 : 0,
        gameInfoId,
        message.createdAt
      ]
    );

    return message;
  }

  async createMessageImage(messageId: string, imageId: string) {
    const id = v4();
    const query = 'INSERT INTO message_medias (id, chat_messages_id, media_id) VALUES ($1, $2, $3)';
    await this.conn.query(query, [id, messageId, imageId]);

    return { id, messageId, imageId };
  }

  async getMessageImages(messageIds: string[]) {
    if (messageIds.length <= 0) return {};

    const query = 'SELECT media_id, chat_messages_id, reported FROM message_medias WHERE chat_messages_id = any($1)';

    const result: {
      [key: string]: {
        mediaId: string;
        reported: boolean
      }
    } = {};

    (await this.conn.query(query, [messageIds])).rows
      .forEach(({ media_id, chat_messages_id, reported }: any) => {
        result[chat_messages_id] = {
          mediaId: media_id,
          reported
        };
      });;

    return result;
  }

  async reportMessageMedia(messageId: string) {
    const query = 'UPDATE message_medias SET reported = true WHERE chat_messages_id = $1';

    await this.conn.query(query, [messageId]);
  }

  // GAMES

  // async createWouldYouRatherGame(messageId: string, questionId: string) {const id = v4();
  //   const query = 'INSERT INTO would_you_rather_games (id, chat_messages_id, question_id) VALUES ($1, $2, $3)';
  //   await this.conn.query(query, [id, messageId, questionId]);

  //   return { id, messageId, questionId };
  // }

  async createGameInfo(gameType: number, gameStage: number, gameId: string) {
    const id = v4();
    const query = 'INSERT INTO message_game_info (id, game_type, game_stage, game_id) VALUES ($1, $2, $3, $4)';
    await this.conn.query(query, [id, gameType, gameStage, gameId]);

    return { id, gameType, gameStage, gameId };
  }

  async getGameInfo(id: string): Promise<{ id: string, game_type: number, game_stage: number, game_id: string }> {
    const query = 'SELECT * FROM message_game_info WHERE id = $1';

    return (await this.conn.query(query, [id])).rows[0];
  }

  async getGameInfos(ids: string[]): Promise<{ id: string, game_type: number, game_stage: number, game_id: string }[]> {
    if (ids.length <= 0) return [];

    const query = 'SELECT * FROM message_game_info WHERE id = any($1)';

    return (await this.conn.query(query, [ids])).rows;
  }

  async createWouldYouRatherGame(questionId: string) {
    const id = v4();
    const query = 'INSERT INTO would_you_rather_games (id, question_id) VALUES ($1, $2)';
    await this.conn.query(query, [id, questionId]);

    return { id, questionId };
  }

  async setWouldYouRatherGameAnswer(id: string, answerId: string) {
    const query = 'UPDATE would_you_rather_games SET answer_id = $1 WHERE id = $2';
    await this.conn.query(query, [answerId, id]);
  }

  async setQuestionGameAnswerTo(id: string, answer: string, questionId: string) {
    const query = 'UPDATE question_games SET answer_to = $1, to_question_id = $2 WHERE id = $3';
    await this.conn.query(query, [answer, questionId, id]);
  }

  async setQuestionGameAnswerFrom(id: string, answer: string) {
    const query = 'UPDATE question_games SET answer_from = $1 WHERE id = $2';
    await this.conn.query(query, [answer, id]);
  }

  async getWouldYouRatherGames(ids: string[]) {
    if (ids.length <= 0) return [];

    const query = 'SELECT id, question_id, answer_id FROM would_you_rather_games WHERE id = any($1)';

    const result: {
      gameId: string;
      questionId: string;
      answerId: string;
    }[] = [];

    (await this.conn.query(query, [ids])).rows
      .forEach(({ id, question_id, answer_id }: any) => {
        result.push({
          gameId: id,
          questionId: question_id,
          answerId: answer_id
        });
      });

    return result;
  }

  // CREATE TABLE question_games (
  //   id UUID PRIMARY KEY,
  //   from_question_id UUID,
  //   to_question_id UUID,
  //   answer_from TEXT,
  //   answer_to TEXT
  // );

  async createQuestionGame(questionId: string) {
    const id = v4();
    const query = 'INSERT INTO question_games (id, from_question_id) VALUES ($1, $2)';
    await this.conn.query(query, [id, questionId]);

    return { id, questionId };
  }

  async getQuestionGames(ids: string[]) {
    if (ids.length <= 0) return [];

    const query = 'SELECT id, from_question_id, to_question_id, answer_from, answer_to FROM question_games WHERE id = any($1)';

    const result: {
      gameId: string;
      fromQuestionId: string;
      toQuestionId: string;
      answerFrom: string;
      answerTo: string;
    }[] = [];

    (await this.conn.query(query, [ids])).rows
      .forEach(({ id, from_question_id, to_question_id, answer_from, answer_to }: any) => {
        result.push({
          gameId: id,
          fromQuestionId: from_question_id,
          toQuestionId: to_question_id,
          answerFrom: answer_from,
          answerTo: answer_to,
        });
      });

    return result;
  }

  // async getWouldYouRatherGames(messageIds: string[]) {
  //   if (messageIds.length <= 0) return {};

  //   const query = 'SELECT id, question_id, answer_id, chat_messages_id FROM would_you_rather_games WHERE chat_messages_id = any($1)';

  //   const result: {
  //     [key: string]: {
  //       gameId: string;
  //       questionId: string;
  //       answerid: string;
  //     }
  //   } = {};

  //   (await this.conn.query(query, [messageIds])).rows
  //     .forEach(({ id, question_id, answer_id, chat_messages_id }: any) => {
  //       result[chat_messages_id] = {
  //         gameId: id,
  //         questionId: question_id,
  //         answerid: answer_id
  //       };
  //     });

  //   return result;
  // }

  async getWouldYouRatherAnswers(questionId: string) {
    const result: {
      questionId: string,
      answers: any[]
    } = {
      questionId,
      answers: []
    };

    (await this.conn.query(
      'SELECT id, text, category FROM would_you_rather_answers WHERE question_id = $1',
      [questionId]
    )).rows
      .map(({ id, text, category }: any) => {
        result.answers.push({
          answerId: id,
          text
        });
      });

    return result;
  }

  async getQuestionGameQuestion(questionId: string) {
    return (await this.conn.query(
      'SELECT id, text, category FROM answer_questions_game_questions WHERE id = $1',
      [questionId]
    )).rows.map(({ id, text, category }: any) => ({
      questionId: id,
      text,
      category
    }))[0];
  }

  async getWouldYouRatherAnswersByQuestionIds(questionIds: string[]) {
    if (questionIds.length <= 0) return {};

    const result: {
      [key: string]: {
        answerId: string;
        text: string;
      }[]
    } = {};

    (await this.conn.query(
      'SELECT id, text, question_id, category FROM would_you_rather_answers WHERE question_id = any($1)',
      [questionIds]
    )).rows
      .map(({ id, text, question_id, category }: any) => {
        if (!result[question_id]) {
          result[question_id] = [];
        }

        result[question_id].push({
          answerId: id,
          text
        });
      });

    return result;
  }

  async getQuestionsByQuestionIds(questionIds: string[]) {
    if (questionIds.length <= 0) return {};

    const result: { [key: string]: string } = {};

    (await this.conn.query(
      'SELECT id, text, category FROM answer_questions_game_questions WHERE id = any($1)',
      [questionIds]
    )).rows
      .map(({ id, text, category }: any) => {
        result[id] = text;
        // if (!result[id]) {
        // }

        // result[id].push({
        //   answerId: id,
        //   text
        // });
      });

    return result;
  }
}
