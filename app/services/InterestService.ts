import InterestRepository from "../repositories/InterestRepository";

export default class InterestService {
  constructor(private interestRepository: InterestRepository) {}

  async getForUser(userId: string) {
    return await this.interestRepository.getForUser(userId);
  }

  async getCustomHobbiesForUser(userId: string) {
    return await this.interestRepository.getCustomHobbiesForUser(userId);
  }

  async getActivitiesForUser(userId: string) {
    return await this.interestRepository.getActivitiesForUser(userId);
  }

  async getCustomActivitiesForUser(userId: string) {
    return await this.interestRepository.getCustomActivitiesForUser(userId);
  }

  async setUserHobbies(userId: string, hobbies: any[]) {
    if (!hobbies) return;

    await this.interestRepository.deleteForUser(userId);
    await this.interestRepository.setForUser(userId, hobbies);
  }
}
