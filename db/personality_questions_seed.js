const environment = process.env.ENVIRONMENT || 'development'
const config = require('../knexfile.js')[environment];
const knex = require('knex')(config);
const personality_questions_data = require('./personality_questions_data');

(async () => {
  console.log('Seeding personality questions data...');

  const insertData = [];
  let id = 0;
  for (let category = 1; category <= personality_questions_data.length; category++) {
    const questions = personality_questions_data[category - 1];
    for (let i = 0; i < questions.length; i++) {
      insertData.push({
        id: ++id,
        text: questions[i][0],
        category,
        type: questions[i][1]
      });
    }
  }

  // console.log(JSON.stringify(insertData, null, 2));
  // console.log(personality_questions_data.length);

  await knex('personality_questions').insert(insertData);

  knex.destroy();

  console.log('DONE!');
})();
