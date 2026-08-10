create table if not exists event_publication (
    id                     uuid not null,
    listener_id            text not null,
    event_type             text not null,
    serialized_event       text not null,
    publication_date       timestamptz not null,
    completion_date        timestamptz,
    status                 text,
    completion_attempts    int,
    last_resubmission_date timestamptz,
    primary key (id)
);

create index if not exists event_publication_serialized_event_hash_idx
    on event_publication using hash (serialized_event);

create index if not exists event_publication_by_completion_date_idx
    on event_publication (completion_date);