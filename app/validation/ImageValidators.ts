import { detectFaces, detectInappropriate } from "../services/ImgRecognitionService";

export const validateImage = async (imageName: string) => {
  const hasFaces = await detectFaces(imageName);
  if (!hasFaces) {
    return false;
  }

  const isInappropriate = await detectInappropriate(imageName);
  if (isInappropriate) {
    return false;
  }

  return true;
}

// export const validatedSize = (size: string) => {
//   return typeof size === 'string' ? SIZES[size] : size;
// }
