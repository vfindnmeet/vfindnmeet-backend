const environment = process.env.ENVIRONMENT || 'development'
const config = require('../knexfile.js')[environment];
const knex = require('knex')(config);
const data = require('./chat_games_data');
const chat_question_game_data = require('./chat_question_game_data');
const uuid = require('uuid');

const gameGroups = {
  Common: 0,
  Fun: 1,
  Relationship: 2,
  Dating: 3,
  Dirty: 4,
};

(async () => {
  console.log('Seeding chat games data...');

  for (const category of Object.keys(data)) {
    const insertData = [];
    for (const answers of data[category]) {
      const questionId = uuid.v4();

      answers.forEach(answer => {
        insertData.push({
          id: uuid.v4(),
          question_id: questionId,
          text: answer,
          category: gameGroups[category]
        });
      })
    }

    await knex('would_you_rather_answers').insert(insertData);
  }

  const insertData = [];
  for (const question of chat_question_game_data) {
    insertData.push({
      id: uuid.v4(),
      text: question,
      category: 0
    });
  }

  await knex('answer_questions_game_questions').insert(insertData);

  knex.destroy();

  console.log('DONE!');
})();
