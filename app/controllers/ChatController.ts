import ChatRepository, { GameTypes } from '../repositories/ChatRepository';
import { Controller } from '../core/Controller';
import { mapImage, timeAgo } from '../utils';
import MediaService from '../services/media/MediaService';
import UserRepository from '../repositories/UserRepository';
import MatchRepository from '../repositories/MatchRepository';
import SessionTokenRepository from '../repositories/SessionTokenRepository';
import MatchService from '../services/MatchService';
import ChatService from '../services/ChatService';
import UserStatus from '../models/enums/UserStatus';
import OnlineService from '../services/OnlineService';
import { SIZE_SMALL } from '../services/media/BaseMediaService';

const generateMessage = (message: any) => ({
  id: message.id,
  text: message.text,
  chatId: message.chat_id,
  userId: message.member_id,
  hasImage: message.images_count > 0,
  gameInfoId: message.game_info_id,
  // userName: sender.name,
  createdAt: message.created_at,
});

type UserChat = {
  chatId: string;
  lastMessageId: string;
  lastMessageAt: number;
}

export default class ChatController extends Controller {
  async members(req: any, res: any) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const chatRepository: ChatRepository = await this.getService('chat_repository');
    const userRepository: UserRepository = await this.getService('user_repository');
    const matchService: MatchService = await this.getService('match_service');
    const onlineService: OnlineService = await this.getService('online_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const userIds: string[] = await matchService.matchIds(loggedUserId);
    const chats = await chatRepository.getUserChats(loggedUserId);
    const lastMessageIds: string[] = chats.map(({ last_message_id }: any) => last_message_id);
    const chatIds = chats.map(({ id }: any) => id);
    const userChats: { [key: string]: UserChat } = {};

    const messages: any[] = (await chatRepository.getChatMessagesByIds(lastMessageIds)).map(generateMessage);
    const notSeenMap = await chatRepository.getNotSeenCountForUser(chatIds, loggedUserId);
    const online = await onlineService.areOnline(userIds);

    const gameInfoIds = messages.map(({ gameInfoId }: any) => gameInfoId).filter(Boolean);

    const gameInfos = await chatRepository.getGameInfos(gameInfoIds);

    chats.forEach((chat: any) => {
      const otherChatMemberId = chat.member_one_id == loggedUserId ? chat.member_two_id : chat.member_one_id;
      userChats[otherChatMemberId] = {
        chatId: chat.id,
        lastMessageId: chat.last_message_id,
        lastMessageAt: chat.last_message_at
      }
    });

    const users = await userRepository.findByIds(
      ['id', 'name', 'gender', 'profile_image_id', 'verification_status', 'is_online', 'status'],
      userIds
    );

    const result = users.map((user: any) => {
      if (user.status !== UserStatus.ACTIVE) {
        return {
          id: user.id,
          gender: user.gender,
          status: user.status
        };
      }

      const result: { [key: string]: any } = {
        ...user,
        isOnline: online[user.id] ?? false,
        profileImage: MediaService.getProfileImagePath(user),
        showImage: true,
        showProfileLink: true
      };

      const chat = userChats[user.id];
      if (chat) {
        const message = messages.find((message: any) => message.id === chat.lastMessageId);
        result.lastMessage = message;
        result.chatId = chat.chatId;
        result.lastMessageAt = chat.lastMessageAt;
        result.notSeen = !!notSeenMap[chat.chatId];

        if (message?.gameInfoId) {
          const gameInfo = gameInfos.find(({ id }) => id === message.gameInfoId);
          // result.lastMessage.gameType = gameInfo?.game_type;
          // result.lastMessage.gameStage = gameInfo?.game_stage;
          result.lastMessage.game = {
            gameType: gameInfo?.game_type,
            gameStage: gameInfo?.game_stage
          };
        }
      }

      return result;
      // user.profileImage = MediaService.getProfileImagePath(user);

      // const chat = userChats[user.id];

      // user.showImage = true;
      // user.showProfileLink = true;

      // if (chat) {
      //   const message = messages.find((message: any) => message.id === chat.lastMessageId);
      //   user.lastMessage = message;
      //   user.chatId = chat.chatId;
      //   user.lastMessageAt = chat.lastMessageAt;
      //   user.notSeen = !!notSeenMap[chat.chatId];
      // }

      // return user;
    });

    // console.log('RESULT:');
    // console.log(JSON.stringify(result, null, 2));

    res.json(
      result
        .sort((a: any, b: any) => {
          const ta = a.lastMessageAt ?? 0;
          const tb = b.lastMessageAt ?? 0;

          return ta < tb ? 1 : ta > tb ? -1 : 0;
        })
    );
  }

