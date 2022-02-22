import { currentTimeMs } from "../utils";

enum Category {
  MIND = 1,
  ENERGY = 2,
  NATURE = 3,
  TACTICS = 4,
}

/*

personality_questions:
id INTEGER
text TEXT
category INTEGER

personality_question_answers:
id UUID
question_id INTEGER
user_id UUID

user_info:
...
personality VARCHAR(5)

personalities:
user_id UUID
personality VARCHAR(5)
calculation

categoryQuestions = 10
totalPoints = 2 * categoryQuestions; // 20

// E -20 ... 20 I


*/

const Personalities = {
  [Category.MIND]: ['E', 'I'],
  [Category.ENERGY]: ['S', 'N'],
  [Category.NATURE]: ['T', 'F'],
  [Category.TACTICS]: ['J', 'P'],
};

const calculatePersonality = (
  questions: { id: number; category?: number; type?: string; }[],
  answers: { [key: string]: number },
) => {
  const personalities: { type: string; percentage: number; }[] = [];
  // const targetQuestions = questions.filter(question => answers[question.id]);
  // console.log(targetQuestions);
  console.log('answers', answers);
  // console.log('questions', questions);

  for (const category of [
    Category.MIND,
    Category.ENERGY,
    Category.NATURE,
    Category.TACTICS,
  ]) {
    const categoryQuestions = questions.filter(question => question.category == category);

    // const results: { [key: string]: number; } = {};

    let r1 = 0;
    let r2 = 0;

    categoryQuestions
      .filter(question => !!answers[question.id])
      .forEach(question => {
        const answ = answers[question.id];
        if (['E', 'S', 'T', 'J'].includes(question.type as any)) {
          if (answ < 0) r2 += -answ;
          else r1 += answ;
        } else {
          if (answ < 0) r1 += -answ;
          else r2 += answ;
        }
      });

    const calculatedPersonality = Personalities[category][r1 > r2 ? 0 : 1]
    const percentage = Math.floor((r1 === 0 && r2 === 0) ? 51 : ((r1 > r2 ? r1 : r2) * 100) / (r1 + r2));

    personalities.push({
      type: calculatedPersonality,
      percentage
    });
  }

  return personalities;
};

export default class PersonalityService {
  public static UPDATES_COUNT = 4;

  constructor(private con: any) { }

  calculatePersonality(
    questions: { id: number; category: number }[],
    answers: { [key: string]: number },
  ) {
    const personality = calculatePersonality(questions, answers);

    return personality;
  }

  async updatePersonality({
    userId,
    personalityType,
    calculation,
    answers
  }: {
    userId: string;
    personalityType: string;
    calculation?: { [key: string]: number; };
    answers?: { [key: string]: number; };
  }) {
    await this.con.query(
      'INSERT INTO personalities (user_id, personality, calculation, answers, updates_count, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ' +
      'ON CONFLICT (user_id) ' +
      'DO UPDATE SET personality = excluded.personality, ' +
      'calculation = excluded.calculation, ' +
      'answers = excluded.answers, ' +
      'updates_count = personalities.updates_count + 1, ' +
      'updated_at = excluded.updated_at',
      [userId, personalityType, calculation, answers, 1, currentTimeMs()]
    );
  }

  async setPersonality({
    userId,
    personalityType
  }: {
    userId: string;
    personalityType: string;
  }) {
    await this.con.query(
      'INSERT INTO personalities (user_id, personality, updates_count, updated_at) VALUES ($1, $2, $3, $4) ' +
      'ON CONFLICT (user_id) ' +
      'DO UPDATE SET personality = excluded.personality, ' +
      'updates_count = personalities.updates_count + 1, ' +
      'updated_at = excluded.updated_at',
      [userId, personalityType, 1, currentTimeMs()]
    );
  }

  async getPersonalityUpdatesCount(userId: string) {
    return (await this.con.query('SELECT updates_count FROM personalities WHERE user_id = $1', [userId])).rows[0]?.updates_count ?? 0;
  }
}
