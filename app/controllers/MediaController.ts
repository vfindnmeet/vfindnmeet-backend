import { Controller } from '../core/Controller';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import MediaService from '../services/media/MediaService';
import InappropriateImageError from '../errors/InappropriateImageError';
import MediaRepository from '../repositories/MediaRepository';
import SessionTokenRepository from '../repositories/SessionTokenRepository';
// import multer from 'multer';
import UserMediaService from '../services/UserMediaService';
import UserRepository from '../repositories/UserRepository';
import { makeProfileImage, mapImage, mapImages } from '../utils';
import BadRequestError from '../errors/BadRequestError';
import LikeRepository from '../repositories/LikeRepository';

const parseForm = (req: any) => {
  const form = new formidable.IncomingForm();

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
};

export default class MediaController extends Controller {
  handleError(err: any) {
    if (err instanceof InappropriateImageError) {
      return { code: 400, message: err.message };
    }

    return super.handleError(err);
    // return { code: 500, msg: 'Error uploading image' };
  }

  // dev only usage
  async get(req: any, response: any) {
    const targetMediaId = req.params.id;

    const likeRepository: LikeRepository = await this.getService('like_repository');

    const a = targetMediaId.split('_');
    let mediaId;
    let size = '';
    if (a.length === 2) {
      size = `${a[0]}_`;
      mediaId = a[1];
    } else {
      mediaId = a[0];
    }

    const media = await likeRepository.getMediaMetadata(mediaId);
    const filePath = path.join(__dirname, `/../../uploads/${size}${mediaId}`);

    // const filePath = path.join(__dirname, `/../../uploads/${mediaId}`);
    // const filePath = path.join(__dirname, `/../../uploads/BLUR_blr`);
    const stat = fs.statSync(filePath);

    response.writeHead(200, {
      'Content-Type': media.mime_type,
      'Content-Length': stat.size
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(response);
  }

  async uploadUserImage(req: any, res: any) {
    const token = this.getAuthToken(req);
    const replaceImageId = req.query.replaceImageId;
    const width = +req.query.width;
    const height = +req.query.height;

    console.log('replaceImageId:', replaceImageId);

    const mediaRepository: MediaRepository = await this.getService('media_repository');
    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const userRepository: UserRepository = await this.getService('user_repository');
    const userMediaService: UserMediaService = await this.getService('user_media_service');
    // const userMediaService = await this.getService('user_media_service');
    const con = await this.getConnection();

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    let userImages = await mediaRepository.getUserImages(loggedUserId);

    try {
      con.query('BEGIN');

      const { files }: any = await parseForm(req);
      const oldpath = files['image'].path;
      console.log('FILES:');
      console.log(files);
      console.log(`w: |${width}|, h: |${height}|`);
      console.log(`w: |${files['image'].width}|, h: |${files['image'].height}|`);

      let createdAt: number | undefined;
      const { profile_image_id } = await userRepository.findById(['profile_image_id'], loggedUserId);
      if (replaceImageId && userImages.filter(({ image_id }: any) => image_id === replaceImageId).length > 0) {
        if (profile_image_id === replaceImageId) {
          throw new BadRequestError('Cannot delete profile image');
        }

        await userMediaService.deleteUserImage(loggedUserId, replaceImageId);
        createdAt = userImages.find(({ image_id }: any) => image_id === replaceImageId).created_at;
      }

      const media = await mediaRepository.createMediaMetadata('image', files['image'].type);
      await Promise.all([
        await mediaRepository.createUserImage(loggedUserId, media.id, createdAt),
        await userRepository.incrementImagesCount(loggedUserId)
      ]);

      userImages = await mediaRepository.getUserImages(loggedUserId);

      await MediaService.resizeAndStore(
        oldpath,
        media.id,
        files['image'].type,
        { width, height }
      );

      con.query('COMMIT');

      res.json({
        images: mapImages(makeProfileImage(profile_image_id, userImages))
      });
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async uploadImage(req: any, res: any) {
    const token = this.getAuthToken(req);
    const replaceImageId = req.query.replaceImageId;
    const width = +req.query.width;
    const height = +req.query.height;

    console.log('replaceImageId:', replaceImageId);

    const mediaRepository: MediaRepository = await this.getService('media_repository');
    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      const { files }: any = await parseForm(req);
      const oldpath = files['image'].path;
      console.log('FILES:');
      console.log(files);
      console.log(`w: |${width}|, h: |${height}|`);
      console.log(`w: |${files['image'].width}|, h: |${files['image'].height}|`);

      const media = await mediaRepository.createMediaMetadata('image', files['image'].type);

      await MediaService.resizeAndStore(
        oldpath,
        media.id,
        files['image'].type,
        { width, height }
      );

      con.query('COMMIT');

      res.json(mapImage(media.id));
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async deleteImage(req: any, res: any) {
    const targetImageId = req.query.targetImageId;

    const con = await this.getConnection();
    const mediaRepository: MediaRepository = await this.getService('media_repository');
    const userMediaService: UserMediaService = await this.getService('user_media_service');

    const image = await mediaRepository.getMediaMetadata(targetImageId);
    if (!image) {
      res.status(201).end();

      return;
    }

    try {
      con.query('BEGIN');

      await userMediaService.deleteImage(targetImageId);

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async deleteUserImage(req: any, res: any) {
    const token = this.getAuthToken(req);
    // const position = req.query.position;
    const targetImageId = req.query.targetImageId;

    const con = await this.getConnection();
    const mediaRepository: MediaRepository = await this.getService('media_repository');
    const userMediaService: UserMediaService = await this.getService('user_media_service');
    const userRepository: UserRepository = await this.getService('user_repository');
    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const images = await mediaRepository.getUserImages(loggedUserId);
    const userImage = images.find(({ image_id }: { image_id: string }) => image_id == targetImageId);
    if (!userImage) {
      res.json({ images: MediaService.mapImages(images) });

      return;
    }
    const { profile_image_id } = await userRepository.findById(['profile_image_id'], loggedUserId);
    if (profile_image_id === targetImageId) {
      throw new BadRequestError('Cannot delete profile image');
    }

    try {
      con.query('BEGIN');

      await userMediaService.deleteUserImage(loggedUserId, userImage.image_id);

      con.query('COMMIT');

      // const userImages = await mediaRepository.getUserImages(loggedUserId);

      res.json({
        images: mapImages(images.filter(({ image_id }: any) => image_id !== targetImageId))
      });
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }
}
