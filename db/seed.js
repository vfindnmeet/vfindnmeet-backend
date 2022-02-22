const uuid = require('uuid');
// const PageRepository = require('../app/repositories/page_repository.js');
const { currentTimeMs, calculateAge } = require('../dist/utils.js');
const environment = process.env.ENVIRONMENT || 'development'
const config = require('../knexfile.js')[environment];
const knex = require('knex')(config);
// const QuizService = require('../app/services/quiz_service');
// const QuizRepository = require('../app/repositories/quiz_repository');
// const UserRepository = require('../app/repositories/user_repository');
const { handleWithDBClient } = require('../dist/db');
const {
  insertMultiple,
  getIndexFor
} = require('../dist/services/ESService');

const password = '$2b$10$PP8qMh/3uVjqpF46Z9d71eDMxWj6WkAAt4kvze6fA1VFSWP1JmOfG'; // 1234
const cityId = 'd81b72fd-8520-4403-aba3-17e1eddfc20f'; // Sofia

const randomNumberBetween = (end) => Math.floor(Math.random() * end);

const generateVerificationStatus = () => {
  return ['verified', 'pending', 'rejected'][randomNumberBetween(3)];
};

const dateItem = (n) => n < 10 ? `0${n}` : n;

const getInterestedIn = () => {
  const n = randomNumberBetween(5); // 0 - 4

  if (n >= 0 && n < 2) return 'male';
  else if (n >= 2 && n < 4) return 'female';

  return 'both';
};

const buildUser = (ix) => {
  const ti = ix + 1;
  const gender = randomNumberBetween(2) === 1 ? 'male' : 'female';
  const name = 'male' === gender ? `Male${ti}` : `Female${ti}`;
  const email = `m${ti}@m.com`;
  const birthday = `${1980 + randomNumberBetween(16)}/${dateItem(1 + randomNumberBetween(11))}/${dateItem(1 + randomNumberBetween(27))}`;
  const verificationStatus = generateVerificationStatus();
  const verified = 'verified' === verificationStatus;
  const createdAt = currentTimeMs() + ti; // It'll be the same time otherwise for all seeds.

  return {
    id: uuid.v4(),
    name,
    email,
    password,
    birthday,
    age: calculateAge(new Date(birthday)),
    gender,
    interested_in: getInterestedIn(), //'male' === gender ? 'female' : 'male',
    // city_id: cityId,
    images_count: 0,
    status: 'active',
    verification_status: verificationStatus,
    verified,
    created_at: createdAt
  };
};

addUsers = async (con) => {
  const TOTAL_USERS = 10000;
  const users = [];

  console.log('Seeding dummy users...');
  console.log(`Adding ${TOTAL_USERS} users...`);

  for (let i = 0; i < TOTAL_USERS; i++) {
    const user = buildUser(i);
    await knex('users').insert(user);
    await Promise.all([
      knex('user_info').insert({
        user_id: user.id
      }),
      knex('onboarding').insert({
        user_id: user.id,
        step: 5,
        created_at: currentTimeMs() + i,
        completed_at: currentTimeMs() + i
      }),
      knex('search_preferences').insert({
        user_id: user.id,
        from_age: 18,
        to_age: 70,
        distance: 60,
        income: 'middle',
        created_at: currentTimeMs() + 1
      }),
      insertMultiple(
        getIndexFor(user.gender, user.interested_in),
        {
          user_id: user.id,
          age: user.age,
          location: {
            lat: 42.5845284 + 0.01 * randomNumberBetween(11), //16.43,
            lon: 23.2042665 + 0.01 * randomNumberBetween(11), //43.5435788
          },
          added_at: Date.now() + i
        }
      )
    ]);

    users.push(user);
  }

  return users;
};

// const setUsersSearchPreferences = async (userIds) => {
//   for (const userId of userIds) {
//     await knex('search_preferences').insert({
//       user_id: userId,
//       from_age: 18,
//       to_age: 40,
//       city_id: cityId,
//       created_at: currentTimeMs()
//     });
//   }
// };

const getRandomInt = (max) => Math.floor(Math.random() * max);

const userGenders = (users) => {
  const females = [];
  const males = [];
  for (const user of users) {
    if (user.gender === 'male') {
      males.push(user);
    } else {
      females.push(user);
    }
  }

  return { males, females };
}

const setLikedAndMatches = async (users) => {
  const { males, females } = userGenders(users);

  const likes = [];
  const matches = [];

  console.log(`Preparing matches and likes...`);
  for (const male of males) {
    const M = getRandomInt(20);
    const fIds = [];
    for (let i = 0; i < M; i++) {
      while (1) {
        const female = females[getRandomInt(females.length)];
        if (!fIds.includes(female.id)) {
          fIds.push(female.id);

          break;
        }
      }

    }
    for (const femaleId of fIds) {
      likes.push([male.id, femaleId]);
    }

    const mfIds = [];
    const M2 = getRandomInt(20);
    for (let i = 0; i < M2; i++) {
      while (1) {
        const female = females[getRandomInt(females.length)];
        if (!mfIds.includes(female.id) && !fIds.includes(female.id)) {
          mfIds.push(female.id);

          break;
        }
      }

    }
    for (const femaleId of mfIds) {
      matches.push([male.id, femaleId]);
    }
  }

  console.log(`Adding ${matches.length} likes...`);
  let x = 0;
  for (let i = 0; i < likes.length; i++) {
    let message = null;
    if (getRandomInt(3) === 2) {
      message = `Intro message ${++x}`
    }

    const like = {
      id: uuid.v4(),
      from_user_id: likes[i][0],
      to_user_id: likes[i][1],
      message,
      created_at: currentTimeMs()
    };
    // console.log('LIKE:', like);
    await knex('likes').insert(like);
  }

  console.log(`Adding ${matches.length} matches...`);
  for (let i = 0; i < matches.length; i++) {
    await knex('matches').insert({
      user_one_id: matches[i][0],
      user_two_id: matches[i][1],
      created_at: currentTimeMs()
    });
  }
};

(async () => {
  await handleWithDBClient(async (con) => {
    const users = await addUsers();
    await setLikedAndMatches(users);

    // await setUsersCompatibility(users, con);
    // await setUsersSearchPreferences(users.map(user => user.id));

    knex.destroy();

    console.log('DONE!');
  });
})();
