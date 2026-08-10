-- A local pending upload retries with the same key instead of creating another
-- post. Old rows predate this contract and intentionally remain null.
alter table posts add column idempotency_key uuid;

create unique index posts_author_idempotency_key
    on posts (author_id, idempotency_key)
    where idempotency_key is not null;

-- Product spec §13: visit time is hidden unless the author opts in.
alter table posts alter column hide_time set default true;

alter table posts drop constraint posts_visibility_check;
alter table posts add constraint posts_visibility_check
    check (visibility in ('PUBLIC', 'FOLLOWERS', 'CLOSE_FRIENDS', 'SELECTED_FRIENDS', 'PRIVATE'));

-- A selected audience is immutable Post metadata. Reads still pass through
-- PostVisibilityRules; possession of a media URL never bypasses this table.
create table post_audience (
    post_id    uuid not null references posts on delete cascade,
    viewer_id  uuid not null references users on delete cascade,
    created_at timestamptz not null default now(),
    primary key (post_id, viewer_id)
);

create index post_audience_viewer_idx on post_audience (viewer_id, post_id);

-- Media objects live in a private bucket. public_id identifies the protected
-- application route; storage_key never leaves the backend.
alter table post_media
    add column public_id uuid not null default gen_random_uuid(),
    add column crop_zoom numeric(4, 2) not null default 1,
    add column crop_offset_x numeric(5, 4) not null default 0,
    add column crop_offset_y numeric(5, 4) not null default 0,
    alter column url drop not null;

alter table post_media
    add constraint post_media_public_id_key unique (public_id),
    add constraint post_media_position_check check (position between 0 and 4),
    add constraint post_media_width_check check (width is null or width > 0),
    add constraint post_media_height_check check (height is null or height > 0),
    add constraint post_media_bytes_check check (bytes is null or bytes > 0),
    add constraint post_media_crop_zoom_check check (crop_zoom between 1 and 3),
    add constraint post_media_crop_offset_x_check check (crop_offset_x between -1 and 1),
    add constraint post_media_crop_offset_y_check check (crop_offset_y between -1 and 1);

create unique index post_media_storage_key_key
    on post_media (storage_key)
    where storage_key is not null;

-- Free-form Post hashtags are not the curated Spot tag taxonomy.
create table post_hashtags (
    post_id        uuid    not null references posts on delete cascade,
    display_text   text    not null,
    normalized_key text    not null,
    position       integer not null,
    primary key (post_id, normalized_key),
    unique (post_id, position),
    check (char_length(display_text) between 1 and 64),
    check (char_length(normalized_key) between 1 and 64),
    check (position between 0 and 9)
);

create index post_hashtags_search_idx on post_hashtags (normalized_key, post_id);
