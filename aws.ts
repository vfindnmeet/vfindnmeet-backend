import AWS from 'aws-sdk';
import config from './app/config/config';

console.log('CONFIG', {
  accessKeyId: config.AWS.ACCESS_KEY,
  secretAccessKey: config.AWS.SECRET_KEY,
  region: config.AWS.REGION
});

export const conf = new AWS.Config({
  accessKeyId: config.AWS.ACCESS_KEY,
  secretAccessKey: config.AWS.SECRET_KEY,
  region: config.AWS.REGION
});
