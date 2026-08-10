-- Product spec §3/§13: private profile is the outer visibility gate.
alter table users
    add column private_profile boolean not null default false;

-- Follow remains the accepted relationship. Requests are separate directed
-- rows and never grant read access until they are accepted into `follows`.
create table follow_requests (
    requester_id uuid        not null references users on delete cascade,
    target_id    uuid        not null references users on delete cascade,
    created_at   timestamptz not null default now(),
    primary key (requester_id, target_id),
    check (requester_id <> target_id)
);

create index follow_requests_target_idx
    on follow_requests (target_id, created_at desc);
