import { isConnected, sendWsMessage } from './WsService';
import { PushNotificationMessage, sendPushNotifications } from '../PushNotification';
import SessionTokenRepository from '../repositories/SessionTokenRepository';

// import path from 'path';
// path.join(__dirname, `/../../uploads/${size}${mediaId}`)

import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.cert({
    "type": "service_account",
    "project_id": "pn-test1-3b20d",
    "private_key_id": "99c42462d21198d2cfcfc6009aa9cceb7da4ed76",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCgADCz74czq8UD\n3I/pZNWklci20mc3nCtSmd8CMSCmULUlVydv81ugh8lKgVF5G2QNcrncXXluMDZU\nOJiA4Ou8Dd/Spzc1HbY+T7sX1nnLX0kRnrKa4YT9HoxQQuECBRxuraS9OTf/aAqC\nGwnUzN8438VoTzzSdES9IuH771rUwR8ruKeGF3WELYagKyO8TtLSq3Zmge8n/syM\nFQsCUn12054cwrYsNy1HN4fuAF7NzX2J6O6A/j5lDtJ8BKVKOdekIi6Sh2skYUp7\n4eKnr9vsD2fcMBG995o24Zm7WS5msGbdSkJsaLcf+8oaVJYAMDEGHamojqsTeRfX\n7mkBPQErAgMBAAECggEAC5J380urt60AvtrA/dxxJ0o+DhsBpCADciH24y2yctT7\nhQvcqlgrlFy9zkm0HtJAVkip8KpCEhoik8zUGt4prpxCR/YYJBtWBwO1QHAetvrZ\nShD0UgdlmvkOpO9xXrgH6mlctOLijfJ0cByMhXub2X01xemVOJN4NUXEmnghVanU\nqUgFlPNaPKYn2PeU/AR6B7MSim9BSuQZFm1meqi27fVy5o5ZNPq11WWUwAZj8WC2\nThJXgLxNBglEFVjL+hUnBPwHLOY9B2S+13e/vI4zAtQhiS2Szc+3r+l4WsJhbii9\nri4qwc45qyOQ6qB1EsvdP2kxCZ0lvftEl14h7EqdYQKBgQDhYB8JY3B6OjngfY+8\n/5rrbh3OEEYPESDImAeGOI7yObKRTdWXe+I7kZ3yQ7wtAGyw+vqFynEDooKZPrDF\naBaoufUUAWDDaRHCvqGD1dPOzj83kpOJEb3KJNJaG0Y3n9QCN0bf4VXkagKFSPSX\nSCmXUXY0tra8rW2xMJDUWPHl1QKBgQC1vfP7MYIVbcrKsThaOpJO3QpncgFYTeF5\nH46objWGICj/MqqYItWMYj4WHlKrqGamK4VU40gA8+VUwDJRXJFNC0fiIdE3vPFv\nUODtK2i2bnCumLpY9me/PWt7Ba2iR0iifg4i0JVV/FWDIhjvowUV9thBl9r9kWmr\nNcz8AbPK/wKBgQC4QMg++a/8DVxB3wVDY8j4zubJD97m9H7T4A7OubCL8YW+a17C\n4MIdJzh01tGiDOXPbvCfrtjkOtkAhhMo4KcdvCHUAChmuaCOkSEk0gy+1zkxqsC5\nX+rEt4PNrNykHyPJx/1GjUeWXODArNtiTtnJ3wx/nh0ZdcPnB6hwImNpHQKBgFNZ\nUlOZWPdK6v4aWKXIxuC0LtlSR5uf3BAYkOxd3t4sUaD4M5SiJR3E0ISEU5W2HZ2H\nyBYuRg9py3sayfjWYyzaR5VFvRW66V8L0Jv0lIlWDQeFs7CpENt755b7+624027y\nMLl2v4Y3u1/we08rjGGOW495fU1dKwECI4hPn40xAoGAfi+b/pbuG6JetqKKXcCw\nMdhpDwFAl9B9ZFk/PfrknZDRaLR8BqHu4yOpFTjmDbDK3IQIWi39LhOHG1hwhVJ1\njZZhTc5CFV2M0RZXkR8BVn4p6Zu+ROJL7MoXbSw94zFbxbyspMFOyvUiZbJwY6Jy\ncRE9gYK07jeLw3pEFNTzdAs=\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-y43a5@pn-test1-3b20d.iam.gserviceaccount.com",
    "client_id": "105245256294882313633",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-y43a5%40pn-test1-3b20d.iam.gserviceaccount.com"
  } as any)
});

export default class NotificationService {
  constructor(
    private sessionTokenRepository: SessionTokenRepository
  ) { }

  hasWsConnection(userId: string): boolean {
    return isConnected(userId);
  }

  async sendPushNotification(userId: string, message: PushNotificationMessage) {
    const pushTokens = (await this.sessionTokenRepository.getPushTokensForUser(userId)).filter(Boolean);

    if (pushTokens.length <= 0) return;

    console.log('pushTokens', pushTokens);

    // await sendPushNotifications(message, pushTokens);

    try {
      // const r = await admin.messaging().sendToDevice(
      //   pushTokens, // ['token_1', 'token_2', ...]
      //   {
      //     data: {
      //       k1: 'dsa1',
      //       k2: 'v2 ds',
      //       message: message.message
      //     },
      //   },
      //   {
      //     // Required for background/quit data-only messages on iOS
      //     contentAvailable: true,
      //     // Required for background/quit data-only messages on Android
      //     priority: 'high',
      //   },
      // );
      // console.log(r);
      admin.messaging().sendMulticast({
        tokens: pushTokens,
        notification: {
          title: 'Basic Notification',
          body: 'This is a basic notification sent from the server!',
          // imageUrl: 'https://d5nunyagcicgy.cloudfront.net/external_assets/hero_examples/hair_beach_v391182663/original.jpeg',
        },
      });
    } catch (e) {
      console.error(e);
    }
  }
}
