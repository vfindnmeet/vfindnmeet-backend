import SessionTokenRepository from '../repositories/SessionTokenRepository';
import { Controller } from '../core/Controller';
// import IntroService from '../services/IntroService';
// import IntroRepository from '../repositories/IntroRepository';
import UserRepository from '../repositories/UserRepository';
import { timeAgo, mapImage } from '../utils';
import MatchRepository from '../repositories/MatchRepository';
import LikeRepository from '../repositories/LikeRepository';
import LikeService from '../services/LikeService';
import RecommendationService from '../services/RecommendationService';
import MediaService from '../services/media/MediaService';

export default class LikeController extends Controller {
  async like(req: any, res: any) {
    const token = this.getAuthToken(req);

    // if other user liked - match
    // on match - delete like

    const userId = req.params.id;
    let { message } = req.body;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const recommendationService: RecommendationService = await this.getService('recommendation_service');
    const likeService: LikeService = await this.getService('like_service');
    const likeRepository: LikeRepository = await this.getService('likes_repository');
    const userRepository: UserRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      const { status } = await likeService.like(loggedUserId, userId, message);
      await recommendationService.moveToHistory(loggedUserId, userId, 'like');

      con.query('COMMIT');

      if (status === 'matched') {
        const [me, user, likesCount] = await Promise.all([
          userRepository.findById(['id', 'name', 'profile_image_id', 'gender'], loggedUserId),
          userRepository.findById(['id', 'name', 'profile_image_id', 'gender'], userId),
          likeRepository.getLikesCount(loggedUserId)
        ]);

        return res.json({
          status,
          me: {
            id: me.id,
            profileImage: MediaService.getProfileImagePath(me),
            name: me.name,
            gender: me.gender
          },
          user: {
            id: user.id,
            profileImage: MediaService.getProfileImagePath(user),
            name: user.name,
            gender: user.gender
          },
          likesCount
        });
      }

      return res.json({ status });
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async pass(req: any, res: any) {
    const token = this.getAuthToken(req);

    const userId = req.params.id;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const recommendationService: RecommendationService = await this.getService('recommendation_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      await recommendationService.moveToHistory(loggedUserId, userId, 'pass');

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async unlike(req: any, res: any) {
    const token = this.getAuthToken(req);

    const userId = req.params.id;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    // const introService: IntroService = await this.getService('intro_service');
    // const introRepository: IntroRepository = await this.getService('intro_repository');
    const likeRepository: LikeRepository = await this.getService('like_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      const like = await likeRepository.getByUserIds(loggedUserId, userId);
      if (!like) {
        return res.status(201).end();
      }

      await Promise.all([
        likeRepository.delete(like.id),
        likeRepository.decrementLikesCountForUser(userId)
      ]);

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  // async unmatch(req: any, res: any) {
  //   const token = this.getAuthToken(req);

  //   const userId = req.params.id;

  //   const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
  //   const introRepository: MatchRepository = await this.getService('match_repository');

  //   const loggedUserId = await sessionTokenRepository.getUserId(token);
  //   const matched = await introRepository.areMatched(loggedUserId, userId);

  //   if (!matched) {
  //     return res.status(201).end();
  //   }

  //   await introRepository.unmatch(loggedUserId, userId);

  //   res.status(201).end();
  // }

  async unmatch(req: any, res: any) {
    const token = this.getAuthToken(req);
    const userId = req.params.id;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const likeService: LikeService = await this.getService('like_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await likeService.unmatch(loggedUserId, userId);

    return res.status(201).end();
  }


  async updateIntroMessage(req: any, res: any) {
    const token = this.getAuthToken(req);

    const likeId = req.params.id;
    const { message } = req.body;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const likeService: LikeService = await this.getService('like_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await likeService.updateLikeMessage(likeId, loggedUserId, message);

    res.status(201).end();
  }

  async getLikesFromMe(req: any, res: any) {
    const token = this.getAuthToken(req);
    const page = req.query.page;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const likeRepository: LikeRepository = await this.getService('like_repository');
    const userRepository: UserRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const likes = await likeRepository.getFromUser(loggedUserId, page);

    const userIds = likes.map(({ to_user_id }: any) => to_user_id);
    const users = await userRepository.findByIds([
      'id',
      'name',
      'age',
      'gender',
      'profile_image_id',
      'verification_status',
      'is_online'
    ], userIds);

    const result: any[] = [];

    likes.forEach((like: any) => {
      const user = users.filter(({ id }: any) => id === like.to_user_id)[0];

      if (!user) return;

      result.push(likeItem(user, like));
    });

    console.log('likes:');
    console.log(JSON.stringify(result, null, 2));

    res.json(result);
  }

  async getLikesToMe(req: any, res: any) {
    const token = this.getAuthToken(req);
    const page = req.query.page;

    const canSeeLiker = false;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const likeRepository: LikeRepository = await this.getService('like_repository');
    const userRepository: UserRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const likes = await likeRepository.getForUser(loggedUserId, page);

    const userIds = likes.map(({ from_user_id }: any) => from_user_id);
    const users = await userRepository.findByIds([
      'id',
      'name',
      'age',
      'gender',
      'profile_image_id',
      'blurred_profile_image_id',
      'verification_status',
      'is_online'
    ], userIds);

    const result: any[] = [];

    likes.forEach((like: any) => {
      const user = users.filter(({ id }: any) => id === like.from_user_id)[0];

      if (!user) return;

      const item = likeItem(user, like);
      if (canSeeLiker) {
        result.push({
          id: item.id,
          name: item.name,
          age: item.age,
          isOnline: item.isOnline,
          gender: item.gender,
          verification_status: item.verification_status,
          profileImage: user.profile_image_id ? mapImage(user.profile_image_id)?.uri_big : undefined,
          like: like.like
        });
      } else {
        result.push({
          gender: item.gender,
          verification_status: item.verification_status,
          profileImage: user.blurred_profile_image_id ? mapImage(user.blurred_profile_image_id)?.uri_big : undefined,
        });
      }
    });

    console.log('likes:');
    console.log(JSON.stringify(result, null, 2));

    res.json(result);
  }
}

const likeItem = (user: any, like: any) => ({
  id: user.id,
  name: user.name,
  age: user.age,
  gender: user.gender,
  verification_status: user.verification_status,
  isOnline: user.is_online,
  profileImage: user.profile_image_id ? mapImage(user.profile_image_id)?.uri_big : undefined,
  canSendIntroMessage: !like.message,
  like: {
    id: like.id,
    message: like.message,
    fromUserId: like.from_user_id,
    timeAgo: timeAgo(like.created_at),
  },
  showImage: true,
  showProfileLink: true
});
