import MediaRepository from "../repositories/MediaRepository";
import UserRepository from "../repositories/UserRepository";
import VerificationService from "./VerificationService";
import VerificationStatus from '../models/enums/VerificationStatus';
import MediaService from './media/MediaService';

export default class UserMediaService {
  constructor(
    private userRepository: UserRepository,
    private mediaRepository: MediaRepository,
    private verificationService: VerificationService
  ) { }

  async blurProfileImage(userId: string) {
    const { profile_image_id, blurred_profile_image_id } = await this.userRepository.findById(
      ['profile_image_id', 'blurred_profile_image_id'],
      userId
    );

    if (!profile_image_id) {
      return;
    }

    const blurredMedia = await this.blurImage(profile_image_id);

    if (blurred_profile_image_id) {
      await this.userRepository.update(userId, { blurred_profile_image_id: null });
      await this.deleteImage(blurred_profile_image_id);
    }

    await this.userRepository.update(userId, { blurred_profile_image_id: blurredMedia.id });
  }

  async setDefaultProfileImage(userId: string) {
    const userImages = await this.mediaRepository.getUserImages(userId);
    if (userImages.length === 0) {
      return;
    }

    const imageId = userImages[0].image_id;
    await this.setProfileImage(userId, imageId);
  }

  async setProfileImage(userId: string, imageId: string) {
    const { blurred_profile_image_id } = await this.userRepository.findById(
      ['blurred_profile_image_id'],
      userId
    );
    if (blurred_profile_image_id) {
      await this.userRepository.update(userId, { blurred_profile_image_id: null });
      await this.deleteImage(blurred_profile_image_id);
    }

    const blurredMedia = await this.blurImage(imageId);

    await Promise.all([
      this.userRepository.setUserProfileImage(userId, imageId),
      this.userRepository.setBlurredProfileImage(userId, blurredMedia.id),
      this.scheduleForVerification(userId, imageId)
    ]);
  }

  async blurImage(mediaId: string) {
    const media = await this.mediaRepository.getMediaMetadata(mediaId);
    const blurredMedia = await this.mediaRepository.createMediaMetadata(media.type, media.mime_type);
    await MediaService.blurAndStore(mediaId, blurredMedia.id);

    console.log('blured image id:', blurredMedia.id);

    return blurredMedia;
  }

  async deleteUserImage(userId: string, targetImageId: string) {
    await Promise.all([
      this.mediaRepository.deleteUserImage(userId, targetImageId),
      this.mediaRepository.deleteMediaMetadata([targetImageId]),
      this.userRepository.decrementImagesCount(userId)
    ]);

    await MediaService.deleteImages(targetImageId);
  }

  async deleteImage(targetImageId: string) {
    await this.mediaRepository.deleteMediaMetadata([targetImageId]);
    await MediaService.deleteImages(targetImageId);
  }

  async scheduleForVerification(userId: string, profileImageId: string) {
    const { verification_status } = await this.userRepository.findById('verification_status', userId);
    if (verification_status !== VerificationStatus.VERIFIED) return;

    if (!profileImageId) {
      await Promise.all([
        this.userRepository.setVerificationStatus(userId, VerificationStatus.REJECTED),
        this.verificationService.deleteForUser(userId)
      ]);

      return;
    }

    await Promise.all([
      this.userRepository.setVerificationStatus(userId, VerificationStatus.PENDING),
      this.verificationService.updateStatusForUser(userId, VerificationStatus.PENDING)
    ]);
  }
}
