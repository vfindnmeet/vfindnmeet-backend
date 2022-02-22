import { error } from "./core/logger";
import ServiceDiscovery, { SERVICE_NAME_DB_CLIENT } from "./core/ServiceDiscovery";
import ServiceDiscoveryRepo from "./core/ServiceDiscoveryRepo";
import VerificationStatus from "./models/enums/VerificationStatus";
import { compareFaces } from "./services/ImgRecognitionService";
import MediaService from "./services/media/MediaService";
import { isDev, isProd, parseJson } from "./utils";
import amqp from 'amqplib/callback_api';
import config from "./config/config";
import AWS from 'aws-sdk';
import { conf } from '../aws';
import { Consumer } from 'sqs-consumer';
import { SIZE_BIG } from "./services/media/BaseMediaService";

const sqs = new AWS.SQS({ ...conf, apiVersion: '2012-11-05' });

export type VerificationRequestMessage = {
  verificationRequestId: string;
}

export const listenForVerificationQueue = () => {
  if (isDev()) {
    amqp.connect(config.RABBITMQ.URL, (error0, connection) => {
      if (error0) {
        console.error(error0);
        throw error0;
      }
      connection.createChannel((error1, channel) => {
        if (error1) {
          console.error(error1);
          throw error1;
        }

        channel.assertQueue(config.RABBITMQ.QUEUE, {
          durable: true
        });
        channel.prefetch(1);

        channel.consume(config.RABBITMQ.QUEUE, (msg: amqp.Message | null) => {
          if (!msg) return;

          (async () => {
            try {
              const payload: VerificationRequestMessage = parseJson(msg.content.toString());
              console.log(payload);

              await processVerification(payload.verificationRequestId);

              channel.ack(msg);
            } catch (e) {
              console.error(e);
            }
          })();
        }, {
          // manual acknowledgment mode,
          // see ../confirms.html for details
          noAck: false
        });
      });
    });
  } else if (isProd()) {
    const app = Consumer.create({
      queueUrl: config.AWS.QUEUE_URL,
      handleMessage: async (message) => {
        const payload = parseJson(message.Body as string);
        console.log(payload);

        await processVerification(payload.verificationRequestId);
      },
      sqs
    });

    app.start();
  }
}

export const sendVerificationRequestQueue = (message: VerificationRequestMessage) => {
  if (isDev()) {
    return new Promise((resolve: any, reject: any) => {
      amqp.connect(config.RABBITMQ.URL, (error0, connection) => {
        if (error0) {
          reject(error0);
        }
        connection.createChannel((error1, channel) => {
          if (error1) {
            reject(error1);
          }
          const msg = JSON.stringify(message);

          channel.assertQueue(config.RABBITMQ.QUEUE, {
            durable: true
          });
          channel.sendToQueue(config.RABBITMQ.QUEUE, Buffer.from(msg), {
            persistent: true
          });

          // connection.close();
          resolve();
        });

        setTimeout(() => {
          connection.close();
        }, 1000);
      });
    });
  } else if (isProd()) {
    return new Promise((resolve: any, reject: any) => {
      const params = {
        MessageBody: JSON.stringify(message),
        // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
        // MessageGroupId: "Group1",  // Required for FIFO queues
        QueueUrl: config.AWS.QUEUE_URL
      };

      sqs.sendMessage(params, (err, data) => {
        if (err) {
          console.log("Error", err);
          reject(err);
        } else {
          console.log("Success", data.MessageId);
          resolve(data.MessageId);
        }
      });
    });
  }
}

const compare = async (profileImageId: string, verificationImageId: string) => {
  if (!profileImageId || !verificationImageId) {
    return { matches: false };
  } else {
    const profileImageName = MediaService.createImageName(
      SIZE_BIG,
      profileImageId
    );

    try {
      const matches = await (isProd() ? compareFaces(profileImageName, verificationImageId) : Promise.resolve(true))

      return { matches };
    } catch (e) {
      error(e);

      return { matches: false };
    }
  };
}

const processVerification = (verificationRequestId: string) => {
  return new Promise((resolve: any, reject: any) => {
    ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery: ServiceDiscovery) => {
      const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

      const verificationRequest: { user_id: string; image_id: string; status: string; } = (await con.query(
        'SELECT user_id, image_id, status FROM verification_requests WHERE id = $1',
        [verificationRequestId]
      )).rows[0];

      let matches;
      if (verificationRequest?.status !== VerificationStatus.PENDING) {
        // matches = false;
        return;
      } else {
        const profileImageId: string = (await con.query(
          `SELECT id, profile_image_id FROM users WHERE id = $1`,
          [verificationRequest.user_id]
        )).rows[0]?.profile_image_id

        const compareResult = await compare(profileImageId, verificationRequest.image_id);
        matches = compareResult.matches;
      }

      try {
        con.query('BEGIN');

        if (matches) {
          await Promise.all([
            con.query(
              `UPDATE users SET verification_status = $1 WHERE id = $2`,
              [VerificationStatus.VERIFIED, verificationRequest.user_id]
            ),
            con.query(
              `UPDATE verification_requests SET status = $1 WHERE user_id = $2`,
              [VerificationStatus.VERIFIED, verificationRequest.user_id]
            )
          ]);
        } else {
          await Promise.all([
            con.query(
              `UPDATE users SET verification_status = $1 WHERE id = $2`,
              [VerificationStatus.REJECTED, verificationRequest.user_id]
            ),
            con.query(
              `DELETE FROM verification_requests WHERE user_id = $1`,
              [verificationRequest.user_id]
            )
          ]);

          await MediaService.deleteMedia([verificationRequest.image_id]);
        }

        con.query('COMMIT');
      } catch (e) {
        con.query('ROLLBACK');

        error(e);

        reject(e);
      }
    })
      .then(() => resolve());
  });
};
