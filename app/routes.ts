import ChatController from './controllers/ChatController';
import InterestController from './controllers/InterestController';
import UserController from './controllers/UserController';
import AuthController from './controllers/AuthController';
// import NotificationController from './controllers/_NotificationController';
// import IntroController from './controllers/IntroController';
import LocationController from './controllers/LocationController';
import { Controller } from './core/Controller';
import { handle } from './core/Controller';
import { handleWithDBClient } from './db';
import SessionTokenRepository from './repositories/SessionTokenRepository';
import UserRepository from './repositories/UserRepository';
import VerificationController from './controllers/VerificationController';
import ProfileQuestionsController from './controllers/ProfileQuestionsController';
import LikeController from './controllers/LikeController';
import MediaController from './controllers/MediaController';
import SettingsController from './controllers/SettingsController';
// import OnlineService from './services/OnlineService';
import OnboardingController from './controllers/OnboardingController';
import EncountersController from './controllers/EncountersController';
import NotificationController from './controllers/NotificationController';
import ChatGameController from './controllers/ChatGameController';
import FeedbackController from './controllers/FeedbackController';
import PersonalityController from './controllers/PersonalityController';

const sendError = Controller.sendError;

const SESSION_LIFETIME = 1800000; // 30 min

const auth = (req: any, res: any, next: any, statuses: any[] = []) => {
  const token = req.headers['x-auth-token'];
  if (!token) return sendError(res, 401, 'Unauthenticated');

  handleWithDBClient(async (client: any) => {
    const sessionTokenRepository = new SessionTokenRepository(client);
    const sessionInfo = await sessionTokenRepository.getByToken(token);
    if (!sessionInfo) {
      return sendError(res, 401, 'Unauthenticated');
    }
    if (!sessionInfo.remember && SESSION_LIFETIME < Date.now() - sessionInfo.created_at) {
      await sessionTokenRepository.removeByToken(token);
      return sendError(res, 401, 'Unauthenticated');
    }

    const userId = sessionInfo.user_id;

    const userRepository = new UserRepository(client);
    const { status }: any = await userRepository.getUserById(userId);

    const hasStatusRules = statuses.length > 0;
    if (hasStatusRules && !statuses.includes(status)) {
      return sendError(res, 403, 'Unauthorized');
    }

    // (new OnlineService(client)).updateLastOnline(userId);

    return next();
  }, () => sendError(res, 500, 'Internal server error.'));
};

// const authOnboarding = (...args: any) => auth(...args, ['onboarding']);
const authActive = (req: any, res: any, next: any) => auth(req, res, next, ['active']);

