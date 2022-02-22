import AWS from 'aws-sdk';
import config from '../../config/config';
import { promises } from 'fs';
import InappropriateImageError from '../../errors/InappropriateImageError';
import { validateImage } from '../../validation/ImageValidators';
import BaseMediaService, { ALL_SIZES, getTargetResizeSize, ImageSize, SIZE_BIG, SIZE_SMALL } from './BaseMediaService';

const fs = promises;

const s3 = new AWS.S3({
  accessKeyId: config.AWS.ACCESS_KEY,
  secretAccessKey: config.AWS.SECRET_KEY
});

export default class S3MediaService extends BaseMediaService {
  static async resizeAndStore(
    imagePath: string,
    mediaId: string,
    contentType: string,
    imageSize: ImageSize
  ) {
    const bigImageName = await this.resizeAndStoreS3(
      imagePath,
      this.createImageName(SIZE_BIG, mediaId), // mediaId,
      getTargetResizeSize(imageSize, SIZE_BIG),
      contentType
    );

    const valid = await validateImage(bigImageName);
    if (!valid) {
      await this.deleteMedia(bigImageName);

      throw new InappropriateImageError();
    }

    await this.resizeAndStoreS3(
      imagePath,
      this.createImageName(SIZE_SMALL, mediaId), // mediaId,
      getTargetResizeSize(imageSize, SIZE_SMALL),
      contentType
    );

    // for (const size of ALL_SIZES) {
    //   const resizeSize = getTargetResizeSize(imageSize, size);
    //   // await MediaService.storeLocaly(imagePath, mediaId, imageSize, size);
    //   await MediaService.resizeAndStoreS3(
    //     imagePath,
    //     MediaService.createImageName(size, mediaId), // mediaId,
    //     resizeSize,
    //     contentType
    //   );
    // }
  }

  static async resizeAndStoreS3(
    imagePath: string,
    imageName: string,
    size: { width?: number; height?: number; },
    contentType: string
  ) {
    const buffer = await this.resizeImage(imagePath, size).toBuffer();

    await this.s3Upload(imageName, contentType, buffer);

    return imageName;
  }

  private static s3Upload(Key: string, ContentType: string, Body: any) {
    const params = {
      Bucket: config.S3_BUCKET_NAME,
      Key,
      Body,
      ContentType,
      ACL: 'public-read'
    };

    return new Promise((resolve: any, reject: any) => {
      s3.upload(params, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  static async deleteImages(imageId: string) {
    return await this.deleteMedia(this.getImageNames(imageId));
  }

  static deleteMedia(mediaKeys: string | string[]) {
    mediaKeys = Array.isArray(mediaKeys) ? mediaKeys : [mediaKeys];

    const params = {
      Bucket: config.S3_BUCKET_NAME,
      Delete: {
        Objects: mediaKeys.map(Key => ({ Key }))
      }
    };

    return new Promise((resolve, reject) => {
      s3.deleteObjects(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  static async blurAndStore(mediaId: string, blurredMediaId: string) {
    const mediaName = this.createImageName(SIZE_BIG, blurredMediaId);

    const media: AWS.S3.GetObjectOutput = await this.getS3Media(mediaId);

    await this.s3Upload(
      mediaName,
      media.ContentType as string,
      await this.blurImage(media.Body as Buffer)
    );
  }

  private static getS3Media(mediaId: string): Promise<any> {
    const params = {
      Bucket: config.S3_BUCKET_NAME,
      Key: mediaId
    };

    return new Promise((resolve, reject) => {
      s3.getObject(params, (err, data: AWS.S3.GetObjectOutput) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
}
