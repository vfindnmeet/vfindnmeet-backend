import { Client } from '@elastic/elasticsearch';
import config from '../config/config';
import { currentTimeMs } from '../utils';

export const ES_INDEX_STRAIGHT_MALES = 'straight_males';
export const ES_INDEX_GAY_MALES = 'gay_males';
export const ES_INDEX_STRAIGHT_FEMALES = 'straight_females';
export const ES_INDEX_GAY_FEMALES = 'gay_females';

export const allIndexes = [
  ES_INDEX_STRAIGHT_MALES,
  ES_INDEX_GAY_MALES,
  ES_INDEX_STRAIGHT_FEMALES,
  ES_INDEX_GAY_FEMALES
].join(',');

export const client = new Client(config.ELASTICSEARCH);

export const getIndexFor = (gender: string, interestedIn: string) => {
  if (gender === 'male' && interestedIn === 'female') {
    return [ES_INDEX_STRAIGHT_MALES];
  } else if (gender === 'male' && interestedIn === 'male') {
    return [ES_INDEX_GAY_MALES];
  } else if (gender === 'male' && interestedIn === 'both') {
    return [ES_INDEX_STRAIGHT_MALES, ES_INDEX_GAY_MALES];
  } else if (gender === 'female' && interestedIn === 'male') {
    return [ES_INDEX_STRAIGHT_FEMALES];
  } else if (gender === 'female' && interestedIn === 'female') {
    return [ES_INDEX_GAY_FEMALES];
  } else if (gender === 'female' && interestedIn === 'both') {
    return [ES_INDEX_STRAIGHT_FEMALES, ES_INDEX_GAY_FEMALES];
  }

  return [];
};

export const getSearchIndexFor = (gender: string, interestedIn: string) => {
  if (gender === 'male' && interestedIn === 'female') {
    return [ES_INDEX_STRAIGHT_FEMALES];
  } else if (gender === 'male' && interestedIn === 'male') {
    return [ES_INDEX_GAY_MALES];
  } else if (gender === 'male' && interestedIn === 'both') {
    return [ES_INDEX_STRAIGHT_FEMALES, ES_INDEX_GAY_MALES];
  } else if (gender === 'female' && interestedIn === 'male') {
    return [ES_INDEX_STRAIGHT_MALES];
  } else if (gender === 'female' && interestedIn === 'female') {
    return [ES_INDEX_GAY_FEMALES];
  } else if (gender === 'female' && interestedIn === 'both') {
    return [ES_INDEX_STRAIGHT_MALES, ES_INDEX_GAY_FEMALES];
  }

  return [];
};

const handle = (resolve: any, reject: any) => {
  return (err: any, response: any) => {
    if (err) {
      // console.log('ERR!');
      // console.log(err.meta.body.error);
      reject(err);

      return;
    }

    resolve(response);
  };
}

export const createIndex = (index: string, mappings: any) => {
  return new Promise((resolve: any, reject: any) => {
    client.indices.create({ index, body: mappings }, handle(resolve, reject));
  });
};

export const deleteIndex = (index: string) => {
  return new Promise((resolve: any, reject: any) => {
    client.indices.delete({ index }, handle(resolve, reject));
  });
};

export const insert = (index: string, body: any) => {
  return new Promise((resolve: any, reject: any) => {
    client.index({ index, body }, handle(resolve, reject));
  });
};

export const insertMultiple = (indexes: string[], body: any) => {
  const operations: any[] = [];
  for (const index of indexes) {
    operations.push({
      index: {
        _index: index,
      }
    }, body);
  }

  return new Promise((resolve: any, reject: any) => {
    client.bulk({
      body: operations
    }, handle(resolve, reject));
  });
};

export const search = (index: string, body: any) => {
  return new Promise((resolve: any, reject: any) => {
    client.search({ index, body }, handle(resolve, reject));
  });
};

export const deleteByUserId = (index: string, userId: string) => {
  return new Promise((resolve: any, reject: any) => {
    client.deleteByQuery({
      index,
      // type: '_doc',
      body: {
        query: {
          match: { user_id: userId }
        }
      }
    }, handle(resolve, reject));
  });
};

export const updateLocationAndLastActiveAtByUserId = (
  index: string,
  userId: string,
  location: { lat: number; lon: number; }
) => {
  return new Promise((resolve: any, reject: any) => {
    client.updateByQuery({
      index,
      // type: '_doc',
      body: {
        query: {
          match: { user_id: userId }
        },
        script: {
          // inline: `ctx._source.location.lat = ${location.lat}; ctx._source.location.lon = ${location.lon};`
          params: {
            location,
            lastActiveAt: Math.floor(currentTimeMs() / 1000)
          },
          // source: `ctx._source.last_active_at = params['lastActiveAt']`
          // source: `ctx._source.location.lat = params['lat']; ctx._source.location.lon = params['lon'];`
          source: `ctx._source.location = params['location']; ctx._source.last_active_at = params['lastActiveAt'];`
        },
      }
    }, handle(resolve, reject));
  });
};

export const updateLocationByUserId = (index: string, userId: string, location: { lat: number; lon: number; }) => {
  return new Promise((resolve: any, reject: any) => {
    client.updateByQuery({
      index,
      // type: '_doc',
      body: {
        query: {
          match: { user_id: userId }
        },
        script: {
          // inline: `ctx._source.location.lat = ${location.lat}; ctx._source.location.lon = ${location.lon};`
          params: {
            location
          },
          // source: `ctx._source.location.lat = params['lat']; ctx._source.location.lon = params['lon'];`
          source: `ctx._source.location = params['location']`
        },
      }
    }, handle(resolve, reject));
  });
};

export const updateAgeByUserId = (index: string, userId: string, age: number) => {
  return new Promise((resolve: any, reject: any) => {
    client.updateByQuery({
      index,
      // type: '_doc',
      body: {
        query: {
          match: { user_id: userId }
        },
        script: {
          // source: `ctx._source.age = ${age}`
          params: {
            age
          },
          source: `ctx._source.age = params['age']`
        },
      }
    }, handle(resolve, reject));
  });
};

export const updateLastActiveAtByUserId = (index: string, userId: string) => {
  return new Promise((resolve: any, reject: any) => {
    client.updateByQuery({
      index,
      // type: '_doc',
      body: {
        query: {
          match: { user_id: userId }
        },
        script: {
          // inline: `ctx._source.last_active_at = ${currentTimeMs()}`
          params: {
            lastActiveAt: Math.floor(currentTimeMs() / 1000)
          },
          source: `ctx._source.last_active_at = params['lastActiveAt']`
        },
      }
    }, handle(resolve, reject));
  });
};

export const indexUser = async ({
  gender,
  interestedIn,
  userId,
  age,
  location,
  addedAt
}: {
  gender: string;
  interestedIn: string;
  userId: string;
  age: number;
  location?: {
    lat: number;
    lon: number;
  },
  addedAt?: number;
}) => {
  const data: any = {
    user_id: userId,
    age: age,
    added_at: addedAt ?? currentTimeMs()
  };
  if (location) {
    data.location = location;
  }

  console.log('INDEX USER', getIndexFor(gender, interestedIn));
  console.log(data);

  return await insertMultiple(getIndexFor(gender, interestedIn), data);
};
