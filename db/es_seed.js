const {
  client,
  insert,
  deleteByUserId,
  insertMultiple,
  search,

  createIndex,
  deleteIndex,
  ES_INDEX_STRAIGHT_MALES,
  ES_INDEX_GAY_MALES,
  ES_INDEX_STRAIGHT_FEMALES,
  ES_INDEX_GAY_FEMALES
} = require('../dist/services/ESService');

// console.log(client.indices);

const mappings = {
  mappings: {
    // aType: {
    properties: {
      user_id: {
        type: 'keyword',
        // index: 'not_analyzed'
      },
      age: {
        type: 'short',
        // index: 'not_analyzed'
      },
      location: {
        type: 'geo_point',
        // index: 'not_analyzed'
      },
      added_at: {
        type: 'long',
        // index: 'not_analyzed'
      },
      last_active_at: {
        type: 'long'
      }
    }
    // }
  }
};

(async () => {
  console.log('Seeding ES indexes...');

  for (const index of [
    ES_INDEX_STRAIGHT_MALES,
    ES_INDEX_GAY_MALES,
    ES_INDEX_STRAIGHT_FEMALES,
    ES_INDEX_GAY_FEMALES
  ]) {
    await deleteIndex(index);
    await createIndex(index, mappings);
  }
})();




// const promises = [];
// for (const index of [
//   ES_INDEX_STRAIGHT_MALES,
//   ES_INDEX_GAY_MALES,
//   ES_INDEX_STRAIGHT_FEMALES,
//   ES_INDEX_GAY_FEMALES
// ]) {
//   promises.push(createIndex(index, mappings));
// }
// Promise.all(promises)
//   .then(() => console.log('INDEXES CREATED!'))
//   .catch(console.error);

// client.indices.create({
//   index: ES_INDEX_GAY_MALES,
//   body: mappings
// }, (err, resp, respcode) => {
//   if (err) {
//     console.log('ERR');
//     console.error(err);

//     return;
//   }

//   console.log(resp, respcode);
// });

// const insert = (index, body) => {
//   return client.index({
//     index,
//     body
//   });
// };

// insert('straight_males', {
//   user_id: 'uid124',
//   age: 26,
//   location: {
//     lat: 13.43,
//     lon: 47.5435788
//   },
//   added_at: Date.now()
// });

// deleteByUserId('straight_males', 'uid124');

// insertMultiple([
//   ES_INDEX_STRAIGHT_MALES,
//   ES_INDEX_GAY_MALES
// ], {
//   user_id: 'uid125',
//   age: 27,
//   location: {
//     lat: 16.43,
//     lon: 43.5435788
//   },
//   added_at: Date.now()
// });






// search([
//   ES_INDEX_STRAIGHT_MALES,
//   ES_INDEX_GAY_MALES
// ].join(','), {
//   size: 20,
//   sort: [
//     { added_at: 'asc' }
//   ],
//   query: {
//     bool: {
//       must: [
//         {
//           range: {
//             age: {
//               gte: 18,
//               lte: 26
//             }
//           }
//         },
//         {
//           range: {
//             added_at: {
//               gt: 1641400334299 //1641400338354
//             }
//           }
//         }
//       ]
//     }
//     // range: {
//     //   age: {
//     //     gte: 18,
//     //     lte: 26
//     //   }
//     // }
//   }
// })
//   .then(result => {
//     console.log('RESULT:');
//     console.log(result);
//     console.log(JSON.stringify(result.body.hits.hits, null, 2));
//     console.log(`TOTAL: ${JSON.stringify(result.body.hits.total)}, ${result.body.hits.hits.length}`);
//     console.log(result.body.hits.hits.map(i => new Date(i._source.added_at)));
//     console.log(result.body.hits.hits[result.body.hits.hits.length - 1]._source.added_at)
//   });
