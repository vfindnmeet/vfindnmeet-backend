import { isProd } from '../../utils';
import S3MediaService from './S3MediaService';
import LocalMediaService from './LocalMediaService';
import { ImageSize, SIZE_BIG } from './BaseMediaService';

export default class MediaService {
  static async resizeAndStore(
    imagePath: string,
    mediaId: string,
    contentType: string,
    imageSize: ImageSize
  ) {
    this.getService().resizeAndStore(imagePath, mediaId, contentType, imageSize);
  }

  static async deleteImages(imageId: string) {
    return await this.getService().deleteImages(imageId);
  }

  static deleteMedia(mediaKeys: string | string[]) {
    return this.getService().deleteMedia(mediaKeys);
  }

  static mapImages(images: any[]) {
    return this.getService().mapImages(images);
  }

  static getProfileImagePath(user: any, size = SIZE_BIG) {
    return this.getService().getProfileImagePath(user, size);
  }

  static mediaPath(mediaId: string, size?: string) {
    return this.getService().mediaPath(mediaId, size);
  }

  static createImageName(size: string, imageId: string) {
    return this.getService().createImageName(size, imageId);
  }

  static async blurAndStore(mediaId: string, blurredMediaId: string) {
    return await this.getService().blurAndStore(mediaId, blurredMediaId);
  }

  private static getService() {
    if (isProd()) return S3MediaService;

    return LocalMediaService;
  }
}
