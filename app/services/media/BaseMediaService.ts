import sharp from 'sharp';
import { promises } from 'fs';
import { isProd } from '../../utils';
import config from '../../config/config';

const fs = promises;

export type ImageSize = { width: number; height: number };

export const SIZE_SMALL = 'small';
export const SIZE_BIG = 'big';

export const ALL_SIZES = [SIZE_SMALL, SIZE_BIG];

const SIZES: { [key: string]: number } = {
  [SIZE_SMALL]: 200,
  [SIZE_BIG]: 800
};

export const getTargetResizeSize = (imageSize: ImageSize, targetSize: string) => {
  const maxSize = SIZES[targetSize];
  const resizeSize: { width?: number; height?: number; } = {};
  if (imageSize.height > imageSize.width) {
    resizeSize.height = maxSize;
  } else {
    resizeSize.width = maxSize;
  }

  return resizeSize;
};

export default abstract class BaseMediaService {
  static getProfileImagePath(user: any, size = SIZE_BIG) {
    if (user.profile_image_id) {
      return this.mediaPath(user.profile_image_id, size);
    }

    return null;
  }

  protected static getImageNames(imageId: string) {
    return ALL_SIZES.map(size => this.createImageName(size, imageId));
  }

  static createImageName(size: string, imageId: string) {
    return `${size}_${imageId}`;
  }

  static mapImages(images: any[]) {
    return images.map(image => ({
      position: image.position,
      small: this.mediaPath(image.image_id, SIZE_SMALL),
      big: this.mediaPath(image.image_id, SIZE_BIG),
    }));
  }

  static mediaPath(mediaId: string, size?: string) {
    if (isProd()) {
      return `${config.CDN_PATH}/${size ? `${size}_` : ''}${mediaId}`;
    }

    return `${config.DOMAIN_MANE}/api/media/${size ? `${size}_` : ''}${mediaId}`;
  }

  protected static async blurImage(media: Buffer | string) {
    return sharp(media, { failOnError: false })
      .blur(35)
      .withMetadata();
  }

  protected static resizeImage(media: any, size: { width?: number, height?: number }) {
    return sharp(media, { failOnError: false })
      .resize(size)
      .withMetadata();
  }
}
