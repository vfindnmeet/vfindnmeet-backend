// import sharp from 'sharp';
// import AWS from 'aws-sdk';
// import config from '../config/config';
// import { isProd } from '../utils';
// import { promises } from 'fs';
// import { detectFaces, detectInappropriate } from './ImgRecognitionService';
// import InappropriateImageError from '../errors/inappropriate_image_error';

// const fs = promises;

// const SIZE_SMALL = 'small';
// const SIZE_BIG = 'big';

// type ImageSize = { width: number; height: number };

// const ALL_SIZES = [SIZE_SMALL, SIZE_BIG];

// // const MAX_SIZE = 800;

// const SIZES: { [key: string]: number } = {
//   [SIZE_SMALL]: 200,
//   [SIZE_BIG]: 800
// };

// // export const SIZE_MAX_SMALL = 200;
// // export const SIZE_MAX_BIG = 800;

// // export type MaxSize = 200 | 800;

// // const SIZES: { [key: string]: any } = {
// //   [SIZE_SMALL]: {
// //     size: SIZE_SMALL,
// //     height: 200,
// //     width: 200
// //   },
// //   [SIZE_BIG]: {
// //     size: SIZE_BIG,
// //     height: 600,
// //     width: 600
// //   }
// // };

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
//       for (const size of ALL_SIZES) {
//         const resizeSize = MediaService.getTargetResizeSize(imageSize, size);
//         // await MediaService.storeLocaly(imagePath, mediaId, imageSize, size);
//         await MediaService.resizeAndStoreS3(
//           imagePath,
//           MediaService.createImageName(size, mediaId), // mediaId,
//           resizeSize,
//           contentType
//         );
//       }


//       // const bigImageName = await MediaService._storeS3(
//       //   imagePath,
//       //   mediaId,
//       //   SIZES[SIZE_BIG],
//       //   contentType
//       // );

//       // const valid = await MediaService.validateImage(bigImageName);
//       // if (!valid) {
//       //   await MediaService.deleteMedia(bigImageName);

//       //   throw new InappropriateImageError();
//       // }

//       // await this._storeS3(
//       //   imagePath,
//       //   mediaId,
//       //   SIZES[SIZE_SMALL],
//       //   contentType
//       // );
//     } else {
//       for (const size of ALL_SIZES) {
//         await MediaService.storeLocaly(imagePath, mediaId, imageSize, size);
//       }
//       // for (const size of ALL_SIZES) {
//       //   await MediaService._storeLocaly(imagePath, mediaId, SIZES[size]);
//       // }
//     }
//   }

//   static async validateImage(imageName: string) {
//     const hasFaces = await detectFaces(imageName);
//     if (!hasFaces) {
//       return false;
//     }

//     const isInappropriate = await detectInappropriate(imageName);
//     if (isInappropriate) {
//       return false;
//     }

//     return true;
//   }

//   private static async storeLocaly(
//     imagePath: string,
//     mediaId: string,
//     imageSize: ImageSize,
//     targetSize: string
//   ) {
//     const newpath = `./uploads/${targetSize}_${mediaId}`;
//     // const maxSize = SIZES[targetSize];

//     // const resizeSize: { width?: number; height?: number; } = {};
//     // if (imageSize.height > imageSize.width) {
//     //   resizeSize.height = maxSize;
//     // } else {
//     //   resizeSize.width = maxSize;
//     // }
//     const resizeSize = MediaService.getTargetResizeSize(imageSize, targetSize);

//     await this.resizeAndStoreLocaly(imagePath, newpath, resizeSize);

//     // const newpath = `./uploads/${targetSize}_${mediaId}`;
//     // const maxSize = SIZES[targetSize];

//     // const resizeSize: { width?: number; height?: number; } = {};
//     // if (imageSize.height > imageSize.width) {
//     //   resizeSize.height = maxSize;
//     // } else {
//     //   resizeSize.width = maxSize;
//     // }

//     // await this.resizeImage(imagePath, resizeSize)
//     //   .toFile(newpath);
//   }

//   private static getTargetResizeSize(imageSize: ImageSize, targetSize: string) {
//     const maxSize = SIZES[targetSize];
//     const resizeSize: { width?: number; height?: number; } = {};
//     if (imageSize.height > imageSize.width) {
//       resizeSize.height = maxSize;
//     } else {
//       resizeSize.width = maxSize;
//     }

//     return resizeSize;
//   }

