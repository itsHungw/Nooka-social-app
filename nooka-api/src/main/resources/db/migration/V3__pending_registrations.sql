create table pending_registrations (
    id                     uuid primary key default gen_random_uuid(),
    email                  text not null unique,
    password_hash          text not null,
    code_hash              text not null,
    code_expires_at        timestamptz not null,
    attempts               integer not null default 0,
    code_consumed_at       timestamptz,
    verified_at            timestamptz,
    completion_token_hash  text unique,
    completion_expires_at  timestamptz,
    completed_at           timestamptz,
    created_at             timestamptz not null default now()
);

create index pending_registrations_completion_token_idx
    on pending_registrations (completion_token_hash);
