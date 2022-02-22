import OnboardingRepository from '../repositories/OnboardingRepository';
import InterestRepository from '../repositories/InterestRepository';
import SearchPreferenceRepository from '../repositories/SearchPreferenceRepository';
import UserRepository from '../repositories/UserRepository';
import ViewsRepository from '../repositories/ViewsRepository';
import { hash } from '../utils';
import LocationService from './LocationService';

export default class UserService {
  constructor(
    private userRepository: UserRepository,
    private viewRepository: ViewsRepository,
    // private searchPreferenceRepository: SearchPreferenceRepository,
    private onboardingRepository: OnboardingRepository,
    // private interestRepository: InterestRepository,
    private locationService: LocationService
  ) { }

  async signUp({ email, password }: { email: string, password: string }) {
    password = await hash(password);
    const userData = await this.userRepository.create({ email, password });
    await this.onboardingRepository.create(userData.id);

    return userData;
  }

  async signUpWith({ name, email, accessToken }: { name: string, email: string, accessToken: string }) {
    const user = await this.userRepository.createWithAccessToken({ email, name, accessToken });
    // const onboarding = await this.onboardingRepository.create(user.id);

    return { user };
  }

  async getUsers(page: number, searchingUser: any, searchPref: any) {
    const search = {
      gender: searchingUser.interested_in,
      interestedIn: searchingUser.gender,
      cityId: (typeof searchPref.cityId === 'string' && searchPref.cityId.trim() !== '') ? searchPref.cityId : '',
      fromAge: searchPref.fromAge < SearchPreferenceRepository.MIN_AGE ? SearchPreferenceRepository.MIN_AGE : searchPref.fromAge,
      toAge: searchPref.toAge > SearchPreferenceRepository.MAX_AGE ? SearchPreferenceRepository.MAX_AGE : searchPref.toAge,
      searchingUserId: searchingUser.id
    };

    const [users, totalCount] = await Promise.all([
      this.userRepository.searchUsers(page || 1, search, searchPref.order),
      this.userRepository.getUsersCount(search)
    ]);

    return { users, totalCount };
  }

  async view(viewerUserId: string, viewedUserId: string) {
    if (viewerUserId === viewedUserId) return;

    const exists = await this.viewRepository.find(viewerUserId, viewedUserId);
    if (exists) {
      await this.viewRepository.incrementView(viewerUserId, viewedUserId);
    } else {
      await Promise.all([
        this.viewRepository.create(viewerUserId, viewedUserId),
        // this.notificationService.create(viewerUserId, viewedUserId, viewerUserId, 'view')
      ]);
    }
  }

  async setLocations(users: any[]) {
    const cityIds: any = new Set();
    users.forEach(user => {
      cityIds.add(user.city_id);
    });

    const cities = await this.locationService.getCitiesById([...cityIds]);

    users.forEach(user => {
      const city = cities.find((c: any) => c.id === user.city_id);
      user.from = city.name;
    });
  }

  async setStatus(userId: string, status: string) {
    return await this.userRepository.setStatus(userId, status);
  }
}
