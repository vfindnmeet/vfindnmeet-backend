export default class InappropriateImageError extends Error {
  constructor(message?: string) {
    super(message ?? 'Inappropriate image content.');

    this.name = 'InappropriateImageError';
  }
}
