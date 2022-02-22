import { Controller } from '../core/Controller';

// const mapToArray = (map: { [key: string]: any }) => Object.keys(map).map(key => map[key]);

enum GameGroup {
  COMMON = 'Common',
  FUN = 'Fun',
  RELATIONSHIP = 'Relationship',
  DATING = 'Dating',
  // FLIRTY = 'Flirty',
  DIRTY = 'Dirty'
};

const gameGroups = [
  GameGroup.COMMON,
  GameGroup.FUN,
  GameGroup.RELATIONSHIP,
  GameGroup.DATING,
  GameGroup.DIRTY,
  // GameGroup.FLIRTY,
];

const questionGameGroups = [
  GameGroup.COMMON,
];


export default class ChatGameController extends Controller {
  async getWouldYouRatherGames(req: any, res: any) {
    // const token = this.getAuthToken(req);

    const con: any = await this.getConnection();

    const groupedResult: {
      [key: string]: {
        [key: string]: {
          answerId: string;
          text: string;
        }[]
      }
    } = {};

    /*
    {
      <groupName>: [
        {
          questionId,
          answers: [
            {
              answerId,
              text
            },
            {
              answerId,
              text
            }
          ]
        }
      ]
    }
    */

    (await con.query('SELECT id, question_id, text, category from would_you_rather_answers')).rows
      .map(({ id, question_id, text, category }: any) => {
        if (!groupedResult[category]) {
          groupedResult[category] = {};
        }
        if (!groupedResult[category][question_id]) {
          groupedResult[category][question_id] = [];
        }

        groupedResult[category][question_id].push({
          answerId: id,
          text
        });
      });

    // const result: {
    //   [key: string]: {
    //     answerId: string;
    //     text: string;
    //   }[]
    // } = {};
    // const result: any = {};

    const result: {
      [key: string]: {
        questionId: string;
        answers: {
          answerId: string;
          text: string;
        }[]
      }
    } = {};

    Object.keys(groupedResult).forEach(group => {
      const groupNumber = +group;
      result[gameGroups[isNaN(groupNumber) ? 0 : groupNumber]] = Object.keys(groupedResult[group])
        .map(questionId => ({
          questionId,
          answers: groupedResult[group][questionId]
        })) as any;
    })

    res.json(result);
  }

  async getAnswerQuestionsGameQuestions(req: any, res: any) {
    // const token = this.getAuthToken(req);

    const con: any = await this.getConnection();

    const groupedResult: {
      [key: string]: {
        questionId: string;
        text: string;
      }[]
    } = {};

    (await con.query('SELECT id, text, category FROM answer_questions_game_questions')).rows
      .map(({ id, text, category }: any) => {
        if (!groupedResult[questionGameGroups[category]]) {
          groupedResult[questionGameGroups[category]] = [];
        }

        groupedResult[questionGameGroups[category]].push({
          questionId: id,
          text
        });
      });

    // const result: {
    //   [key: string]: {
    //     questionId: string;
    //     answers: {
    //       answerId: string;
    //       text: string;
    //     }[]
    //   }
    // } = {};

    // Object.keys(groupedResult).forEach(group => {
    //   const groupNumber = +group;
    //   result[gameGroups[isNaN(groupNumber) ? 0 : groupNumber]] = Object.keys(groupedResult[group])
    //     .map(questionId => ({
    //       questionId,
    //       answers: groupedResult[group][questionId]
    //     })) as any;
    // });

    res.json(groupedResult);
  }
}
