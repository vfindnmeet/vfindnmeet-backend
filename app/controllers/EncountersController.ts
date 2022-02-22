import SessionTokenRepository from '../repositories/SessionTokenRepository';
import { Controller } from '../core/Controller';
import UserRepository from '../repositories/UserRepository';
import SearchPreferenceRepository from '../repositories/SearchPreferenceRepository';
import RecommendationRepository from '../repositories/RecommendationRepository';
import * as es from '../services/ESService';
import RecommendationService from '../services/RecommendationService';

/*

recomendations:
  for_user_id uuid
  user_id uuid
  position integer

recomendations_history:
  for_user_id uuid
  user_id uuid
  position integer
  swipe like|no

recomendation_calculations:
  user_id uuid
  calculated_at bigint
  last_timestamp bigint

1) user sign up:
  - create DB entry
  - create ES entry (id, age, gender, interested_in, lat, lng, added_at)

gender: male & interested_in: female -> straight_male
gender: male & interested_in: male -> gay_male
gender: male & interested_in: male & female -> gay_male & straight_male
gender: female & interested_in: male -> straight_female
gender: female & interested_in: female -> gay_female
gender: female & interested_in: male & female -> gay_female & straight_female

On gender and/or interested_in
  - change user index
  - recalculate recommendations
On search_pref change (from_age, to_age, distance)
  - recalculate recommendations


calculate recommendations:
get logged user sexuality: straight, gay, bi

1) straight male -> search from straight_female
2) gay male -> search from gay_male
3) bi male -> search from gay_male & straight_female
...



get users (from calculated index based on the sexuality) WHERE
  distance <= search_pref.distance AND
  age >= search_pref.from_age AND
  age <= search_pref.to_age AND
  added_at > last_added_at


GET ENCOUNTERS (LIST)
LIKE
DISLIKE




user_activity:
  user_id
  last_active_at

ES:
  user_id
  location: { lat, lon }
  age
  added_at
  last_active_at

*/

export default class EncountersController extends Controller {
  async getRecommendations(req: any, res: any) {
    const token = this.getAuthToken(req);

    // if other user liked - match
    // on match - delete like

    // const userId = req.params.id;
    // let { message } = req.body;

    const sessionTokenRepository: SessionTokenRepository = await this.getService('session_token_repository');
    // const userRepository: UserRepository = await this.getService('user_repository');
    // const introRepository: IntroRepository = await this.getService('intro_repository');
    // const matchRepository: MatchRepository = await this.getService('match_repository');
    const searchPreferenceRepository: SearchPreferenceRepository = await this.getService('search_preference_repository');
    const recommendationRepository: RecommendationRepository = await this.getService('recommendation_repository');
    const recommendationService: RecommendationService = await this.getService('recommendation_service');

    // console.log('LIKE');
    // console.log('relationBetween');
    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      const [
        searchPref,
        recommendations
      ] = await Promise.all([
        searchPreferenceRepository.getForUser(loggedUserId),
        recommendationRepository.getForUser(loggedUserId)
      ]);

      let result: any[];
      if (0 === recommendations.length) {
        const recommendations = await recommendationService.calculate(loggedUserId, {
          fromAge: searchPref.from_age,
          toAge: searchPref.toAge,
          distance: searchPref.distance
        });

        result = recommendations.map(({ user_id, distanceInKm }: any) => ({
          userId: user_id,
          distanceInKm
        }));
        // return res.json(recommendations.map(({ user_id, distanceInKm }: any) => ({
        //   userId: user_id,
        //   distanceInKm
        // })));
      } else {
        result = recommendations.map(({ recommended_user_id, distance_in_km }: any) => ({
          userId: recommended_user_id,
          distanceInKm: distance_in_km
        }));
      }

      // console.log('recommendations:');
      // console.log(recommendations);

      con.query('COMMIT');

      // res.json(recommendations.map(({ recommended_user_id, distance_in_km }: any) => ({
      //   userId: recommended_user_id,
      //   distanceInKm: distance_in_km
      // })));

      return res.json(result);
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }
}
