create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  title text not null default 'Untitled document',
  content text not null default '',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table document_shares (
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'editor' check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  primary key (document_id, user_id)
);

create index on documents(owner_id);
create index on document_shares(user_id);

-- Block direct public access; the app only talks to the DB from the server
alter table users enable row level security;
alter table documents enable row level security;
alter table document_shares enable row level security;

insert into users (name, email) values
  ('Alice Owner', 'alice@demo.test'),
  ('Bob Teammate', 'bob@demo.test'),
  ('Carol Reviewer', 'carol@demo.test');