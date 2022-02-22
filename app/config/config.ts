const config: any = {
  ENV: process.env.ENV,
  DOMAIN_MANE: process.env.DOMAIN_MANE,
  AWS: {
    ACCESS_KEY: process.env.AWS_ACCESS_KEY,
    SECRET_KEY: process.env.AWS_SECRET_KEY,
    REGION: process.env.AWS_REGION,
    S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
    QUEUE_URL: process.env.AWS_QUEUE_URL
  },
  CDN_PATH: process.env.CDN_PATH,
  DB: {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  },
  ROLLBAR: {
    ACCESS_TOKEN: process.env.ROLLBAR_ACCESS_TOKEN
  },
  ELASTICSEARCH: {
    node: process.env.ELASTICSEARCH_NODE
  },
  RABBITMQ: {
    URL: process.env.RABBITMQ_URL,
    QUEUE: process.env.RABBITMQ_QUEUE
  }
};

export default config;
