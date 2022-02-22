const environment = process.env.ENVIRONMENT || 'development'
const config = require('../knexfile.js')[environment];
const knex = require('knex')(config);
const data = require('./data');

const mapItem = (item, fields) => {
  fields = fields.split(',');
  const result = {};
  for (let i = 0; i < fields.length; i++) {
    result[fields[i]] = item[i];
  }

  return result;
};

const chunkedArray = (array) => {
  const result = [];
  const CHUNK_SIZE = 500;

  for (let i = 0, j = array.length; i < j; i += CHUNK_SIZE) {
    const chunk = array.slice(i, i + CHUNK_SIZE);

    result.push(chunk);
  }

  return result;
}

(async () => {
  console.log('Seeding base data...');

  await Promise.all([
    knex('profile_questions').insert(data.profileQuestions.map(item => mapItem(item, 'id,text,created_at'))),
    knex('interests').insert(data.interests.map(item => mapItem(item, 'id,name,created_at'))),
    knex('countries').insert(data.countries.map(item => mapItem(item, 'id,name,created_at')))
  ]);
  await Promise.all(
    chunkedArray(data.cities)
      .map(chunk => knex('cities').insert(chunk.map(item => mapItem(item, 'id,name,country_id,created_at'))))
  );
  // const promises = [];
  // const chunks = chunkedArray(data.cities);
  // for (const chunk of chunks) {
  //   promises.push(
  //     knex('cities').insert(chunk.map(item => mapItem(item, 'id,name,country_id,created_at')))
  //   );
  // }

  // await Promise.all(promises);

  knex.destroy();

  console.log('DONE!');
})();
