// import sharp from 'sharp';
// import AWS from 'aws-sdk';
// import config from '../config/config';
// import { isProd } from '../utils';
// import { promises } from 'fs';
// import { detectFaces, detectInappropriate } from './ImgRecognitionService';
// import InappropriateImageError from '../errors/InappropriateImageError';
// import { validateImage } from '../validation/ImageValidators';

// const fs = promises;

// const SIZE_SMALL = 'small';
// const SIZE_BIG = 'big';

// type ImageSize = { width: number; height: number };

// const ALL_SIZES = [SIZE_SMALL, SIZE_BIG];

// const SIZES: { [key: string]: number } = {
//   [SIZE_SMALL]: 200,
//   [SIZE_BIG]: 800
// };

// const getTargetResizeSize = (imageSize: ImageSize, targetSize: string) => {
//   const maxSize = SIZES[targetSize];
//   const resizeSize: { width?: number; height?: number; } = {};
//   if (imageSize.height > imageSize.width) {
//     resizeSize.height = maxSize;
//   } else {
//     resizeSize.width = maxSize;
//   }

//   return resizeSize;
// };

// const s3 = new AWS.S3({
//   accessKeyId: config.AWS.ACCESS_KEY,
//   secretAccessKey: config.AWS.SECRET_KEY
// });

// export default class MediaService {
//   public static SIZE_SMALL = 'small';
//   public static SIZE_BIG = 'big';

//   static async resizeAndStore(
//     imagePath: string,
//     mediaId: string,
//     contentType: string,
//     imageSize: ImageSize
//   ) {
//     if (isProd()) {
//       // const resizeSize = getTargetResizeSize(imageSize, SIZE_BIG);
//       // await MediaService.storeLocaly(imagePath, mediaId, imageSize, size);
//       const bigImageName = await MediaService.resizeAndStoreS3(
//         imagePath,
//         MediaService.createImageName(SIZE_BIG, mediaId), // mediaId,
//         getTargetResizeSize(imageSize, SIZE_BIG),
//         contentType
//       );

//       const valid = await validateImage(bigImageName);
//       if (!valid) {
//         await MediaService.deleteMedia(bigImageName);

//         throw new InappropriateImageError();
//       }

//       await MediaService.resizeAndStoreS3(
//         imagePath,
//         MediaService.createImageName(SIZE_SMALL, mediaId), // mediaId,
//         getTargetResizeSize(imageSize, SIZE_SMALL),
//         contentType
//       );

//       // for (const size of ALL_SIZES) {
//       //   const resizeSize = getTargetResizeSize(imageSize, size);
//       //   // await MediaService.storeLocaly(imagePath, mediaId, imageSize, size);
//       //   await MediaService.resizeAndStoreS3(
//       //     imagePath,
//       //     MediaService.createImageName(size, mediaId), // mediaId,
//       //     resizeSize,
//       //     contentType
//       //   );
//       // }
//     } else {
//       for (const size of ALL_SIZES) {
//         await MediaService.storeLocaly(imagePath, mediaId, imageSize, size);
//       }
//     }
//   }

//   private static async storeLocaly(
//     imagePath: string,
//     mediaId: string,
//     imageSize: ImageSize,
//     targetSize: string
//   ) {
//     const newpath = `./uploads/${targetSize}_${mediaId}`;

//     const resizeSize = getTargetResizeSize(imageSize, targetSize);

//     console.log(`1imagePath:${imagePath}|newpath:${newpath}`);

//     await this.resizeAndStoreLocaly(imagePath, newpath, resizeSize);
//   }

//   static async resizeAndStoreLocaly(
//     imagePath: string,
//     name: string,
//     // targetSize: string
//     imageSize: { width?: number; height?: number; },
//   ) {
//     const newpath = name;
//     // const newpath = `./uploads/${name}`;
//     console.log(`2imagePath:${imagePath}|newpath:${newpath}`);

//     await this.resizeImage(imagePath, imageSize)
//       .toFile(newpath);
//   }

//   static async storeImageLocaly(imagePath: string, imageName: string) {
//     const newpath = `./uploads/${imageName}`;
//     console.log(`3imagePath:${imagePath}|newpath:${newpath}`);

