export const workshopImage = require('@/assets/images/nooka/workshop-coffee.png');
export const savedMapImage = require('@/assets/images/nooka/saved-map.png');

export const homePost = {
  authorInitials: 'L',
  authorNameKey: 'home.author.name',
  postedAtKey: 'home.author.postedAt',
  captionKey: 'home.caption',
  placeNameKey: 'home.workshopName',
  locationKey: 'home.locationDetail',
  categoryKeys: ['home.categories.quiet', 'home.categories.work', 'home.categories.outdoor'],
  hashtagsKey: 'home.hashtags',
} as const;

export const placeResults = [
  {
    id: 'blank',
    image: require('@/assets/images/nooka/blank-lounge.png'),
    nameKey: 'places.blank.name',
    metaKey: 'places.blank.meta',
    socialKey: 'places.blank.social',
    friendCount: 2,
  },
  {
    id: 'little-hanoi',
    image: require('@/assets/images/nooka/little-hanoi.png'),
    nameKey: 'places.littleHanoi.name',
    metaKey: 'places.littleHanoi.meta',
    socialKey: 'places.littleHanoi.social',
    friendCount: 1,
  },
  {
    id: 'saigon-roastery',
    image: require('@/assets/images/nooka/saigon-roastery.png'),
    nameKey: 'places.saigon.name',
    metaKey: 'places.saigon.meta',
    socialKey: 'places.saigon.social',
    friendCount: 3,
  },
] as const;

export const savedPlaces = [
  {
    id: 'saigon-roastery',
    image: require('@/assets/images/nooka/saigon-roastery.png'),
    nameKey: 'places.saigon.name',
    metaKey: 'places.saigon.meta',
    socialKey: 'saved.wantToGo',
  },
  {
    id: 'workshop',
    image: workshopImage,
    nameKey: 'places.workshop.name',
    metaKey: 'places.workshop.meta',
    socialKey: 'places.workshop.social',
  },
] as const;

export const profile = {
  displayNameKey: 'profile.displayName',
  usernameKey: 'profile.username',
  bioKey: 'profile.bio',
  avatarInitials: 'MA',
  postCount: 9,
  followerCount: 248,
  followingCount: 183,
} as const;

export const profilePosts = [
  { id: 'workshop-morning', image: workshopImage, placeNameKey: 'places.workshop.name', postedAtKey: 'post.today' },
  { id: 'blank-evening', image: require('@/assets/images/nooka/blank-lounge.png'), placeNameKey: 'places.blank.name', postedAtKey: 'post.threeDaysAgo' },
  { id: 'little-hanoi-door', image: require('@/assets/images/nooka/little-hanoi.png'), placeNameKey: 'places.littleHanoi.name', postedAtKey: 'post.oneWeekAgo' },
  { id: 'saigon-roastery-light', image: require('@/assets/images/nooka/saigon-roastery.png'), placeNameKey: 'places.saigon.name', postedAtKey: 'post.twoWeeksAgo' },
  { id: 'workshop-plants', image: workshopImage, placeNameKey: 'places.workshop.name', postedAtKey: 'post.threeWeeksAgo' },
  { id: 'blank-corner', image: require('@/assets/images/nooka/blank-lounge.png'), placeNameKey: 'places.blank.name', postedAtKey: 'post.oneMonthAgo' },
  { id: 'little-hanoi-table', image: require('@/assets/images/nooka/little-hanoi.png'), placeNameKey: 'places.littleHanoi.name', postedAtKey: 'post.oneMonthAgo' },
  { id: 'saigon-roastery-bar', image: require('@/assets/images/nooka/saigon-roastery.png'), placeNameKey: 'places.saigon.name', postedAtKey: 'post.twoMonthsAgo' },
  { id: 'workshop-window', image: workshopImage, placeNameKey: 'places.workshop.name', postedAtKey: 'post.twoMonthsAgo' },
] as const;
