import { getClient } from '../db';
import LikeRepository from '../repositories/LikeRepository';
import ChatRepository from '../repositories/ChatRepository';
import InterestRepository from '../repositories/InterestRepository';
// import IntroRepository from '../repositories/IntroRepository';
import LocationRepository from '../repositories/LocationRepository';
import MatchRepository from '../repositories/MatchRepository';
import MediaRepository from '../repositories/MediaRepository';
// import NotificationRepository from '../repositories/_NotificationRepository';
import OnboardingRepository from '../repositories/OnboardingRepository';
// import PageRepository from '../repositories/PageRepository';
import ProfileQuestionsRepository from '../repositories/ProfileQuestionsRepository';
import ReportRepository from '../repositories/ReportRepository';
import SearchPreferenceRepository from '../repositories/SearchPreferenceRepository';
import SessionTokenRepository from '../repositories/SessionTokenRepository';
import UserRepository from '../repositories/UserRepository';
import VerificationRequestRepository from '../repositories/VerificationRequestRepository';
import ViewsRepository from '../repositories/ViewsRepository';
import AuthService from '../services/AuthService';
import ChatService from '../services/ChatService';
import HobbieService from '../services/InterestService';
import LocationService from '../services/LocationService';
import MatchService from '../services/MatchService';
import OnlineService from '../services/OnlineService';
import UserMediaService from '../services/UserMediaService';
import UserService from '../services/UserService';
import VerificationService from '../services/VerificationService';
import RecommendationRepository from '../repositories/RecommendationRepository';
import LikeService from '../services/LikeService';
import RecommendationService from '../services/RecommendationService';
import NotificationService from '../services/NotificationService';
import PushNotificationRepository from '../repositories/PushNotificationRepository';

export const SERVICE_NAME_DB_CLIENT = 'db_connection';

const DEPENDENCIES: { [key: string]: { cls: any, depends: string[] } } = {
  user_repository: { cls: UserRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  onboarding_repository: { cls: OnboardingRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  session_token_repository: { cls: SessionTokenRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  views_repository: { cls: ViewsRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  verification_request_repository: { cls: VerificationRequestRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  search_preference_repository: { cls: SearchPreferenceRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  hobbie_repository: { cls: InterestRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  // notification_repository: { cls: NotificationRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  location_repository: { cls: LocationRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  // intro_repository: { cls: IntroRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  match_repository: { cls: MatchRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  chat_repository: { cls: ChatRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  report_repository: { cls: ReportRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  media_repository: { cls: MediaRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  profile_questions_repository: { cls: ProfileQuestionsRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  online_service: { cls: OnlineService, depends: [SERVICE_NAME_DB_CLIENT] },
  likes_repository: { cls: LikeRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  recommendation_repository: { cls: RecommendationRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  pushNotification_repository: { cls: PushNotificationRepository, depends: [SERVICE_NAME_DB_CLIENT] },
  notification_service: {
    cls: NotificationService,
    depends: ['session_token_repository']
  },
  user_media_service: {
    cls: UserMediaService,
    depends: [
      'user_repository',
      'media_repository',
      'verification_service'
    ]
  },
  verification_service: {
    cls: VerificationService,
    depends: [
      'user_repository',
      'verification_request_repository'
    ]
  },
  user_service: {
    cls: UserService,
    depends: [
      'user_repository',
      'views_repository',
      // 'search_preference_repository',
      'onboarding_repository',
      // 'hobbie_repository',
      // 'notification_service',
      'location_service'
    ]
  },
  // notification_service: {
  //   cls: NotificationService,
  //   depends: [
  //     'notification_repository',
  //     'user_repository'
  //   ]
  // },
  location_service: {
    cls: LocationService,
    depends: [
      'location_repository',
      // 'user_repository'
    ]
  },
  // intro_service: {
  //   cls: IntroService,
  //   depends: [
  //     'intro_repository',
  //     'match_repository',
  //     'likes_repository',
  //     'notification_service',
  //     'pushNotification_repository'
  //   ]
  // },
  auth_service: {
    cls: AuthService,
    depends: [
      SERVICE_NAME_DB_CLIENT,
      'user_repository',
      'location_repository'
    ]
  },
  chat_service: {
    cls: ChatService,
    depends: [
      'chat_repository',
      'user_repository',
      'notification_service',
      'pushNotification_repository'
    ]
  },
  hobbie_service: {
    cls: HobbieService,
    depends: ['hobbie_repository']
  },
  match_service: {
    cls: MatchService,
    depends: ['match_repository']
  },
  like_service: {
    cls: LikeService,
    depends: [
      // 'intro_repository',
      'match_repository',
      'likes_repository',
      'notification_service',
      'pushNotification_repository'
    ]
  },
  recommendation_service: {
    cls: RecommendationService,
    depends: [
      'recommendation_repository',
      'user_repository',
      'location_repository'
    ]
  },
};

export default class ServiceDiscovery {
  public static SERVICE_NAME_DB_CLIENT = SERVICE_NAME_DB_CLIENT;
  public services: { [key: string]: any };

  constructor() {
    this.services = {};
  }

  async get(name: string) {
    if (!this.services[name]) {
      this.services[name] = await this.create(name);
    }

    return this.services[name];
  }

  async create(name: string) {
    if (SERVICE_NAME_DB_CLIENT === name) {
      return await getClient();
    }

    const targetDependency = DEPENDENCIES[name];
    const dependecies = [];
    for (const dependencyName of targetDependency.depends) {
      dependecies.push(await this.get(dependencyName));
    }
    this.services[name] = new targetDependency.cls(...dependecies);

    return this.services[name];
  }
}
