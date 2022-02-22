import UserRepository from '../repositories/UserRepository';
import RecommendationRepository from '../repositories/RecommendationRepository';
import * as es from './ESService';
import LocationRepository from '../repositories/LocationRepository';
import { currentTimeMs } from '../utils';

const CALCULATION_INTERVAL = 30 * 60 * 1000; // 30 min

export type SearchResult = {
  user_id: string,
  added_at: number,
  distanceInKm: number
};

export type SearchData = {
  forUserId: string;
  distance: number;
  fromAge?: number;
  toAge?: number;
  excludeUserIds?: string[];
  fromTimestamp?: number;
  onlineOnly?: boolean;
  fromNewest?: boolean;
  size?: number;
};

export default class RecommendationService {
  constructor(
    private recommendationRepository: RecommendationRepository,
    private userRepository: UserRepository,
    private locationRepository: LocationRepository
  ) { }

  async moveToHistory(fromUserId: string, toUserId: string, swipe: string) {
    const recommendation = await this.recommendationRepository.get(fromUserId, toUserId);

    if (!recommendation) return;

    console.log('recommendation:', recommendation);

    await this.recommendationRepository.addRecommendationHistory({
      userId: fromUserId,
      recommendedUserId: toUserId,
      addedAt: +recommendation.added_at,
      swipe
    });
    await this.recommendationRepository.delete(fromUserId, toUserId);
  }

  async calculate(forUserId: string, { fromAge, toAge, distance }: { fromAge: number; toAge: number; distance: number }, reset: boolean = false) {
    const [
      lastCalculation,
      swipedUserIds,
      likedUserIds,
      matchedUserIds
    ] = await Promise.all([
      this.recommendationRepository.getCalculationsForUser(forUserId),
      this.recommendationRepository.getSwipedUserIds(forUserId),
      this.recommendationRepository.getLikedUserIds(forUserId),
      this.recommendationRepository.getMatchedUserIds(forUserId),
    ]);

    const items: SearchResult[] = await this.calculationSearch({
      forUserId,
      distance,
      fromAge,
      toAge,
      fromTimestamp: reset ? null : lastCalculation?.last_timestamp,
      excludeUserIds: [...new Set([...swipedUserIds, ...likedUserIds, ...matchedUserIds])]
    });

    await this.recommendationRepository.deleteForUser(forUserId);
    const promises = [
      this.recommendationRepository.addRecommendations(forUserId, items),
    ];
    if (items.length >= 10) {
      promises.push(
        this.recommendationRepository.updateRecommendationCalculation({
          userId: forUserId,
          lastTimestamp: items[items.length - 1]?.added_at
        })
      );
    }

    await Promise.all(promises);

    return items;
  }

  private async calculationSearch(searchDaa: SearchData) {
    if (searchDaa.fromTimestamp && Date.now() - +searchDaa.fromTimestamp < CALCULATION_INTERVAL) {
      // calculate max once per 30 min
      return [];
    }

    return await this.search(searchDaa);
  }

  async search(
    {
      forUserId,
      distance,
      fromAge,
      toAge,
      excludeUserIds,
      fromTimestamp,
      onlineOnly,
      fromNewest,
      size
    }: SearchData,
    sort: { [key: string]: 'asc' | 'desc' }[] = []
  ): Promise<SearchResult[]> {
    const [user, position] = await Promise.all([
      this.userRepository.findById(['gender', 'interested_in'], forUserId),
      this.locationRepository.getPosition(forUserId)
    ]);

    if (!position?.lat || !position?.lon) {
      return [];
    }

    // if (fromTimestamp && Date.now() - +fromTimestamp < CALCULATION_INTERVAL) {
    //   // calculate max once per 30 min
    //   return [];
    // }

    // const sort: any[] = [];
    const search: any[] = [];

    if (fromAge || toAge) {
      const o: any = {
        range: {
          age: {}
        }
      };

      if (fromAge) o.range.age.gte = +fromAge;
      if (toAge) o.range.age.lte = +toAge;

      search.push(o);
    }
    if (fromTimestamp) {
      if (fromNewest) {
        search.push({
          range: {
            added_at: {
              lt: +fromTimestamp
            }
          }
        });
      } else {
        search.push({
          range: {
            added_at: {
              gt: +fromTimestamp
            }
          }
        });
      }
    }
    if (onlineOnly) {
      search.push({
        range: {
          last_active_at: {
            gt: Math.floor(currentTimeMs() / 1000) - 5 * 60
          }
        }
      });
    }

    if (fromNewest) {
      sort.push({ added_at: 'desc' });
    } else {
      sort.push({ added_at: 'asc' });
    }

    // console.log('SEARCH:');
    // console.log(`indexes:${es.getSearchIndexFor(user.gender, user.interested_in).join(',')}`);
    // console.log(`fromAge:${fromAge}, toAge:${toAge}, distance:${distance}`);
    // console.log(`${position.lat}, ${position.lon}`);

    const esQuery: any = {
      _source: true,
      script_fields: {
        distance: {
          script: `doc['location'].arcDistance(${position.lat}, ${position.lon}) / 1000`
        }
      },
      size: size ?? 20,
      // sort: [
      //   { added_at: 'asc' }
      // ],
      query: {
        bool: {
          must: search,
          filter: {
            geo_distance: {
              distance: `${distance}km`,
              location: `${position.lat}, ${position.lon}`
            }
          }
        }
      }
    };

    if (sort.length > 0) {
      esQuery.sort = sort;
    }

    if (excludeUserIds && excludeUserIds.length > 0) {
      esQuery.query.bool.must_not = {
        terms: {
          user_id: excludeUserIds
        }
      };
    }

    // console.log(JSON.stringify(esQuery, null, 2));

    const result: any = await es.search(
      es.getSearchIndexFor(user.gender, user.interested_in).join(','),
      esQuery
    );

    const items: SearchResult[] = result.body.hits.hits
      .map((hit: any) => ({
        user_id: hit._source.user_id,
        added_at: hit._source.added_at,
        distanceInKm: Math.floor(hit.fields.distance[0])
      }))
      .filter(({ user_id }: any) => user_id !== forUserId);

    return items;
  }
}
