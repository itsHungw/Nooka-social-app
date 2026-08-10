import type { FriendId, PostVisibility } from './spots.ts';

export function toggleAudienceFriend(selected: FriendId[], friend: FriendId): FriendId[] {
  return selected.includes(friend)
    ? selected.filter((id) => id !== friend)
    : [...selected, friend];
}

export function audienceCanPost(visibility: PostVisibility, selected: FriendId[]): boolean {
  return visibility !== 'SELECTED_FRIENDS' || selected.length > 0;
}
