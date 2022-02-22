import PushNotificationRepository from '../repositories/PushNotificationRepository';
import WsMessageType from '../models/enums/WsMessageType';
import ChatRepository, { BaseChatMessage, GameTypes, QuestionGameStage, WouldYouRatherGameStage } from '../repositories/ChatRepository';
import UserRepository from '../repositories/UserRepository';
import { mapImage, timeAgo } from '../utils';
import MediaService from './media/MediaService';
import NotificationService from './NotificationService';
import { sendWsMessage } from './WsService';
import { SIZE_SMALL } from './media/BaseMediaService';

export default class ChatService {
  constructor(
    private chatRepository: ChatRepository,
    private userRepository: UserRepository,
    private notificationService: NotificationService,
    private pushNotificationRepository: PushNotificationRepository
  ) { }

  async createChatIfNotExists(userOneId: string, userTwoId: string) {
    let chatId = await this.chatRepository.getCommonChatId(userOneId, userTwoId);
    if (!chatId) {
      chatId = await this.chatRepository.createChat(userOneId, userTwoId);
      // await this.chatRepository.createChatMembers(chatId, [{ id: userOneId }, { id: userTwoId }]);
    }

    return chatId;
  }

  async getMessagesAfter(chatId: string, after: number) {
    let messages = await this.chatRepository.getChatMessagesAfter(chatId, after);

    messages = messages.reverse();

    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      lastMessage.postedAgo = timeAgo(lastMessage.created_at);
    }

