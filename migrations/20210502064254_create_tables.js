
exports.up = (knex) => {
  return knex.raw(`
    CREATE TYPE user_status_type AS ENUM (
      'onboarding',
      'active',
      'suspended',
      'deleted'
    );

    CREATE TYPE gender AS ENUM (
      'male',
      'female',
      'both'
    );

    CREATE TYPE notification_type AS ENUM (
      'intro_like',
      'matched',
      'view'
    );

    CREATE TYPE amount AS ENUM (
      'regularly',
      'sometimes',
      'never'
    );

    CREATE TYPE body_type AS ENUM (
      'fit',
      'curvy',
      'average',
      'skinny'
    );

    CREATE TYPE children_status_type AS ENUM (
      'has',
      'does_not_have',
      'does_not_have_and_does_not_want',
      'does_not_have_but_wants'
    );

    CREATE TYPE pet_status_type AS ENUM (
      'cat',
      'dog',
      'other',
      'none'
    );

    CREATE TYPE media_type AS ENUM (
      'video',
      'audio',
      'image'
    );

    CREATE TYPE image_size AS ENUM (
      'small',
      'big'
    );

    CREATE TYPE intro_type AS ENUM (
      'message',
      'video',
      'audio',
      'smile'
    );

    create TYPE feedback_type as ENUM (
      'bug',
      'feature',
      'other'
    );

    CREATE TYPE report_type as ENUM (
      'inappropriate',
      'abusive',
      'scam',
      'fake',
      'underage',
      'other'
    );

    CREATE TYPE verification_status AS ENUM (
      'verified',
      'pending',
      'rejected',
      'unverified'
    );

    CREATE TYPE verification_request_status AS ENUM (
      'verified',
      'pending',
      'rejected'
    );

    CREATE TYPE employment_type AS ENUM (
      'full_time',
      'part_time',
      'freelance',
      'self_employed',
      'unemployed',
      'retired'
    );

    CREATE TYPE education_type AS ENUM (
      'none',
      'entry',
      'mid',
      'higher'
    );

    CREATE TYPE personality_type AS ENUM (
      'introvert',
      'extrovert',
      'mixed'
    );

    CREATE TYPE income_type AS ENUM (
      'none',
      'low',
      'middle',
      'high'
    );

    CREATE TABLE media_metadatas (
      id UUID PRIMARY KEY,
      type media_type NOT NULL,
      mime_type VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE countries (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE cities (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      country_id UUID NOT NULL REFERENCES countries(id),
      created_at BIGINT NOT NULL
    );

    CREATE TABLE users (
      id UUID PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255),
      city_id UUID REFERENCES cities(id),
      title VARCHAR(70),
      work VARCHAR(70),
      education VARCHAR(70),
      description VARCHAR(255),
      status user_status_type NOT NULL,
      birthday DATE,
      age INTEGER,
      gender gender,
      interested_in gender,
      profile_image_id UUID REFERENCES media_metadatas(id),
      blurred_profile_image_id UUID REFERENCES media_metadatas(id),
      images_count INTEGER NOT NULL,
      verification_status verification_status,
      verified BOOLEAN NOT NULL,
      last_login_at BIGINT,
      is_online BOOL,
      last_online_at BIGINT,
      deleted_at BIGINT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE user_info (
      user_id UUID PRIMARY KEY,
      height INTEGER,
      smoking amount,
      drinking amount,
      income income_type,
      body body_type,
      children children_status_type,
      pet pet_status_type,
      employment employment_type,
      education education_type,
      personality personality_type,
      zodiac VARCHAR(255),
      looking_for_type INTEGER,
      personality_type VARCHAR(5)
    );

    CREATE TABLE positions (
      user_id UUID PRIMARY KEY,
      lat NUMERIC NOT NULL,
      lon NUMERIC NOT NULL
    );

    CREATE TABLE recomendations (
      user_id UUID NOT NULL REFERENCES users(id),
      recommended_user_id UUID NOT NULL REFERENCES users(id),
      distance_in_km INTEGER,
      added_at BIGINT NOT NULL
    );

    CREATE TABLE recomendations_history (
      user_id UUID NOT NULL REFERENCES users(id),
      recommended_user_id UUID NOT NULL REFERENCES users(id),
      added_at BIGINT NOT NULL,
      swipe VARCHAR(50)
    );

    CREATE TABLE recomendation_calculations (
      user_id UUID NOT NULL REFERENCES users(id),
      calculated_at BIGINT NOT NULL,
      last_timestamp BIGINT
    );

    CREATE TABLE user_activities (
      user_id UUID PRIMARY KEY,
      last_active_at BIGINT NOT NULL
    );

    CREATE TABLE verification_requests (
      id UUID PRIMARY KEY,
      image_id UUID NOT NULL REFERENCES media_metadatas(id),
      user_id UUID NOT NULL REFERENCES users(id),
      status verification_request_status NOT NULL,
      completed_at BIGINT,
      rejected_at BIGINT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE verification_requests_history (
      id UUID PRIMARY KEY,
      image_id UUID NOT NULL REFERENCES media_metadatas(id),
      user_id UUID NOT NULL REFERENCES users(id),
      status verification_request_status NOT NULL,
      completed_at BIGINT,
      rejected_at BIGINT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE onboarding (
      user_id UUID REFERENCES users(id),
      step INTEGER NOT NULL,
      completed_at BIGINT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE user_images (
      user_id UUID REFERENCES users(id),
      image_id UUID NOT NULL REFERENCES media_metadatas(id),
      created_at BIGINT NOT NULL
    );

    CREATE TABLE session_tokens (
      token VARCHAR(255) PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      push_token VARCHAR(255),
      remember BOOLEAN NOT NULL,
      is_mobile BOOL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE pages (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      profile_image_id UUID REFERENCES media_metadatas(id),
      created_at BIGINT NOT NULL
    );

    CREATE TABLE interests (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE user_interests (
      user_id UUID REFERENCES users(id),
      hobbie_id UUID NOT NULL REFERENCES interests(id)
    );





    CREATE TABLE would_you_rather_answers (
      id UUID PRIMARY KEY,
      question_id UUID NOT NULL,
      text TEXT NOT NULL,
      category INTEGER
    );

    CREATE TABLE answer_questions_game_questions (
      id UUID PRIMARY KEY,
      text TEXT NOT NULL,
      category INTEGER
    );

    CREATE TABLE would_you_rather_games (
      id UUID PRIMARY KEY,
      question_id UUID,
      answer_id UUID
    );

    CREATE TABLE question_games (
      id UUID PRIMARY KEY,
      from_question_id UUID,
      to_question_id UUID,
      answer_from TEXT,
      answer_to TEXT
    );

    CREATE TABLE message_game_info (
      id UUID PRIMARY KEY,
      game_type INTEGER,
      game_id UUID,
      game_stage INTEGER
    );

    CREATE TABLE chat_messages (
      id UUID PRIMARY KEY,
      chat_id UUID,
      member_id UUID NOT NULL,
      text TEXT NOT NULL,
      images_count INTEGER NOT NULL,
      game_info_id UUID,
      created_at BIGINT NOT NULL
    );
    CREATE INDEX chat_messages_member_id_idx ON chat_messages(member_id);


    CREATE TABLE chats (
      id UUID PRIMARY KEY,
      member_one_id UUID NOT NULL,
      member_two_id UUID NOT NULL,
      last_message_id UUID REFERENCES chat_messages(id),
      last_message_at BIGINT,
      created_at BIGINT NOT NULL
    );
    CREATE INDEX chats_member_one_id_idx ON chats(member_one_id);
    CREATE INDEX chats_member_two_id_idx ON chats(member_two_id);



    CREATE TABLE message_medias (
      id UUID PRIMARY KEY,
      chat_messages_id UUID REFERENCES chat_messages(id),
      reported BOOLEAN,
      media_id UUID REFERENCES media_metadatas(id)
    );

    CREATE TABLE not_seen_chat_messages_count (
      chat_id UUID NOT NULL REFERENCES chats(id),
      user_id UUID NOT NULL REFERENCES users(id),
      not_seen_count INTEGER NOT NULL,
      UNIQUE(chat_id, user_id)
    );

    CREATE TABLE notifications_count (
      rel_id UUID NOT NULL,
      not_seen_likes_count INTEGER NOT NULL,
      not_seen_visits_count INTEGER NOT NULL
    );
    CREATE INDEX notifications_count_rel_id_idx ON notifications_count(rel_id);

    CREATE TABLE user_stats_count (
      user_id UUID PRIMARY KEY,
      likes_count INTEGER NOT NULL,
      matches_count INTEGER NOT NULL
    );

    CREATE TABLE likes (
      id UUID PRIMARY KEY,
      from_user_id UUID NOT NULL REFERENCES users(id),
      to_user_id UUID NOT NULL REFERENCES users(id),
      message VARCHAR(255),
      created_at BIGINT NOT NULL
    );

    CREATE TABLE matches (
      user_one_id UUID REFERENCES users(id),
      user_two_id UUID REFERENCES users(id),
      created_at BIGINT NOT NULL
    );

    CREATE TABLE search_preferences (
      user_id UUID PRIMARY KEY,
      from_age INTEGER,
      to_age INTEGER,
      distance INTEGER,
      income income_type,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE user_views (
      viewer_user_id UUID REFERENCES users(id),
      viewed_user_id UUID REFERENCES users(id),
      count INTEGER NOT NULL,
      last_viewed_at BIGINT NOT NULL
    );

    CREATE TABLE profile_questions (
      id INTEGER PRIMARY KEY,
      text VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE profile_question_answers (
      id UUID PRIMARY KEY,
      question_id INTEGER NOT NULL REFERENCES profile_questions(id),
      user_id UUID REFERENCES users(id),
      text text NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE reports (
      reporter_user_id UUID REFERENCES users(id),
      reported_user_id UUID REFERENCES users(id),
      type report_type NOT NULL,
      details text NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE feedbacks (
      user_id UUID REFERENCES users(id),
      type feedback_type NOT NULL,
      details text NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE personality_questions (
      id INTEGER PRIMARY KEY,
      text TEXT NOT NULL,
      category INTEGER NOT NULL,
      type VARCHAR(2) NOT NULL
    );

    CREATE TABLE personalities (
      user_id UUID PRIMARY KEY,
      personality VARCHAR(5) NOT NULL,
      calculation JSON,
      answers JSON,
      updates_count INTEGER NOT NULL,
      updated_at BIGINT NOT NULL
    );

    CREATE TABLE push_notification_settings (
      user_id UUID PRIMARY KEY,
      messages BOOLEAN,
      received_likes BOOLEAN,
      matches BOOLEAN
    );
  `);
};

