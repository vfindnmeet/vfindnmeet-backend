import MediaService from '../services/media/MediaService';
import { timeAgo } from '../utils';

export const item = (intro: any) => ({
  id: intro.id,
  liked_at: intro.liked_at,
  fromUserId: intro.from_user_id,
  timeAgo: timeAgo(intro.created_at),
  type: intro.type,
  message: intro.message,
  mediaPath: MediaService.mediaPath(intro.media_metadata_id)
});
