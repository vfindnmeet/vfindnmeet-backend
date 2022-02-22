import config from '../../config/config';
import { promises } from 'fs';
import BaseMediaService, { ALL_SIZES, getTargetResizeSize, ImageSize, SIZE_BIG } from './BaseMediaService';

const fs = promises;

export default class LocalMediaService extends BaseMediaService {
  static async resizeAndStore(
    imagePath: string,
    mediaId: string,
    contentType: string,
    imageSize: ImageSize
  ) {
    for (const size of ALL_SIZES) {
      await this.storeLocaly(imagePath, mediaId, imageSize, size);
    }
  }

  private static async storeLocaly(
    imagePath: string,
    mediaId: string,
    imageSize: ImageSize,
    targetSize: string
  ) {
    const newpath = `./uploads/${targetSize}_${mediaId}`;
    const resizeSize = getTargetResizeSize(imageSize, targetSize);

    await this.resizeAndStoreLocaly(imagePath, newpath, resizeSize);
  }

  private static async resizeAndStoreLocaly(
    imagePath: string,
    name: string,
    // targetSize: string
    imageSize: { width?: number; height?: number; },
  ) {
    const newpath = name;

    await this.resizeImage(imagePath, imageSize)
      .toFile(newpath);
  }

  // static async storeImageLocaly(imagePath: string, imageName: string) {
  //   const newpath = `./uploads/${imageName}`;

  //   await fs.rename(imagePath, newpath);
  //   // await MediaService.resizeImage(imagePath, MediaService.validatedSize(size))
  //   //   .toFile(newpath);
  // }

  static async blurAndStore(mediaId: string, blurredMediaId: string) {
    const mediaName = this.createImageName(SIZE_BIG, blurredMediaId);

    (await this.blurImage(mediaName))
      .toFile(`./uploads/${mediaName}`);
  }

  static async deleteImages(imageId: string) {
    return await this.deleteMedia(this.getImageNames(imageId));
    // for (const size of ALL_SIZES) {
    //   // await fs.rm(`./uploads/${size}_${imageId}`);
    //   await fs.rm(`./uploads/${imageId}`);
    // }
  }

  static deleteMedia(mediaKeys: string | string[]) {

  }

  // static mediaPath(mediaId: string, size?: string) {
  //   // if (isProd()) {
  //   //   return `${config.CDN_PATH}/${size ? `${size}_` : ''}${mediaId}`;
  //   // }

  //   return `${config.DOMAIN_MANE}/api/media/${size ? `${size}_` : ''}${mediaId}`;
  // }
}
