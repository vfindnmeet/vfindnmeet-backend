import OnboardingRepository from "../repositories/OnboardingRepository";
import SessionTokenRepository from "../repositories/SessionTokenRepository";
import { Controller } from '../core/Controller';
import { calculateAge, currentTimeMs, mapImages } from '../utils';
import UserStatus from '../models/enums/UserStatus';
import MediaRepository from '../repositories/MediaRepository';
import UserRepository from "../repositories/UserRepository";
import UserMediaService from "../services/UserMediaService";
import * as es from '../services/ESService';
import SearchPreferenceRepository from "../repositories/SearchPreferenceRepository";
import LocationRepository from "../repositories/LocationRepository";

const STEPS = {
  GENDER: 1,
  ORIENTATION: 2,
  NAME: 3,
  BIRTHDAY: 4,
  PHOTO: 5,
};

export default class OnboardingController extends Controller {
  async getStep(req: any, res: any) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const onboardingRepository: OnboardingRepository = await this.getService('onboarding_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const step = await onboardingRepository.getStep(loggedUserId);

    res.json(step);
  }

  async getImages(req: any, res: any) {
    const token = this.getAuthToken(req);

    const mediaRepository: MediaRepository = await this.getService('media_repository');
    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const images = await mediaRepository.getUserImages(loggedUserId);

    res.json({
      images: mapImages(images)
    });
  }

  async setData(req: any, res: any) {
    const token = this.getAuthToken(req);
    const name = req.body.name;
    const birthday = req.body.birthday;
    const gender = req.body.gender;
    const interestedIn = req.body.interestedIn;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const onboardingRepository: OnboardingRepository = await this.getService('onboarding_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const step = await onboardingRepository.getStep(loggedUserId);

    if (step.completed_at) {
      return res.status(200).json({ completed_at: step.completed_at });
    } else if (STEPS.GENDER != step.step) {
      return res.status(200).json({ step: step.step });
    }

    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      const a = birthday.split('-');
      await con.query(
        'UPDATE users SET name = $1, birthday = $2, age = $3, gender = $4, interested_in = $5 WHERE id = $6',
        [name, birthday, calculateAge(new Date(`${a[2]}/${a[1]}/${a[0]}`)), gender, interestedIn, loggedUserId]
      );

      const newStep = STEPS.PHOTO;
      await onboardingRepository.incrementStep(loggedUserId, newStep);

      res.json({ step: newStep });

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async setImageStepPassed(req: any, res: any) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.getService('session_token_repository');
    const onboardingRepository = await this.getService('onboarding_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const step = await onboardingRepository.getStep(loggedUserId);

    if (step.completed_at) {
      return res.status(200).json({ completed_at: step.completed_at });
    } else if (STEPS.PHOTO != step.step) {
      return res.status(200).json({ step: step.step });
    }

    const newStep = step.step + 1;
    await onboardingRepository.incrementStep(loggedUserId, newStep);

    res.json({ step: newStep });
  }

  async complete(req: any, res: any) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    const onboardingRepository: OnboardingRepository = await this.getService('onboarding_repository');
    const userRepository: UserRepository = await this.getService('user_repository');
    const userMediaService: UserMediaService = await this.getService('user_media_service');
    const searchPreferenceRepository: SearchPreferenceRepository = await this.getService('search_preference_repository');
    const locationRepository: LocationRepository = await this.getService('location_repository');

    // const chatRepository = await this.getService('chat_repository');
    // const chatService = await this.getService('chat_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const step = await onboardingRepository.getStep(loggedUserId);

    console.log('loggedUserId:', loggedUserId);
    if (step.completed_at) {
      return res.status(200).json({ completed_at: step.completed_at });
    } else if (STEPS.PHOTO != step.step) {
      return res.status(200).json({ step: step.step });
    }

    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      const foundUser = await userRepository.findById(['age', 'gender', 'interested_in'], loggedUserId);

      const [{ completedAt }] = await Promise.all([
        onboardingRepository.setComplete(loggedUserId),
        userRepository.setStatus(loggedUserId, UserStatus.ACTIVE),
        userMediaService.setDefaultProfileImage(loggedUserId),
        searchPreferenceRepository.create(loggedUserId, {
          distance: 60,
          fromAge: SearchPreferenceRepository.MIN_AGE,
          toAge: SearchPreferenceRepository.MAX_AGE
        }),
        es.indexUser({
          userId: loggedUserId,
          age: foundUser.age,
          gender: foundUser.gender,
          interestedIn: foundUser.interested_in,
          location: await locationRepository.getPosition(loggedUserId)
        }).catch(() => { })
      ]);
      // await es.indexUser({
      //   userId: loggedUserId,
      //   age: foundUser.age,
      //   gender: foundUser.gender,
      //   interestedIn: foundUser.interested_in,
      //   location: await locationRepository.getPosition(loggedUserId)
      // });
      // const loggedUser = await userRepository.findById(['id', 'name'], loggedUserId);

      // const chatId = await chatRepository.createChat();
      // const pageId = PageRepository.getAppPageId();

      res.json({ completed_at: completedAt });

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }
}
