import VerificationStatus from '../models/enums/VerificationStatus';
import UserRepository from '../repositories/UserRepository';
import VerificationRequestRepository from '../repositories/VerificationRequestRepository';

export default class VerificationService {
  constructor(
    private userRepository: UserRepository,
    private verificationRequestRepository: VerificationRequestRepository
  ) { }

  async deleteForUser(userId: string) {
    return await this.verificationRequestRepository.deleteForUser(userId);
  }

  async updateStatusForUser(userId: string, status: string) {
    return await this.verificationRequestRepository.updateStatusForUser(userId, status);
  }

  async requestVerification(userId: string, imageId: string) {
    const [, verificationRequest] = await Promise.all([
      this.userRepository.setVerificationStatus(userId, VerificationStatus.PENDING),
      this.verificationRequestRepository.create({
        userId,
        imageId,
        status: VerificationStatus.PENDING
      })
    ]);

    return verificationRequest;
  }
};
