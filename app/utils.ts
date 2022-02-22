import bcrypt from 'bcrypt';
import config from './config/config';
import MediaService from './services/media/MediaService';

const chars: any = { 'Ё': 'YO', 'Й': 'I', 'Ц': 'TS', 'У': 'U', 'К': 'K', 'Е': 'E', 'Н': 'N', 'Г': 'G', 'Ш': 'SH', 'Щ': 'SCH', 'З': 'Z', 'Х': 'H', 'Ъ': '\'', 'ё': 'yo', 'й': 'i', 'ц': 'ts', 'у': 'u', 'к': 'k', 'е': 'e', 'н': 'n', 'г': 'g', 'ш': 'sh', 'щ': 'sch', 'з': 'z', 'х': 'h', 'ъ': '\'', 'Ф': 'F', 'Ы': 'I', 'В': 'V', 'А': 'a', 'П': 'P', 'Р': 'R', 'О': 'O', 'Л': 'L', 'Д': 'D', 'Ж': 'ZH', 'Э': 'E', 'ф': 'f', 'ы': 'i', 'в': 'v', 'а': 'a', 'п': 'p', 'р': 'r', 'о': 'o', 'л': 'l', 'д': 'd', 'ж': 'zh', 'э': 'e', 'Я': 'Ya', 'Ч': 'CH', 'С': 'S', 'М': 'M', 'И': 'I', 'Т': 'T', 'Ь': '\'', 'Б': 'B', 'Ю': 'YU', 'я': 'ya', 'ч': 'ch', 'с': 's', 'м': 'm', 'и': 'i', 'т': 't', 'ь': '\'', 'б': 'b', 'ю': 'yu' };

const translate = (s: string) => s.split('')
  .map((c) => chars[c] || c)
  .join('');

const enSepWords = 'to a is by it from as of the in on my me with and or'.split(/\s+/);
const bgSepWords = 'с в е за са се и или на ни от аз ти при мен'.split(/\s+/);
const sepWords = [...enSepWords, ...bgSepWords.map(translate)];

const comprName = (name: string) => name.split(/[^a-zA-Z]+/)
  .map(s => s.toLowerCase())
  .filter(s => !sepWords.includes(s))
  .join('');

export const currentTimeMs = () => Date.now();

export const mapByKey = (a: any[], key: string) => {
  const result: { [key: string]: any } = {};
  for (const i of a) {
    result[i[key]] = i;
  }

  return result;
};

export const timeAgo = (time: number) => {
  const now = currentTimeMs() / 1000;//parseInt(currentTimeMs() / 1000);
  let d = now - time / 1000; //parseInt(time / 1000);
  if (d < 60) {
    return {
      key: 'few seconds ago'
    };
  }

  d = Math.floor(d / 60);
  if (d < 60) {
    return {
      key: `MINUTE${1 < d ? 'S' : ''}_AGO`,
      d
    };
  }

  d = Math.floor(d / 60);
  if (d < 24) {
    return {
      key: `HOUR${1 < d ? 'S' : ''}_AGO`,
      d
    };
  }

  d = Math.floor(d / 24);
  if (d < 7) {
    return {
      key: `DAY${1 < d ? 'S' : ''}_AGO`,
      d
    };
  }

  d = Math.floor(d / 7);
  if (d < 4) {
    return {
      key: `WEEK${1 < d ? 'S' : ''}_AGO`,
      d
    };
  }

  d = Math.floor(d / 4);
  if (d < 4) {
    return {
      key: `MONTH${1 < d ? 'S' : ''}_AGO`,
      d
    };
  }

  d = Math.floor(d / 12);
  if (d < 12) {
    return {
      key: `YEAR${1 < d ? 'S' : ''}`,
      d
    };
  }
};

export const calculateAge = (birthday: Date) => {
  const ageDifMs = Date.now() - birthday.getTime();
  const ageDate = new Date(ageDifMs);

  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export const hash = async (text: string) => {
  return bcrypt.hash(text, 10);
};

export const compareHash = async (text: string, hash: string) => {
  return bcrypt.compare(text, hash);
};

export const isProd = () => 'production' === config.ENV;
export const isDev = () => 'development' === config.ENV;

export const mapByKeyTarget = (result: any, key: string) => {
  const resp: any = {};
  result.rows.forEach((item: any) => {
    if (!resp[item[key]]) {
      resp[item[key]] = {};
    }

    resp[item[key]][comprName(item.name)] = item.favorite;
  });

  return resp;
};

export const mapImages = (images: { image_id: string }[]) => images.map(({ image_id }) => mapImage(image_id));

export const mapImage = (imageId: string) => (imageId ? {
  imageId,
  uri_small: MediaService.mediaPath(imageId, 'small'),
  uri_big: MediaService.mediaPath(imageId, 'big')
} : null);

export const parseJson = (json: string) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

export const makeProfileImage = (profileImageId: string, images: any[]) => {
  const targetIndex = images.findIndex(({ image_id }: any) => image_id === profileImageId);
  if (targetIndex <= 0) {
    return images;
  }

  const image = images.splice(targetIndex, 1)[0];
  images.unshift(image);

  return images;
};
