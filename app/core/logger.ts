import Rollbar from 'rollbar';
import config from '../config/config';
import { isProd } from '../utils';

const rollbar = new Rollbar({
  accessToken: config.ROLLBAR.ACCESS_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true
});

export const error = (err: any) => {
  console.error(err);

  if (isProd()) {
    rollbar.error(err);
  }
};
