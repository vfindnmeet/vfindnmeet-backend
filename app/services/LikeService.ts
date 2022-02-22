import LikeRepository from '../repositories/LikeRepository';
// import IntroRepository from '../repositories/IntroRepository';
import MatchRepository from '../repositories/MatchRepository';
import BadRequestError from '../errors/BadRequestError';
import { sendWsMessage } from './WsService';
import WsMessageType from '../models/enums/WsMessageType';
// import OnlineService from './OnlineService';
// import { sendPushNotifications } from '../PushNotification';
import NotificationService from './NotificationService';
import PushNotificationRepository from '../repositories/PushNotificationRepository';

export default class LikeService {
  constructor(
    // private introRepository: IntroRepository,
    private matchRepository: MatchRepository,
    // private introService: IntroService,
    private likeRepository: LikeRepository,
    private notificationService: NotificationService,
    private pushNotificationRepository: PushNotificationRepository
  ) { }

  async like(fromUserId: string, toUserId: string, message?: string) {
    const areMatched = await this.matchRepository.areMatched(fromUserId, toUserId);
    if (areMatched) {
      console.log('MATCHED!');
      // already matched
      return {
        status: 'already_matched'
      };
    }

    const like = await this.likeRepository.getLikeFor(fromUserId, toUserId);
    if (like) {
      console.log('ALREADY LIKED!');
      // already liked
      return {
        status: 'liked'
      };
    }

    const likeToMe = await this.likeRepository.getLikeFor(toUserId, fromUserId);
    if (likeToMe) {
      console.log('MATCHING...');
      // other user has liked - match users
      await Promise.all([
        this.likeRepository.delete(likeToMe.id),
        this.matchRepository.create(fromUserId, toUserId),
        this.likeRepository.decrementLikesCountForUser(fromUserId)
      ]);

      return {
        status: 'matched'
      };
    }

    console.log('LIKING...');

    await this.create(fromUserId, toUserId, message);

    return {
      status: 'liked'
    };
  }

  async create(fromUserId: string, toUserId: string, message?: string) {
    // const intro = await this.introRepository.create({ fromUserId, toUserId, type, message, mediaMetadataId });
    const [like] = await Promise.all([
      this.likeRepository.create(fromUserId, toUserId, message),
      this.likeRepository.incrementLikesCountForUser(toUserId)
    ]);

    if (this.notificationService.hasWsConnection(toUserId)) {
      sendWsMessage(toUserId, {
        type: WsMessageType.LIKED,
        payload: {
          likesCount: await this.likeRepository.getLikesCount(toUserId)
        }
      });
    } else {
      if ((await this.pushNotificationRepository.findById(toUserId))?.received_likes !== false)
        await this.notificationService.sendPushNotification(toUserId, {
          title: 'Someone liked you',
          message: '1'
        });
    }

    return like;
  }

  async unmatch(userOneId: string, userTwoId: string) {
    return await this.matchRepository.unmatch(userOneId, userTwoId);
  }

  // async relationBetween(loggedUserId: string, otherUserId: string) {
  //   if (loggedUserId === otherUserId) return;
  //   if (!loggedUserId || !otherUserId) return;

  //   const areMatched = await this.introRepository.areMatched(loggedUserId, otherUserId);
  //   if (areMatched) {
  //     return 'matched';
  //   }

  //   const like = await this.introRepository.getLikeFor(loggedUserId, otherUserId);

  //   if (!like) return;

  //   if (like.to_user_id === loggedUserId) {
  //     return 'liked_me';
  //   } else {
  //     return 'liked_from_me';
  //   }
  // }

  async updateLikeMessage(id: string, loggedUserId: string, message: string) {
    const like = await this.likeRepository.getById(id);

    if (like.from_user_id !== loggedUserId || like.message) {
      throw new BadRequestError();
    }

    await this.likeRepository.updateMessage(message, id);
  }
}
