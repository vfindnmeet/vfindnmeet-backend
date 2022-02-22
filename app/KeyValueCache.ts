const cache: { [key: string]: any } = {};

export const storeToCache = (key: string, value: any) => {
  cache[key] = value;
};

export const retriveFromCache = (key: string) => cache[key] ?? null;
