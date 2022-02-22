import { Controller } from '../core/Controller';
import { sendWsMessage } from '../services/WsService';
import { calculateAge, makeProfileImage, mapImage, mapImages, parseJson } from '../utils';
import UserRepository from '../repositories/UserRepository';
import MediaService from '../services/media/MediaService';
import SignUpValidator from '../models/validators/sign_up_validator';
import WsMessageType from '../models/enums/WsMessageType';
import UserService from '../services/UserService';
import AuthService from '../services/AuthService';
import SessionTokenRepository from '../repositories/SessionTokenRepository';
import MediaRepository from '../repositories/MediaRepository';
import InterestRepository from '../repositories/InterestRepository';
import ProfileQuestionsRepository from '../repositories/ProfileQuestionsRepository';
import UserMediaService from '../services/UserMediaService';
import MatchService from '../services/MatchService';
// import IntroRepository from '../repositories/IntroRepository';
import UserStatus from '../models/enums/UserStatus';
import OnlineService from '../services/OnlineService';
import * as es from '../services/ESService';
import RecommendationService from '../services/RecommendationService';
// import { retriveFromCache, storeToCache } from '../KeyValueCache';
import LikeRepository from '../repositories/LikeRepository';

export default class UserController extends Controller {
  async get(req: any, res: any) {
    const token: string = this.getAuthToken(req);
    const userId = req.params.id;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const userRepository: UserRepository = await this.getService('user_repository');
    const mediaRepository: MediaRepository = await this.getService('media_repository');
    const interestRepository: InterestRepository = await this.getService('hobbie_repository');
    const profileQuestionsRepository: ProfileQuestionsRepository = await this.getService('profile_questions_repository');
    const matchService: MatchService = await this.getService('match_service');
    const likeRepository: LikeRepository = await this.getService('like_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const user = await userRepository.findById(
      [
        'id',
        'name',
        'age',
        // 'title',
        'work',
        'education',
        'gender',
        'description',
        'verified',
        'verification_status',
        'city_id',
        'profile_image_id',
        'status'
      ],
      userId
    );

    if (!user || user.status !== UserStatus.ACTIVE) {
      return res.status(404).end();
    }

    const [
      images,
      userInfo,
      userInterestIds,
      profileQuestionAnswers,
      like,
      // personality,
    ] = await Promise.all([
      mediaRepository.getUserImages(userId),
      userRepository.findInfoById(
        [
          'height',
          'smoking',
          'drinking',
          'income',
          'body',
          'children',
          'pet',
          'employment',
          'education',
          'personality',
          'zodiac',
          'personality_type'
        ],
        userId
      ),
      interestRepository.getSelectedForUser(userId),
      profileQuestionsRepository.findUserAnswers(userId),
      likeRepository.getByUserIds(loggedUserId, userId),
      // (await this.getConnection()).query('SELECT type FROM personalities WHERE user_id = $1', [userId]),
    ]);

    if (userId !== loggedUserId) {
      user.matched = await matchService.areMatched(userId, loggedUserId);
    }

    user.images = mapImages(makeProfileImage(user.profile_image_id, images));
    user.info = userInfo ?? {};
    user.selectedInterests = userInterestIds;
    user.questionAnswers = profileQuestionAnswers.map(({ id, question_id, text }: any) => ({
      answerId: id,
      questionId: question_id,
      answer: text
    }));
    user.like = like ? {
      id: like.id,
      liked: true,
      introSent: !!like.message
    } : {
      liked: false,
      introSent: false
    };

    user.personality = userInfo.personality_type; //personality.rows[0]?.type;

    res.json(user);
  }

  async getProfileInfo(req: any, res: any) {
    const token: string = this.getAuthToken(req);

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const userRepository: UserRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const user = await userRepository.findById(
      [
        'id',
        'name',
        'age',
        'title',
        'gender',
        'verified',
        'verification_status',
        'city_id',
        'profile_image_id',
      ],
      loggedUserId
    );
    // const personality = (await (await this.getConnection()).query('SELECT personality FROM personalities WHERE user_id = $1', [loggedUserId])).rows[0];

    user.profileImage = mapImage(user.profile_image_id);
    // user.personality = personality?.personality;

    res.json(user);
  }