  async get(req: any, res: any) {
    const token = this.getAuthToken(req);
    const userId = req.params.userId;
    // const chatId = req.params.chatId;

    const chatRepository: ChatRepository = await this.getService('chat_repository');
    const chatService: ChatService = await this.getService('chat_service');
    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const matchRepository: MatchRepository = await this.getService('match_repository');
    const userRepository = await this.getService('user_repository');
    const onlineService: OnlineService = await this.getService('online_service');
    const con = await this.getConnection();

    const t1 = Date.now();

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    try {
      con.query('BEGIN');

      // console.log(loggedUserId, userId);

      const matched: boolean = await matchRepository.areMatched(loggedUserId, userId);
      if (!matched) {
        return res.status(400).end();
      }

      const [chatId, user] = await Promise.all([
        chatService.createChatIfNotExists(loggedUserId, userId),
        userRepository.findById([
          'id', 'name', 'profile_image_id', 'verification_status', 'is_online', 'status'
        ], userId)
      ]);
      if (user.status !== UserStatus.ACTIVE) {
        return res.status(404).end();
      }

      await chatService.seeChatMessages(chatId, loggedUserId);

      const messages: any[] = (await chatRepository.getChatMessages(chatId))
        .reverse()
        .map(generateMessage);

      user.profileImage = MediaService.getProfileImagePath(user, SIZE_SMALL);
      user.isOnline = (await onlineService.isOnline(user.id)) ?? false;

      con.query('COMMIT');

      res.json({
        chatId,
        user,
        messages: await this.messagesData(messages, chatId)
      });

      console.log('time:', Date.now() - t1);
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async loadOlder(req: any, res: any) {
    const token = this.getAuthToken(req);
    const userId = req.params.userId;
    const ts = req.query.t;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const matchRepository: MatchRepository = await this.getService('match_repository');
    const chatRepository: ChatRepository = await this.getService('chat_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const matched: boolean = await matchRepository.areMatched(loggedUserId, userId);
    if (!matched) {
      return res.status(403).end();
    }

    const chatId = await chatRepository.getCommonChatId(loggedUserId, userId);
    // const isChatMember = await chatRepository.isChatMember(chatId, loggedUserId);
    // if (!isChatMember) {
    //   return res.status(403).end();
    // }

    console.log(`ts:${ts} chatId:${chatId}`);
    if (!chatId) {
      return res.json({
        messages: []
      });
    }

    const messages = (await chatRepository.loadChatMessages(chatId, ts))
      .reverse()
      .map(generateMessage);

    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      lastMessage.postedAgo = timeAgo(lastMessage.created_at);
    }

    res.json({
      messages: await this.messagesData(messages, chatId),
      // hasMoreMsgs: ChatRepository.messagesPerPage() === messages.length
    });
  }

  private async messagesData(messages: any[], chatId: string) {
    if (messages.length <= 0) return [];

    // const token = this.getAuthToken(req);
    // const userId = req.params.userId;
    // const chatId = req.params.chatId;

    const chatRepository: ChatRepository = await this.getService('chat_repository');
    const userRepository: UserRepository = await this.getService('user_repository');

    const messageImages = await chatRepository.getMessageImages(messages.map(({ id }: any) => id));



    const gameInfoIds = messages.map(({ gameInfoId }: any) => gameInfoId).filter(Boolean);

    const gameInfos = await chatRepository.getGameInfos(gameInfoIds);
    const games = await chatRepository.getWouldYouRatherGames(
      gameInfos.filter(gameInfo => gameInfo.game_type == GameTypes.WOULD_YOU_RATHER).map(gameInfo => gameInfo.game_id)
    );
    const questionGames = await chatRepository.getQuestionGames(
      gameInfos.filter(gameInfo => gameInfo.game_type == GameTypes.ANSWER_QUESTIONS).map(gameInfo => gameInfo.game_id)
    );
    const wurAnswers = await chatRepository.getWouldYouRatherAnswersByQuestionIds(games.map(game => game.questionId));
    const qIds: any[] = [];
    questionGames.forEach(i => {
      qIds.push(i.fromQuestionId, i.toQuestionId);
    })
    const questionTexts = await chatRepository.getQuestionsByQuestionIds(qIds.filter(Boolean));

    console.log(JSON.stringify(messages, null, 2));
    console.log('gameInfos', gameInfos);


    const users: { [key: string]: any } = {};
    const chat: { member_one_id: string, member_two_id: string } = (await chatRepository.getChatMembers(chatId));
    (await userRepository.findByIds(
      ['id', 'profile_image_id', 'gender'],
      [chat.member_one_id, chat.member_two_id].filter(Boolean)
    )).forEach((user: any) => {
      users[user.id] = user;
    });

    return messages.map((message: any) => {
      const image = messageImages[message.id];
      if (image) {
        message.image = mapImage(image.mediaId);
        message.imageReported = image.reported;
      }

      const gameInfo = gameInfos.find(({ id }: any) => id === message.gameInfoId);
      console.log('GAME INFO', gameInfo);
      if (gameInfo) {
        message.game = {
          gameInfoId: gameInfo.id,
          gameType: gameInfo.game_type,
          gameStage: gameInfo.game_stage,
          gameInfo: {}
        };

        message.profileImage = MediaService.getProfileImagePath(users[message.userId], SIZE_SMALL);

        if (gameInfo.game_type == GameTypes.WOULD_YOU_RATHER) {
          const game = games.find(i => i.gameId === gameInfo.game_id);
          if (game) {
            message.game.gameInfo.questionId = game.questionId;
            message.game.gameData = {
              answerId: game.answerId
            }
            message.game.gameInfo.answers = wurAnswers[game.questionId];
          }
        } else if (gameInfo.game_type == GameTypes.ANSWER_QUESTIONS) {
          const game = questionGames.find(i => i.gameId === gameInfo.game_id);
          if (game) {
            // const currentMessageUserId = message.userId === chat.member_one_id ? chat.member_one_id : chat.member_two_id;
            // const otherMessageUserId = message.userId !== chat.member_one_id ? chat.member_one_id : chat.member_two_id;

            message.game.gameInfo.questionId = game.fromQuestionId;
            message.game.gameData = {
              ...game,
              // mupi: MediaService.getProfileImagePath(users[currentMessageUserId], MediaService.SIZE_SMALL),
              // oupi: MediaService.getProfileImagePath(users[otherMessageUserId], MediaService.SIZE_SMALL),
              // mug: users[currentMessageUserId].gender,
              // oug: users[otherMessageUserId].gender,
            };
            message.game.gameInfo.questions = {
              [game.fromQuestionId]: questionTexts[game.fromQuestionId],
              [game.toQuestionId]: questionTexts[game.toQuestionId],
            };
          }
        }
      }

      const currentMessageUserId = message.userId === chat.member_one_id ? chat.member_one_id : chat.member_two_id;
      const otherMessageUserId = message.userId !== chat.member_one_id ? chat.member_one_id : chat.member_two_id;

      return {
        ...message,
        mupi: MediaService.getProfileImagePath(users[currentMessageUserId], SIZE_SMALL),
        oupi: MediaService.getProfileImagePath(users[otherMessageUserId], SIZE_SMALL),
        mug: users[currentMessageUserId].gender,
        oug: users[otherMessageUserId].gender,
      };
    });
  }

  async getMessagesAfterTs(req: any, res: any) {
    const token = this.getAuthToken(req);
    const userId = req.params.userId;
    // const chatId = req.query.chatId;
    const afterTs = req.query.after;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    // const matchRepository: MatchRepository = await this.getService('match_repository');
    const chatRepository: ChatRepository = await this.getService('chat_repository');
    const chatService: ChatService = await this.getService('chat_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const chatId = await chatRepository.getCommonChatId(loggedUserId, userId);
    const messages = (await chatService.getMessagesAfter(chatId, afterTs))
      .map(generateMessage);

    res.json({ messages });
  }

  async getNotSeenMessagesPerChat(req: any, res: any) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const chatRepository: ChatRepository = await this.getService('chat_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const notSeenMessagesMap = await chatRepository.getNotSeenMessagesCountPerChatForUser(loggedUserId);

    res.json(notSeenMessagesMap);
  }

  async addMessage(req: any, res: any) {
    const token = this.getAuthToken(req);

    const chatId = req.body.chatId;
    const isNew = req.body.isNew;
    const text = req.body.text;
    const imageId = req.body.imageId;

    const gameInfoId = req.body.gameInfoId;
    const gameType = req.body.gameType;
    const gameStage = req.body.gameStage;
    const questionId = req.body.questionId;
    const answerId = req.body.answerId;
    const answer = req.body.answer;

    /*
    WUR prompt:
    gameType: 0
    gameStage: 0
    questionId: <id>

    WUR answer choose:
    // gameType: 0
    gameStage: 1
    gameInfoId: <uuid>
    answerId: <id>

    */

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    // const chatRepository: ChatRepository = await this.getService('chat_repository');
    const chatService: ChatService = await this.getService('chat_service');
    const con: any = await this.getConnection();

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    console.log("\n\n\n\nCREATE CHAT MSG:");
    console.log(JSON.stringify({
      chatId,
      isNew,
      text,
      imageId,
      gameType,
      gameStage,
      gameInfoId,
      gameData: {
        questionId,
        answerId,
        answer
      }
    }, null, 2));

    try {
      con.query('BEGIN');

      await chatService.createAndSend({
        userId: loggedUserId,
        chatId,
        isNew,
        text,
        imageId,
        gameType,
        gameStage,
        gameInfoId,
        gameData: {
          questionId,
          answerId,
          answer
        }
      });

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async reportImage(req: any, res: any) {
    // const token = this.getAuthToken(req);
    const messageId = req.body.messageId;
    // const mediaId = req.params.mediaId;

    const chatRepository: ChatRepository = await this.getService('chat_repository');
    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      await chatRepository.reportMessageMedia(messageId);

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }
}
