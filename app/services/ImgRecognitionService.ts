import AWS from 'aws-sdk';
import config from'../config/config';

// const conf = new AWS.Config({
//   accessKeyId: config.AWS.ACCESS_KEY,
//   secretAccessKey: config.AWS.SECRET_KEY,
//   region: config.AWS.REGION
// });

// const client = new AWS.Rekognition(conf);
import '../../aws';

const client = new AWS.Rekognition();

const baseParams = (photoName: string) => ({
  Image: {
    S3Object: {
      Bucket: config.S3_BUCKET_NAME,
      Name: photoName
    },
  }
});

export const detectInappropriate = (photoName: string) => new Promise((resolve, reject) => {
  client.detectModerationLabels({ ...baseParams(photoName), MinConfidence: 60 }, (err: any, response: any) => {
    if (err) {
      reject(err);

      return;
    }

    const isInappropriate = response?.ModerationLabels.length > 0;

    resolve(isInappropriate);
  });
});

export const detectFaces = (photoName: string) => new Promise((resolve, reject) => {
  client.detectFaces({ ...baseParams(photoName), Attributes: ['DEFAULT'] }, (err: any, response: any) => {
    if (err) {
      reject(err);

      return;
    }

    const hasFaces = (Array.isArray(response?.FaceDetails) ? response.FaceDetails : []).filter(({ Confidence }: any) => Confidence >= 60).length > 0;

    resolve(hasFaces);
  });
});

export const compareFaces = (sourcePhoto: string, targetPhoto: string) => new Promise((resolve, reject) => {
  const params = {
    SourceImage: {
      S3Object: {
        Bucket: config.S3_BUCKET_NAME,
        Name: sourcePhoto
      },
    },
    TargetImage: {
      S3Object: {
        Bucket: config.S3_BUCKET_NAME,
        Name: targetPhoto
      },
    },
    SimilarityThreshold: 70
  };

  client.compareFaces(params, (err: any, response: any) => {
    if (err) {
      reject(err);

      return;
    }

    const faceMatches = (Array.isArray(response?.FaceMatches) ? response.FaceMatches : []).filter(({ Similarity }: any) => Similarity >= 60).length > 0;

    resolve(faceMatches);
  });
});