// CREATE TABLE personalities (
//   user_id UUID PRIMARY KEY,
//   personality VARCHAR(5) NOT NULL,
//   calculation JSON NOT NULL,
//   answers JSON NOT NULL,
//   created_at BIGINT NOT NULL
// );
// CREATE TABLE personality_question_answers (
//   user_id UUID REFERENCES users(id),
//   question_id INTEGER REFERENCES personality_questions(id),
//   answer INTEGER,
//   UNIQUE(user_id, question_id)
// );

exports.down = (knex) => {
  return Promise.all([
    knex.raw(`DROP TYPE user_status_type`),
    knex.raw(`DROP TYPE gender`),
    knex.raw(`DROP TYPE notification_type`),
    knex.raw(`DROP TYPE amount`),
    knex.raw(`DROP TYPE body_type`),
    knex.raw(`DROP TYPE children_status_type`),
    knex.raw(`DROP TYPE pet_status_type`),
    knex.raw(`DROP TYPE media_type`),
    knex.raw(`DROP TYPE image_size`),
    knex.raw(`DROP TYPE intro_type`),
    knex.raw(`DROP TYPE feedback_type`),
    knex.raw(`DROP TYPE report_type`),
    knex.raw(`DROP TYPE verification_status`),
    knex.raw(`DROP TYPE verification_request_status`),

    knex.raw(`DROP TABLE user_views`),
    // knex.raw(`DROP TABLE user_compatability`),
    // knex.raw(`DROP TABLE user_answers`),
    // knex.raw(`DROP TABLE answers`),
    // knex.raw(`DROP TABLE questions`),
    knex.raw(`DROP TABLE search_preferences`),
    knex.raw(`DROP TABLE feedbacks`),
    knex.raw(`DROP TABLE reports`),
    knex.raw(`DROP TABLE matches`),
    knex.raw(`DROP TABLE intros`),
    knex.raw(`DROP TABLE notifications`),
    knex.raw(`DROP TABLE user_interests`),
    knex.raw(`DROP TABLE interests`),
    knex.raw(`DROP TABLE chat_messages`),
    knex.raw(`DROP TABLE chats`),
    knex.raw(`DROP TABLE session_tokens`),
    knex.raw(`DROP TABLE user_images`),
    knex.raw(`DROP TABLE onboarding`),
    knex.raw(`DROP TABLE users`),
    knex.raw(`DROP TABLE cities`),
    knex.raw(`DROP TABLE countries`),
    knex.raw(`DROP TABLE verification_requests`),
    knex.raw(`DROP TABLE employment_type`),
    knex.raw(`DROP TABLE education_type`),
    knex.raw(`DROP TABLE profile_questions`),
    knex.raw(`DROP TABLE profile_question_answers`),
    knex.raw(`DROP TABLE personality_type`),
    knex.raw(`DROP TABLE income_type`),
  ])
};

exports.config = { transaction: false };
