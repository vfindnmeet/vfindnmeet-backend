// import { sendWsMessage } from './WsService';
// import { mapByKey } from '../utils';
// import MediaService from './MediaService';
// import WsMessageType from '../models/enums/WsMessageType';
// // import { SIZE_SMALL } from './media_service';
// import NotificationRepository from '../repositories/_NotificationRepository';
// import UserRepository from '../repositories/UserRepository';

// export default class NotificationService {
//   constructor(
//     private notificationRepository: NotificationRepository,
//     private userRepository: UserRepository) { }

//   async getAllForUser(userId: string) {
//     await this.seeNotifs(userId);
//     const notifications = await this.notificationRepository.getAllForUser(userId);
//     const fromUserIds = notifications.map((notification: any) => notification.from_user_id);
//     let users = await this.userRepository.getUsersById(fromUserIds);
//     users = users.map((user: any) => {
//       user.profileImage = MediaService.getProfileImagePath(user, MediaService.SIZE_SMALL);

//       return user;
//     });
//     users = mapByKey(users, 'id');

//     return notifications.map((notification: any) => {
//       notification.user = users[notification.from_user_id];

//       return notification;
//     });
//   }

//   async notSeenVisitsCountFor(userId: string) {
//     const notSeenNotifCount = await this.notificationRepository.notSeenVisitsCountFor(userId);

//     return notSeenNotifCount;
//   }

//   async notSeenMatchesCountFor(userId: string) {
//     const notSeenNotifCount = await this.notificationRepository.notSeenMatchesCountFor(userId);

//     return notSeenNotifCount;
//   }

//   async getNotSeenCountFor(userId: string) {
//     const notSeenNotifCount = await this.notificationRepository.notSeenCountFor(userId);

//     return notSeenNotifCount;
//   }

//   async seeNotifs(userId: string) {
//     await this.notificationRepository.seeNotifs(userId);

//     send(userId, { type: 'see_notifs' });
//   }

//   async create(fromUserId: string, toUserId: string, relId: string, type: string) {
//     const notification = await this.notificationRepository.create(fromUserId, toUserId, relId, type);

//     send(toUserId, {
//       type: WsMessageType.NOTIF,
//       notification
//     });
//   }

//   async delete(relId: string) {
//     const relType = 'friend_request';

//     return await this.notificationRepository.delete(relId, relType);
//   }
// }