  async getProfile(req: any, res: any) {
    const token: string = this.getAuthToken(req);

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const userRepository: UserRepository = await this.getService('user_repository');
    const mediaRepository: MediaRepository = await this.getService('media_repository');
    const interestRepository: InterestRepository = await this.getService('hobbie_repository');
    const profileQuestionsRepository: ProfileQuestionsRepository = await this.getService('profile_questions_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const [
      images,
      user,
      userInfo,
      userInterestIds,
      profileQuestionAnswers
    ] = await Promise.all([
      mediaRepository.getUserImages(loggedUserId),
      userRepository.findById(
        [
          'id',
          'name',
          'age',
          'gender',
          // 'title',
          'work',
          'education',
          'description',
          'verified',
          'verification_status',
          'city_id',
          'profile_image_id',
          'birthday',
        ],
        loggedUserId
      ),
      userRepository.findInfoById(
        [
          'height',
          'smoking',
          'drinking',
          'income',
          'body',
          'children',
          'pet',
          'employment',
          'education',
          'personality',
          'zodiac',
          'personality_type',
        ],
        loggedUserId
      ),
      interestRepository.getSelectedForUser(loggedUserId),
      profileQuestionsRepository.findUserAnswers(loggedUserId),
    ]);

    user.images = mapImages(makeProfileImage(user.profile_image_id, images));
    user.info = userInfo ?? {};
    user.selectedInterests = userInterestIds;
    user.questionAnswers = profileQuestionAnswers.map(({ id, question_id, text }: any) => ({
      answerId: id,
      questionId: question_id,
      answer: text
    }));

    console.log(user);

    res.json(user);
  }