    return messages;
  }

  calculateNotSeenCount(chats: any[]) {
    if (0 === chats.length) return 0;
    if (1 === chats.length) return chats[0].not_seen_count;

    let totalNotSeenCount = 0;
    for (const chat of chats) totalNotSeenCount += chat.not_seen_count;

    return totalNotSeenCount;
  }

  private async createGame({
    gameType,
    gameData
  }: {
    gameType: number;
    gameData?: {
      questionId?: string;
      answerId?: string;
    }
  }) {
    let game;
    if (gameType == GameTypes.WOULD_YOU_RATHER) {
      game = await this.chatRepository.createWouldYouRatherGame(gameData?.questionId as string);
    } else if (gameType == GameTypes.ANSWER_QUESTIONS) {
      game = await this.chatRepository.createQuestionGame(gameData?.questionId as string);
    }

    if (!game) return null;

    const gameInfo = await this.chatRepository.createGameInfo(gameType, WouldYouRatherGameStage.PROMPT, game.id);

    return gameInfo;
  }

  private async updateGame({
    gameInfoId,
    gameType,
    gameStage,
    gameData
  }: {
    gameInfoId: string;
    gameType: number;
    gameStage: number;
    gameData?: {
      questionId?: string;
      answerId?: string;
      answer?: string;
    }
  }) {
    if (gameType == GameTypes.WOULD_YOU_RATHER) {
      await this.chatRepository.setWouldYouRatherGameAnswer(
        (await this.chatRepository.getGameInfo(gameInfoId)).game_id,
        gameData?.answerId as string
      );
    } else if (gameType == GameTypes.ANSWER_QUESTIONS) {
      if (gameStage == QuestionGameStage.ANSWER_TO) {
        await this.chatRepository.setQuestionGameAnswerTo(
          (await this.chatRepository.getGameInfo(gameInfoId)).game_id,
          gameData?.answer as string,
          gameData?.questionId as string,
        );
      } else if (gameStage == QuestionGameStage.ANSWER_FROM) {
        await this.chatRepository.setQuestionGameAnswerFrom(
          (await this.chatRepository.getGameInfo(gameInfoId)).game_id,
          gameData?.answer as string
        );
      }
    }

    const gameInfo = await this.chatRepository.getGameInfo(gameInfoId);
    return (await this.chatRepository.createGameInfo(gameType, +gameInfo.game_stage + 1, gameInfo.game_id))?.id;
  }

  async createAndSend({
    userId,
    chatId,
    isNew,
    text,
    imageId,
    gameStage,
    gameType,
    gameInfoId,
    gameData
  }: BaseChatMessage & {
    isNew: boolean,
    gameStage: number,
    gameType: number,
    gameData?: any;
  }) {
    const validText = typeof text === 'string' && text.trim() !== '';
    const isGame = !!gameStage && +gameStage > 0;

    if (!imageId && !validText && !isGame) {
      return;
    }

    if (!validText) {
      text = '';
    }

    let gameInfo;
    if (isGame) {
      if (gameStage == 1) {
        const gameInfo = await this.createGame({ gameType, gameData });

        gameInfoId = gameInfo?.id;
      } else {
        gameInfoId = await this.updateGame({
          gameInfoId: gameInfoId as string,
          gameStage,
          gameType,
          gameData
        });
      }

      if (gameType == GameTypes.WOULD_YOU_RATHER) {
        gameInfo = await this.chatRepository.getWouldYouRatherAnswers(gameData?.questionId as string);
        gameData = {
          fromQuestionId: gameData?.questionId as string
        }
      } else if (gameType == GameTypes.ANSWER_QUESTIONS) {
        const gameInfoO = await this.chatRepository.getGameInfo(gameInfoId as string);
        const questionGame = (await this.chatRepository.getQuestionGames([gameInfoO.game_id as string]))[0];
        gameData = {
          ...questionGame
        };
        gameInfo = {
          questions: await this.chatRepository.getQuestionsByQuestionIds([questionGame.fromQuestionId, questionGame.toQuestionId])
        };
      }
    }

    const [message, chat] = await Promise.all([
      this.createMessage({
        userId,
        chatId,
        text,
        imageId,
        gameInfoId,
        // gameStage,
        // gameType,
      }),
      this.chatRepository.getChatMembers(chatId)
    ]);

    // await this.chatRepository.updateLastChatMessage(chatId, message.createdAt, message.id);

    const otherMemberId: string = chat.member_one_id === userId ?
      chat.member_two_id :
      chat.member_one_id;

    const promises = [
      this.chatRepository.updateLastChatMessage(chatId, message.createdAt, message.id),
      this.chatRepository.updateNotSeenCount(chatId, otherMemberId),
      this.userRepository.findByIds(
        ['id', 'name', 'gender', 'profile_image_id', 'verification_status', 'is_online', 'status'],
        [userId, otherMemberId]
      )
    ];
    const r = await Promise.all(promises);

    const users: { [key: string]: any } = {};
    (r[r.length - 1] as any).forEach((user: any) => {
      users[user.id] = user;
    });

    const currentMessageUserId = message.userId === chat.member_one_id ? chat.member_one_id : chat.member_two_id;
    const otherMessageUserId = message.userId !== chat.member_one_id ? chat.member_one_id : chat.member_two_id;

    const payload: { [key: string]: any } = {
      id: message.id,
      text,
      chatId,
      userId,
      image: imageId ? mapImage(imageId) : undefined,
      gameInfoId,
      game: {
        gameInfoId,
        gameType,
        gameStage,
        gameData,
        gameInfo
      },
      createdAt: message.createdAt,
      postedAgo: timeAgo(message.createdAt),
    };

    if (gameType) {
      payload.mupi = MediaService.getProfileImagePath(users[currentMessageUserId], SIZE_SMALL);
      payload.oupi = MediaService.getProfileImagePath(users[otherMessageUserId], SIZE_SMALL);
      payload.mug = users[currentMessageUserId].gender;
      payload.oug = users[otherMessageUserId].gender;
    }

    const otherMember = await this.userRepository.findByIds(
      ['id', 'name'],
      [otherMemberId]
    );

    // setTimeout(async () => {
    //   await this.notificationService.sendPushNotification(userId, {
    //     title: `${otherMember.name} messaged you`,
    //     message: '2 xx!'
    //   });
    // }, 3000);

    for (const id of [userId, otherMemberId]) {
      if (isNew) {
        sendWsMessage(id, {
          type: WsMessageType.MSG,
          payload: {
            ...payload,
            user: {
              ...users[id],
              profileImage: MediaService.getProfileImagePath(users[id])
            }
          }
        });
      } else {
        sendWsMessage(id, {
          type: WsMessageType.MSG,
          payload
        });
      }
    };
  }

  async createMessage({
    userId,
    chatId,
    text,
    imageId,
    gameInfoId
  }: BaseChatMessage) {
    const message = await this.chatRepository.createMessage({
      userId,
      chatId,
      text,
      imageId,
      gameInfoId
    });
    const promises: any[] = [
      this.chatRepository.updateLastChatMessage(
        message.chatId,
        message.createdAt,
        message.id
      )
    ];
    if (imageId) {
      promises.push(this.chatRepository.createMessageImage(message.id, imageId));
    }
    await Promise.all(promises);

    return message;
  }

  async seeChatMessages(chatId: string, userId: string) {
    const notSeenChats = await this.chatRepository.getNotSeenMessagesCountPerChatForUser(userId);

    if (!notSeenChats[chatId]) return;

    await this.chatRepository.seeChat(chatId, userId);

    sendWsMessage(userId, {
      type: WsMessageType.SEE_MSG,
      payload: {
        chatId,
        notSeenMessagesCount: await this.chatRepository.getAllNotSeenCount(userId)
      }
    });
  }
}
