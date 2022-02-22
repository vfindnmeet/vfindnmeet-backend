// import LikeService from '../services/LikeService';
// import { Controller } from '../core/Controller';
// // import MediaService from '../services/MediaService';
// // import { timeAgo } from '../utils';
// // import { sendWsMessage } from '../services/WsService';
// // import IntroService from '../services/IntroService';

// export default class IntroController extends Controller {
//   // async like(req: any, res: any) {
//   //   const token = this.getAuthToken(req);
//   //   const introId = req.params.id;

//   //   const sessionTokenRepository = await this.getService('session_token_repository');
//   //   const introRepository = await this.getService('intro_repository');
//   //   const introService = await this.getService('intro_service');
//   //   const matchRepository = await this.getService('match_repository');
//   //   const notificationService = await this.getService('notification_service');
//   //   const chatService = await this.getService('chat_service');

//   //   const loggedUserId = await sessionTokenRepository.getUserId(token);
//   //   const intro = await introRepository.getIntroById(introId);

//   //   if (intro.to_user_id !== loggedUserId) {
//   //     return res.status(404).end();
//   //   }
//   //   if (intro.liked_at) {
//   //     const relationStatus = await introService.relationBetween(intro.from_user_id, intro.to_user_id);

//   //     return res.json({ status: 'already_liked', relationStatus });
//   //   }

//   //   await introRepository.likeIntro(intro.id);
//   //   await matchRepository.create(intro.from_user_id, intro.to_user_id);

//   //   await chatService.createChatIfNotExists(intro.from_user_id, intro.to_user_id);

//   //   await notificationService.create(loggedUserId, intro.from_user_id, intro.id, 'intro_like');
//   //   await notificationService.create(intro.from_user_id, loggedUserId, intro.id, 'matched');

//   //   return res.json({ relationStatus: 'matched' });
//   // }

//   async unmatch(req: any, res: any) {
//     const token = this.getAuthToken(req);
//     const userId = req.params.id;

//     const sessionTokenRepository = await this.getService('session_token_repository');
//     const likeService: LikeService = await this.getService('like_service');

//     const loggedUserId = await sessionTokenRepository.getUserId(token);
//     await likeService.unmatch(loggedUserId, userId);

//     return res.status(201).end();
//   }

//   // async getLikes(req: any, res: any) {
//   //   const token = this.getAuthToken(req);
//   //   const page = req.query.page;

//   //   const sessionTokenRepository = await this.getService('session_token_repository');
//   //   const introRepository = await this.getService('intro_repository');
//   //   const userRepository = await this.getService('user_repository');

//   //   const loggedUserId = await sessionTokenRepository.getUserId(token);

//   //   await introRepository.seeIntros(loggedUserId);
//   //   sendWsMessage(loggedUserId, { type: 'see_intros' });

//   //   const intros = await introRepository.getForUser(loggedUserId, page);

//   //   const fromUserIds = intros.map((intro: any) => intro.from_user_id);
//   //   const fromUsers = await userRepository.findByIds([
//   //     'id', 'name', 'age', 'profile_image_id', 'verification_status', 'is_online'
//   //   ], fromUserIds);

//   //   const result = intros.map((intro: any) => {
//   //     const user = fromUsers.filter((user: any) => user.id === intro.from_user_id)[0];

//   //     if (!user) return null;

//   //     return {
//   //       id: user.id,
//   //       profile_image: MediaService.getProfileImagePath(user),
//   //       name: user.name,
//   //       age: user.age,
//   //       verification_status: user.verification_status,
//   //       is_online: user.is_online,
//   //       intro: {
//   //         timeAgo: timeAgo(intro.created_at),
//   //         type: intro.type,
//   //         message: intro.message,
//   //       },

//   //       showImage: true,
//   //       showProfileLink: true
//   //     };
//   //   });

//   //   res.json(result.filter((user: any) => user));
//   // }
// }