  async hasProfileImage(req: any, res: any) {
    const token = this.getAuthToken(req);

    const userRepository = await this.getService('user_repository');
    const sessionTokenRepository = await this.getService('session_token_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const { profile_image_id } = await userRepository.findById('profile_image_id', loggedUserId);

    res.json({
      hasProfileImage: !!profile_image_id
    });
  }

  async setProfileImage(req: any, res: any) {
    const token = this.getAuthToken(req);
    const imageId: string = req.body.imageId;

    // bugs other images when PI is set - removes them
    console.log('targetImageId:', imageId);

    // const userRepository: UserRepository = await this.getService('user_repository');
    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const userMediaService: UserMediaService = await this.getService('user_media_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await userMediaService.setProfileImage(loggedUserId, imageId);

    res.json(mapImage(imageId));
    // res.status(201).end();
  }

  async getUsers(req: any, res: any) {
    const token = this.getAuthToken(req);
    const lastTimestamp = req.query.lts;
    const onlineOnly = req.query.oo?.toLowerCase() === 'true';

    // console.log('xxx', lastTimestamp, onlineOnly);
    // const order = req.query.o; // last_active last_joined
    // const fromAge = req.query.fromAge;
    // const toAge = req.query.toAge;

    if (lastTimestamp) {
      res.json([]);

      return;
    }

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository: UserRepository = await this.getService('user_repository');
    const onlineService: OnlineService = await this.getService('online_service');
    const recommendationService: RecommendationService = await this.getService('recommendation_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    // const cachedResult = parseJson(retriveFromCache(`${loggedUserId}_nearby_users`));
    // if (cachedResult) {
    //   const r = [];
    //   for (let i = 0; i < 30; i++) r.push(cachedResult[i]);
    //   res.json(r);
    //   // res.json(cachedResult);
    //   console.log('FROM CACHE!!');

    //   return;
    // }

    const n = Date.now();
    const searchResult = await recommendationService.search({
      distance: 60,
      forUserId: loggedUserId,
      fromTimestamp: lastTimestamp,
      fromNewest: true,
      onlineOnly,
      size: 100
    });
    console.log('ES:', Date.now() - n);
    const userIds = searchResult.map(({ user_id }: any) => user_id);

    // console.log('searchResult:');
    // console.log(JSON.stringify(searchResult, null, 2));
    const n2 = Date.now();
    const [users, online, personalities] = await Promise.all([
      userRepository.findByIds(
        ['id', 'name', 'age', 'gender', 'city_id', 'profile_image_id', 'verification_status'],
        userIds
      ),
      onlineService.areOnline(userIds),
      (await this.getConnection()).query('SELECT personality FROM personalities WHERE user_id = any($1)', [userIds])
    ]);

    const n3 = Date.now();
    console.log('DB:', n3 - n2);
    // const online = await onlineService.areOnline(userIds);

    const result = users.map((user: any) => {
      const sResult = searchResult.find(({ user_id }) => user_id === user.id);

      return {
        ...user,
        profileImage: MediaService.getProfileImagePath(user),
        isOnline: online[user.id] ?? false,
        distanceInKm: sResult?.distanceInKm,
        personality: personalities?.rows?.find(({ user_id }: any) => user_id === user.id)?.personality,
        addedAt: sResult?.added_at
      }
    });

    // console.log('xxx');
    // console.log(JSON.stringify(result));
    result.sort((a: any, b: any) => a.addedAt < b.addedAt ? 1 : b.addedAt < a.addedAt ? -1 : 0);
    // console.log(JSON.stringify(result));

    // storeToCache(`${loggedUserId}_nearby_users`, JSON.stringify(result));

    res.json(result);

    const n4 = Date.now();
    console.log('x1:', n4 - n3);
    // user_id: hit._source.user_id,
    //     added_at: hit._source.added_at,
    //     distanceInKm

    // const token = this.getAuthToken(req);
    // const page = req.query.page;
    // const fromAge = req.query.fromAge;
    // const toAge = req.query.toAge;
    // const cityId = req.query.cityId;
    // const order = req.query.order;

    // const sessionTokenRepository = await this.getService('session_token_repository');
    // const userService: UserService = await this.getService('user_service');
    // const userRepository: UserRepository = await this.getService('user_repository');
    // const onlineService: OnlineService = await this.getService('online_service');

    // const loggedUserId = await sessionTokenRepository.getUserId(token);

    // const loggedUser = await userRepository.getUserById(loggedUserId);
    // const { users, totalCount } = await userService.getUsers(page, loggedUser, {
    //   fromAge, toAge, cityId, order
    // });

    // users.forEach((user: any) => {
    //   user.profileImage = MediaService.getProfileImagePath(user);
    //   user.showImage = true;
    //   user.showProfileLink = true;
    // });

    // const online = await onlineService.areOnline(users.map(({ id }: any) => id));

    // const responseData = {
    //   users: users.map((user: any) => ({
    //     ...user,
    //     isOnline: online[user.id] ?? false
    //   })),
    //   totalPages: Math.ceil(totalCount / UserRepository.usersPerPage())
    // };

    // res.json(responseData);
  }

  async getMatches(req: any, res: any) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const userRepository: UserRepository = await this.getService('user_repository');
    const matchService: MatchService = await this.getService('match_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const userIds = await matchService.matchIds(loggedUserId);
    const users = await userRepository.findByIds([
      'id', 'name', 'age', 'gender', 'city_id', 'profile_image_id', 'verification_status', 'is_online', 'status'
    ], userIds);
    const personalities = await (await this.getConnection()).query('SELECT personality FROM personalities WHERE user_id = any($1)', [userIds]);

    res.json(
      users
        .filter(({ status }: any) => status === UserStatus.ACTIVE)
        .map((user: any) => {
          user.profileImage = MediaService.getProfileImagePath(user);

          user.showImage = true;
          user.showProfileLink = true;

          user.personality = personalities?.rows?.find(({ user_id }: any) => user_id === user.id)?.personality;

          return user;
        })
    );
  }

  async getViewers(req: any, res: any) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');
    const viewsRepository = await this.getService('views_repository');
    const notificationRepository = await this.getService('notification_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const viewers = await viewsRepository.findFor(loggedUserId);
    const viewerIds = viewers.map((viewer: any) => viewer.viewer_user_id);
    const users = await userRepository.findByIds([
      'id', 'name', 'age', 'gender', 'city_id', 'profile_image_id', 'verification_status', 'is_online', 'status'
    ], viewerIds);

    await notificationRepository.seeNotifs(loggedUserId, 'view');
    sendWsMessage(loggedUserId, { type: WsMessageType.SEE_VISITS });

    res.json(
      viewerIds
        .map((viewerId: string) => {
          const user = users.find((u: any) => u.id === viewerId);
          if (!user || user.status !== UserStatus.ACTIVE) return null;

          user.profile_image = MediaService.getProfileImagePath(user);

          user.showImage = true;
          user.showProfileLink = true;

          return user;
        })
        .filter((user: any) => user)
    );
  }

  async updateProfile(req: any, res: any) {
    const token = this.getAuthToken(req);
    const { name, title, work, education, description, birthday, gender, interested_in } = req.body;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const userRepository: UserRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      const fieldsToUpdate: { [key: string]: any } = {
        name, title, description, birthday, gender, interested_in, work, education
      };
      console.log(fieldsToUpdate);
      if (fieldsToUpdate.birthday) {
        console.log(fieldsToUpdate.birthday, new Date(fieldsToUpdate.birthday));
        // fieldsToUpdate.age = calculateAge(fieldsToUpdate.birthday);
        fieldsToUpdate.age = calculateAge(new Date(fieldsToUpdate.birthday));
        console.log('fieldsToUpdate.age', fieldsToUpdate.age);
        await es.updateAgeByUserId(es.allIndexes, loggedUserId, fieldsToUpdate.age);
      }
      await userRepository.updateDefinedFields(loggedUserId, fieldsToUpdate);

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async updateInfo(req: any, res: any) {
    const token = this.getAuthToken(req);
    const {
      height,
      body,
      smoking,
      drinking,
      children,
      pet,
      employment,
      education,
      personality,
      income,
      personality_type,
    } = req.body;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const userRepository: UserRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await userRepository.updateInfoDefinedFields(loggedUserId, {
      height,
      body,
      smoking,
      drinking,
      children,
      pet,
      employment,
      education,
      personality,
      income,
      personality_type,
    });

    res.status(201).end();
  }

  async report(req: any, res: any) {
    const token = this.getAuthToken(req);
    const { type, details, toUserId } = req.body;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const reportRepository = await this.getService('report_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await reportRepository.createReport({ fromUserId: loggedUserId, toUserId, type, details });

    res.status(201).end();
  }

  async feedback(req: any, res: any) {
    const token = this.getAuthToken(req);
    const { type, details } = req.body;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const reportRepository = await this.getService('report_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await reportRepository.createFeedback({ userId: loggedUserId, type, details });

    res.status(201).end();
  }

  async signUp(req: any, res: any) {
    const { email, password, pushToken } = req.body;

    const validator = new SignUpValidator({ email, password });
    if (!validator.validate()) {
      return res.status(400).json(validator.errors);
    }

    const userService: UserService = await this.getService('user_service');
    const authService: AuthService = await this.getService('auth_service');
    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      const result: any = await userService.signUp({ email, password });
      const [token] = await Promise.all([
        authService.createAuthTokenForUser({
          userId: result.id,
          pushToken,
          // false, // don't remember
          isFromMobile: this.isFromMobile(req)
        }),
        con.query('INSERT INTO push_notification_settings (user_id, messages, received_likes, matches) VALUES ($1, true, true, true)', [result.id]),
        con.query('INSERT INTO user_info (user_id) VALUES ($1)', [result.id]),
      ]);
      result.token = token;

      con.query('COMMIT');

      res.json(result);
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async emailExists(req: any, res: any) {
    const { email } = req.query;

    const userRepository = await this.getService('user_repository');
    const exists = await userRepository.emailExists(email);

    if (exists) return res.json({ exists });

    res.status(201).end();
  }
}
