import MatchRepository from "../repositories/MatchRepository";

export default class MatchService {
  private matchRepository: MatchRepository;

  constructor(matchRepository: MatchRepository) {
    this.matchRepository = matchRepository;
  }

  async matchIds(userId: string) {
    // const matches = await this.matchRepository.getMatchesFor(userId);
    // const ids = [];
    // for (const match of matches) {
    //   ids.push(match.user_one_id == userId ? match.user_two_id : match.user_one_id);
    // }

    // return ids;
    return (await this.matchRepository.getMatchesFor(userId))
      .map(({ user_one_id, user_two_id }: any) => user_one_id == userId ? user_two_id : user_one_id);
  }

  async areMatched(userOneId: string, userTwoId: string) {
    return await this.matchRepository.areMatched(userOneId, userTwoId);
  }
}