//   static async resizeAndStoreLocaly(
//     imagePath: string,
//     name: string,
//     // targetSize: string
//     imageSize: { width?: number; height?: number; },
//   ) {
//     const newpath = `./uploads/${name}`;
//     // const maxSize = SIZES[targetSize];

//     // const resizeSize: { width?: number; height?: number; } = {};
//     // if (imageSize.height > imageSize.width) {
//     //   resizeSize.height = maxSize;
//     // } else {
//     //   resizeSize.width = maxSize;
//     // }

//     await this.resizeImage(imagePath, imageSize)
//       .toFile(newpath);
//   }

//   static async storeImageLocaly(imagePath: string, imageName: string) {
//     const newpath = `./uploads/${imageName}`;

//     await fs.rename(imagePath, newpath);
//     // await MediaService.resizeImage(imagePath, MediaService.validatedSize(size))
//     //   .toFile(newpath);
//   }

//   // static async storeLocaly(imagePath: string, imageName: string) {
//   //   // const newpath = `./uploads/${imageName}`;

//   //   // await fs.rename(imagePath, newpath);
//   //   // // await MediaService.resizeImage(imagePath, MediaService.validatedSize(size))
//   //   // //   .toFile(newpath);
//   // }

//   static validatedSize(size: string) {
//     return typeof size === 'string' ? SIZES[size] : size;
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

//   // static async _storeS3(imagePath: string, mediaId: string, size: any, contentType: string) {
//   //   const imageName = `${size.size}_${mediaId}`;
//   //   await MediaService.storeS3(imagePath, imageName, size, contentType);

//   //   return imageName;
//   // }

//   // static async storeS3(imagePath: string, imageName: string, size: any, contentType: string) {
//   //   const buffer = await MediaService.resizeImage(imagePath, MediaService.validatedSize(size)).toBuffer();

//   //   await MediaService.s3Upload(imageName, contentType, buffer);

//   //   return imageName;
//   // }

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

//   // async resize(imagePath: string) {
//   //   const imageData = await sharp(imagePath, { failOnError: false })
//   //     .resize({ height: 200, width: 200 })
//   //     .toBuffer();

//   //   // await fs.writeFile(imageData);
//   // }

//   static async deleteImages(imageId: string) {
//     if (isProd()) {
//       return await MediaService.deleteMedia(MediaService.getImageNames(imageId));
//     }

//     // for (const size of ALL_SIZES) {
//     //   // await fs.rm(`./uploads/${size}_${imageId}`);
//     //   await fs.rm(`./uploads/${imageId}`);
//     // }
//   }

//   static deleteMedia(mediaKeys: string[] | string) {
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
//     // if ('male' === user.gender) {
//     //   return '/assets/man.jpg';
//     // }

//     // return '/assets/female.jpg';
//   }

//   static mediaPath(mediaId: string, size?: string) {
//     if (isProd()) {
//       return `${config.CDN_PATH}/${size ? `${size}_` : ''}${mediaId}`;
//     }

//     return `${config.DOMAIN_MANE}/api/media/${size ? `${size}_` : ''}${mediaId}`;
//   }

//   static getImageNames(imageId: string) {
//     return ALL_SIZES.map(size => MediaService.createImageName(size, imageId));
//   }

//   static createImageName(size: string, imageId: string) {
//     return `${size}_${imageId}`;
//   }

//   static async blurAndStore(mediaId: string, blurredMediaId: string) {
//     if (isProd()) {

//       return;
//     }

//     const data = await this.blurImage(mediaId);

//     data.toFile(`./uploads/${SIZE_BIG}_${blurredMediaId}`);
//   }

//   static async blurImage(mediaId: string) {
//     return sharp(`./uploads/${SIZE_BIG}_${mediaId}`, { failOnError: false })
//       .blur(35)
//       .withMetadata();
//   }

//   // static async localResizeAndStrore(mediaId: string, blurredMediaId: string) {
//   //   const data = await this.resize(mediaId);

//   //   data.toFile(`./uploads/BLUR_${blurredMediaId}`);
//   // }

//   // static async resizeAndStrore(
//   //   media: any,
//   //   mediaId: string,
//   //   size: { width?: number, height?: number }
//   // ) {
//   //   // `./uploads/${mediaId}`
//   //   const data = await this.resizeImage(media, size);

//   //   data.toFile(`./uploads/${mediaId}`);
//   // }

//   private static resizeImage(media: any, size: { width?: number, height?: number }) {
//     return sharp(media, { failOnError: false })
//       .resize(size)
//       .withMetadata();
//   }
// }