export const initRoutes = (app: any) => {
  // const storage = multer.memoryStorage()
  // const upload = multer({ storage: storage })

  app.get('/api/media/:id', handle(MediaController, 'get'));
  app.get('/api/would-you-rather-questions', handle(ChatGameController, 'getWouldYouRatherGames'));
  app.get('/api/personality-questions', handle(PersonalityController, 'get'));
  app.post('/api/personality-calculate', handle(PersonalityController, 'calculate'));
  app.get('/api/personality', handle(PersonalityController, 'getPersonality'));
  app.post('/api/personality', handle(PersonalityController, 'setPersonality'));

  app.get('/api/question-game-questions', handle(ChatGameController, 'getAnswerQuestionsGameQuestions'));
  app.post('/api/update-position', auth, handle(LocationController, 'updatePosition'));
  app.post('/api/add-feedback', auth, handle(FeedbackController, 'add'));
  app.post('/api/register-pn-token', auth, handle(NotificationController, 'registerToken'));
  app.post('/api/report-media', auth, handle(ChatController, 'reportImage'));
  // app.post('/api/pn-message', handle(NotificationController, 'message'));
  app.get('/api/likes-from', authActive, handle(LikeController, 'getLikesFromMe'));
  app.get('/api/likes-to', authActive, handle(LikeController, 'getLikesToMe'));
  app.get('/api/recommendations', authActive, handle(EncountersController, 'getRecommendations'));
  app.post('/api/like/:id/update', authActive, handle(LikeController, 'updateIntroMessage'));
  app.post('/api/users/:id/like', authActive, handle(LikeController, 'like'));
  app.post('/api/users/:id/pass', authActive, handle(LikeController, 'pass'));
  app.post('/api/users/:id/unlike', authActive, handle(LikeController, 'unlike'));
  app.post('/api/users/:id/unmatch', authActive, handle(LikeController, 'unmatch'));
  // app.post('/api/users/:id/like', authActive, handle(LikeController, 'like'));
  // app.post('/api/users/:id/unmatch', authActive, handle(IntroController, 'unmatch'));
  app.post('/api/users/bio', authActive, handle(SettingsController, 'setDescription'));
  app.get('/api/users/has-profile-img', auth, handle(UserController, 'hasProfileImage'));
  app.post('/api/users/profile-img', auth, handle(UserController, 'setProfileImage'));
  app.get('/api/users/:id/profile-answers', auth, handle(ProfileQuestionsController, 'get'));
  app.post('/api/users/profile-answer', auth, handle(ProfileQuestionsController, 'save'));
  app.delete('/api/users/profile-answer', auth, handle(ProfileQuestionsController, 'delete'));
  // app.post('/api/media/upload', handle(IntroController, 'create'));
  app.post('/api/verification/upload', handle(VerificationController, 'create'));
  app.post('/api/users/image/upload', handle(MediaController, 'uploadUserImage'));
  app.post('/api/image/upload', handle(MediaController, 'uploadImage'));
  app.delete('/api/users/image', auth, handle(MediaController, 'deleteUserImage'));
  app.delete('/api/image', auth, handle(MediaController, 'deleteImage'));
  app.get('/api/hobbies', handle(InterestController, 'getAll'));
  app.get('/api/locations/search', handle(LocationController, 'search'));
  app.get('/api/locations/cities', handle(LocationController, 'cities'));
  app.get('/api/interests', handle(InterestController, 'getAll'));
  app.get('/api/profile-questions', handle(ProfileQuestionsController, 'getAllQuestions'));
  // app.post('/api/hobbies/user', authActive, handle(InterestController, 'set'));
  app.post('/api/interests', authActive, handle(InterestController, 'setActivities'));
  app.post('/api/login', handle(AuthController, 'login'));
  app.post('/api/auth-info', handle(AuthController, 'setAuthInfo'));
  app.post('/api/login-with', handle(AuthController, 'loginWith'));
  app.post('/api/sign-up', handle(UserController, 'signUp'));
  app.post('/api/logout', auth, handle(AuthController, 'logout'));
  app.get('/api/user/:id', authActive, handle(UserController, 'get'));
  app.get('/api/user-profile', authActive, handle(UserController, 'getProfile'));
  app.get('/api/user-profile-info', authActive, handle(UserController, 'getProfileInfo'));
  app.post('/api/user-profile', authActive, handle(UserController, 'updateProfile'));
  app.post('/api/user-info', authActive, handle(UserController, 'updateInfo'));
  app.get('/api/users', authActive, handle(UserController, 'getUsers'));
  app.get('/api/info-settings', authActive, handle(SettingsController, 'getSettingsInfo'));
  app.get('/api/settings', authActive, handle(SettingsController, 'getSettings'));
  app.post('/api/user/location/:locationId', authActive, handle(SettingsController, 'setLocation'));
  app.post('/api/account-settings', authActive, handle(SettingsController, 'setAccountSettings'));
  app.post('/api/profile-settings', authActive, handle(SettingsController, 'setProfileSettings'));
  app.post('/api/push-notif-settings', authActive, handle(SettingsController, 'setPushNotifSettings'));

  app.get('/api/matches', authActive, handle(UserController, 'getMatches'));
  app.get('/api/views', authActive, handle(UserController, 'getViewers'));
  // app.get('/api/compatibilities', authActive, handle(UserController, 'getCompatibilities'));
  // app.get('/api/compatibility-count', authActive, handle(UserController, 'getCompatibilityCount'));
  // app.get('/api/notifications', authActive, handle(NotificationController, 'getAll'));
  app.get('/api/chats', authActive, handle(ChatController, 'members'));
  app.get('/api/chat/:userId/messages-after', authActive, handle(ChatController, 'getMessagesAfterTs'));
  app.get('/api/not-seen-messages-per-chat', authActive, handle(ChatController, 'getNotSeenMessagesPerChat'));
  app.get('/api/chat/:userId/older', authActive, handle(ChatController, 'loadOlder'));
  app.post('/api/chat/:userId/new-message', authActive, handle(ChatController, 'addMessage'));
  app.get('/api/chat/:userId', authActive, handle(ChatController, 'get'));
  app.post('/api/report', auth, handle(UserController, 'report'));
  app.post('/api/feedback', auth, handle(UserController, 'feedback'));
  app.post('/api/settings/change-password', auth, handle(SettingsController, 'changePassword'));
  app.post('/api/settings/deactivate', auth, handle(SettingsController, 'deactivate'));
  app.get('/api/verification/status', auth, handle(VerificationController, 'status'));
  app.get('/api/email-exists', handle(UserController, 'emailExists'));

  app.get('/api/onboarding/step', auth, handle(OnboardingController, 'getStep'));
  app.get('/api/onboarding/images', auth, handle(OnboardingController, 'getImages'));
  app.post('/api/onboarding/data', auth, handle(OnboardingController, 'setData'));
  // app.post('/api/onboarding/account-info', authOnboarding, handle(OnboardingController, 'setAccountInfo'));
  // app.post('/api/onboarding/about', authOnboarding, handle(OnboardingController, 'setAbout'));
  // app.post('/api/onboarding/profile-info', authOnboarding, handle(OnboardingController, 'setProfileInfo'));
  // app.post('/api/onboarding/interests', authOnboarding, handle(OnboardingController, 'setInterests'));
  // app.get('/api/onboarding/quiz', authOnboarding, handle(QuizController, 'getQuiz'));
  // app.get('/api/onboarding/account-info', authOnboarding, handle(OnboardingController, 'getAccountInfo'));
  // app.post('/api/onboarding/quiz', authOnboarding, handle(OnboardingController, 'setQuizAnswers'));
  // app.post('/api/onboarding/image-pass', authOnboarding, handle(OnboardingController, 'setImageStepPassed'));
  app.post('/api/onboarding/complete', auth, handle(OnboardingController, 'complete'));
  app.get('/api/search-preferences', authActive, handle(SettingsController, 'getSearchPreferences'));
  app.post('/api/search-preferences', authActive, handle(SettingsController, 'setSearchPreferences'));

  // app.get('*', (req, res) => {
  //   const dir = path.resolve(process.cwd() + '/dist/index.html');
  //   res.sendFile(dir);
  // });
};
