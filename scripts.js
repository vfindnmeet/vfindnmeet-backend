const { error } = require('./dist/core/logger');
const ServiceDiscoveryx = require('./dist/core/service_discovery');
const ServiceDiscoveryRepo = require('./dist/core/service_discovery_repo');
const PageRepository = require('./dist/repositories/page_repository');
const MediaService = require('./dist/services/media_service');
const { currentTimeMs } = require('./dist/utils');

const backfillInterests = () => {
  ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
    try {
      const compatibilityRepository = await serviceDiscovery.get('compatibility_repository');
      const compatibilityService = await serviceDiscovery.get('compatibility_service');
      const userRepository = await serviceDiscovery.get('user_repository');
      const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

      const users = (await con.query(`select id from users where status = 'active'`)).rows?.map(({ id }) => id) ?? [];

      for (const userId of users) {
        try {
          con.query('BEGIN');

          await compatibilityService.calculateInterestsCompatibility(userId);
          await userRepository.setInterestsProcessedAt(userId);

          con.query('COMMIT');
        } catch (e) {
          con.query('ROLLBACK');

          throw e;
        }
      }
    } catch (e) {
      error(e);
    }

    console.log('DONE!');
  });
};

const sendMessageFromAdmin = (toUserId, text) => {
  ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
    const chatService = await serviceDiscovery.get('chat_service');
    const chatRepository = await serviceDiscovery.get('chat_repository');
    const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

    try {
      con.query('BEGIN');

      const adminPageId = PageRepository.getAppPageId();
      const chatId = await chatRepository.getCommonChatId(adminPageId, toUserId);

      await chatService.createAndSend({ userId: adminPageId, chatId, text });

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      console.error(e);

      throw e;
    }
  });
};

const resetSearchPrefAges = (toUserId, text) => {
  ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
    const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

    try {
      con.query('BEGIN');

      await con.query('UPDATE search_preferences SET from_age = NULL, to_age = NULL');

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      console.error(e);

      throw e;
    }
  });
};

const backfillOnlineState = () => {
  ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
    const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

    try {
      con.query('BEGIN');

      let c = 0;
      const now = currentTimeMs();

      const userIds = (await con.query('SELECT id FROM users WHERE last_online_at IS NULL ORDER BY created_at ASC')).rows.map(({ id }) => id);

      for (const id of userIds) {
        await con.query('UPDATE users SET last_online_at = $1, is_online = false WHERE id = $2', [now + c++, id]);
      }

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      console.error(e);

      throw e;
    }
  });
};

const validateProfileImages = () => {
  ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
    const userMediaService = await serviceDiscovery.get('user_media_service');
    const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

    const resp = (await con.query("SELECT id, profile_image_id, created_at FROM users WHERE status = 'active' AND profile_image_id IS NOT NULL ORDER BY created_at ASC")).rows;

    let total = 0;
    let invalid = 0;
    for (const { id, profile_image_id, created_at } of resp) {
      const imageName = MediaService.createImageName(
        MediaService.SIZE_BIG,
        profile_image_id
      );

      try {
        total++;
        const valid = await MediaService.validateImage(imageName);

        if (valid) {
          console.log(`${invalid}/${total}`);

          continue;
        }
        console.log(`${++invalid}/${total}`);

        try {
          con.query('BEGIN');

          await userMediaService.deleteUserImage(id, profile_image_id, 1);

          con.query('COMMIT');
        } catch (e) {
          con.query('ROLLBACK');

          throw e;
        }
      } catch (e) {
        console.log('imgName:', imageName);
        console.log('createdAt:', created_at);

        console.error(e);
      }
    }
  });
};

const blurImage = (mediaId) => {
  MediaService.default.localBlurAndStore(mediaId, 'blr');
  // try {
  //   ServiceDiscoveryRepo.default.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
  //     const userMediaService = await serviceDiscovery.get('user_media_service');
  //     const con = await serviceDiscovery.get('db_connection');

  //     try {
  //       con.query('BEGIN');

  //       await userMediaService.blurProfileImage(userId);

  //       con.query('COMMIT');
  //     } catch (e) {
  //       con.query('ROLLBACK');

  //       console.error(e);

  //       throw e;
  //     }
  //   });
  // } catch (ex) {
  //   console.log(ex);
  // }
};

const localResizeAndStrore = (mediaId) => {
  try {
    MediaService.default.storeLocaly(`./uploads/${mediaId}`, 'b992f421-7aef-486c-84fa-d14172d40264');
    // MediaService.default.localResizeAndStrore(mediaId, 'b992f421-7aef-486c-84fa-d14172d40264');
  } catch (ex) {
    console.log(ex);
  }
};

module.exports = {
  backfillInterests,
  sendMessageFromAdmin,
  resetSearchPrefAges,
  backfillOnlineState,
  validateProfileImages,
  blurImage,
  localResizeAndStrore
};
