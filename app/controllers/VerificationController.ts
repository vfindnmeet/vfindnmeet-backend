import { Controller } from '../core/Controller';
import MediaService from '../services/media/MediaService';
import formidable from 'formidable';
import MediaRepository from '../repositories/MediaRepository';
import SessionTokenRepository from '../repositories/SessionTokenRepository';
import UserRepository from '../repositories/UserRepository';
// import VerificationStatus from '../models/enums/VerificationStatus';
import VerificationService from '../services/VerificationService';
import { isProd } from '../utils';
import { v4 } from 'uuid';
import { sendVerificationRequestQueue } from '../VerificationJob';

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

// const formParse = (req: any) => {
//   const form = new formidable.IncomingForm();

//   return new Promise((resolve, reject) => {
//     form.parse(req, (err: any, fields: any, files: any) => {
//       if (err) {
//         reject(err);

//         return;
//       }

//       resolve({ fields, files });
//     });
//   });
// };

export default class VerificationController extends Controller {
  async status(req: any, res: any) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const { profile_image_id, verification_status } = await userRepository.findById(
      ['profile_image_id', 'verification_status'],
      loggedUserId
    );

    res.json({
      profileImageId: profile_image_id,
      verificationStatus: verification_status
    });
  }

  async create(req: any, res: any) {
    const token = this.getAuthToken(req);
    // const replaceImageId = req.query.replaceImageId;
    const width = +req.query.width;
    const height = +req.query.height;

    // console.log('replaceImageId:', replaceImageId);

    const mediaRepository: MediaRepository = await this.getService('media_repository');
    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const userRepository: UserRepository = await this.getService('user_repository');
    const verificationService: VerificationService = await this.getService('verification_service');
    // const userMediaService: UserMediaService = await this.getService('user_media_service');
    // const userMediaService = await this.getService('user_media_service');
    const con = await this.getConnection();

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    // const verificationStatus = (await userRepository.findById('verification_status', loggedUserId)).verification_status;

    // if ([VerificationStatus.PENDING, VerificationStatus.VERIFIED].includes(verificationStatus)) {
    //   res.status(201).end();

    //   return;
    // }

    try {
      con.query('BEGIN');

      const { files }: any = await parseForm(req);
      // console.log('files:');
      // console.log(files);
      const oldpath = files['image'].path;
      // console.log('FILES:');
      // console.log(files);
      console.log(`w: |${width}|, h: |${height}|`);
      console.log(`w: |${files['image'].width}|, h: |${files['image'].height}|`);

      // let createdAt: number | undefined;

      const mediaId = v4();
      // const media = await mediaRepository.createMediaMetadata('image', files['image'].type);
      // await verificationService.requestVerification(loggedUserId, media.id);
      const [media, verificationRequest] = await Promise.all([
        mediaRepository.createMediaMetadata('image', files['image'].type, mediaId),
        verificationService.requestVerification(loggedUserId, mediaId)
      ]);

      // console.log('VERIF!', media);

      // await MediaService.resizeAndStore(
      //   oldpath,
      //   media.id,
      //   files['image'].type,
      //   { width, height }
      // );

      await MediaService.resizeAndStore(
        oldpath,
        mediaId,
        files['image'].type,
        { width: 600, height: 600 }
      );

      // if (isProd()) {
      //   await MediaService.resizeAndStoreS3(
      //     oldpath,
      //     mediaId,
      //     { width: 600, height: 600 },
      //     files['image'].type
      //   );
      // } else {
      //   await MediaService.resizeAndStoreLocaly(
      //     oldpath,
      //     mediaId,
      //     { width: 600, height: 600 }
      //   );
      //   // await MediaService.storeImageLocaly(oldpath, media.id);
      //   // await MediaService.storeLocaly(oldpath, media.id, { width, height });
      //   // await MediaService.storeLocaly(oldpath, media.id, MediaService.SIZE_BIG);
      // }

      // queue verificationRequest
      await sendVerificationRequestQueue({
        verificationRequestId: verificationRequest.id
      });

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }
}
