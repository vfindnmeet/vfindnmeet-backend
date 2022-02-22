import 'dotenv/config';
import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import compression from 'compression';
import { initRoutes } from './routes';
import { setUpWs } from './ws';
import { listenForVerificationQueue } from './VerificationJob';


console.log('===');
console.log(process.env.DOMAIN_MANE);
console.log(process.env.AWS_ACCESS_KEY);
console.log(process.env.AWS_QUEUE_URL);

const app = express();
const port = 4001;

const server: any = http.createServer(app);

setUpWs(server);
// const wss = new WebSocket.Server({ server });

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', '*');
  res.set('Access-Control-Allow-Headers', '*');

  next();
});

server.listen(port, () => {
  console.log(`Server started on port ${server.address().port}`);
});

initRoutes(app);

listenForVerificationQueue();
