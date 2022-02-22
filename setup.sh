#!/bin/bash

export ENV=development
npm run tsc
npm run migrate
node db/db_seed.js
node db/es_seed.js
node db/chat_games_seed.js
node db/personality_questions_seed.js
node db/seed.js