//     await fs.rename(imagePath, newpath);
//     // await MediaService.resizeImage(imagePath, MediaService.validatedSize(size))
//     //   .toFile(newpath);
//   }

//   static async resizeAndStoreS3(
//     imagePath: string,
//     imageName: string,
//     size: { width?: number; height?: number; },
//     contentType: string
//   ) {
//     const buffer = await MediaService.resizeImage(imagePath, size).toBuffer();

//     await MediaService.s3Upload(imageName, contentType, buffer);

//     return imageName;
//   }

//   private static s3Upload(Key: string, ContentType: string, Body: any) {
//     const params = {
//       Bucket: config.S3_BUCKET_NAME,
//       Key,
//       Body,
//       ContentType,
//       ACL: 'public-read'
//     };

//     return new Promise((resolve: any, reject: any) => {
//       s3.upload(params, (err: any) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve();
//         }
//       });
//     });
//   }

//   static async deleteImages(imageId: string) {
//     if (isProd()) {
//       return await MediaService.deleteMedia(MediaService.getImageNames(imageId));
//     }

//     // for (const size of ALL_SIZES) {
//     //   // await fs.rm(`./uploads/${size}_${imageId}`);
//     //   await fs.rm(`./uploads/${imageId}`);
//     // }
//   }

//   static deleteMedia(mediaKeys: string | string[]) {
//     mediaKeys = Array.isArray(mediaKeys) ? mediaKeys : [mediaKeys];

//     const params = {
//       Bucket: config.S3_BUCKET_NAME,
//       Delete: {
//         Objects: mediaKeys.map(Key => ({ Key }))
//       }
//     };

//     return new Promise((resolve, reject) => {
//       s3.deleteObjects(params, (err, data) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(data);
//         }
//       });
//     });
//   }

//   private static getS3Media(mediaId: string): Promise<any> {
//     const params = {
//       Bucket: config.S3_BUCKET_NAME,
//       Key: mediaId
//     };

//     return new Promise((resolve, reject) => {
//       s3.getObject(params, (err, data: AWS.S3.GetObjectOutput) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(data);
//         }
//       });
//     });
//   }

//   static mapImages(images: any[]) {
//     return images.map(image => ({
//       position: image.position,
//       small: MediaService.mediaPath(image.image_id, SIZE_SMALL),
//       big: MediaService.mediaPath(image.image_id, SIZE_BIG),
//     }));
//   }

//   static getProfileImagePath(user: any, size = SIZE_BIG) {
//     if (user.profile_image_id) {
//       return MediaService.mediaPath(user.profile_image_id, size);
//     }

//     return null;
//   }

//   static mediaPath(mediaId: string, size?: string) {
//     if (isProd()) {
//       return `${config.CDN_PATH}/${size ? `${size}_` : ''}${mediaId}`;
//     }

//     return `${config.DOMAIN_MANE}/api/media/${size ? `${size}_` : ''}${mediaId}`;
//   }

//   private static getImageNames(imageId: string) {
//     return ALL_SIZES.map(size => MediaService.createImageName(size, imageId));
//   }

//   static createImageName(size: string, imageId: string) {
//     return `${size}_${imageId}`;
//   }

//   static async blurAndStore(mediaId: string, blurredMediaId: string) {
//     const mediaName = MediaService.createImageName(SIZE_BIG, blurredMediaId);

//     if (isProd()) {
//       const media: AWS.S3.GetObjectOutput = await MediaService.getS3Media(mediaId);

//       await MediaService.s3Upload(
//         mediaName,
//         media.ContentType as string,
//         await this.blurImage(media.Body as Buffer)
//       );
//     } else {

//       console.log(`4mediaName:${mediaName}`);
//       (await MediaService.blurImage(mediaName))
//         .toFile(`./uploads/${mediaName}`);
//     }
//   }

//   private static async blurImage(media: Buffer | string) {
//     return sharp(media, { failOnError: false })
//       .blur(35)
//       .withMetadata();
//   }

//   private static resizeImage(media: any, size: { width?: number, height?: number }) {
//     return sharp(media, { failOnError: false })
//       .resize(size)
//       .withMetadata();
//   }
// }
