create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'naver_map',
  source_id text not null,
  name text not null,
  category text,
  phone text,
  address text,
  road_address text,
  lat double precision,
  lng double precision,
  region text not null,
  menus text[] not null default '{}',
  rating numeric(3, 2),
  review_count integer,
  raw jsonb,
  last_crawled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (source, source_id)
);

create index if not exists restaurants_region_idx on public.restaurants(region);
create index if not exists restaurants_menus_gin_idx on public.restaurants using gin(menus);

create trigger restaurants_set_updated_at
before update on public.restaurants
for each row
execute function public.set_updated_at();

create table if not exists public.crawl_jobs (
  id uuid primary key default gen_random_uuid(),
  region text not null,
  query text not null,
  status text not null,
  started_at timestamptz,
  ended_at timestamptz,
  total_collected integer not null default 0,
  total_upserted integer not null default 0,
  error_message text,
  triggered_by text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists crawl_jobs_created_at_idx on public.crawl_jobs(created_at desc);

create table if not exists public.daily_context (
  id uuid primary key default gen_random_uuid(),
  context_date date not null,
  location text not null,
  weather jsonb,
  events text[] not null default '{}',
  situations text[] not null default '{}',
  raw jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (context_date, location)
);

create trigger daily_context_set_updated_at
before update on public.daily_context
for each row
execute function public.set_updated_at();

create table if not exists public.user_preferences (
  user_id uuid primary key,
  favorite_menus text[] not null default '{}',
  disliked_ingredients text[] not null default '{}',
  dietary_rules text[] not null default '{}',
  preferred_vibes text[] not null default '{}',
  max_budget_krw integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row
execute function public.set_updated_at();

create table if not exists public.menu_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  region text not null,
  context_date date not null,
  recommended_menus jsonb not null,
  reasoning text,
  model_name text,
  confidence text,
  input_snapshot jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists menu_recommendations_context_idx on public.menu_recommendations(context_date desc, region);

create table if not exists public.recommendation_restaurants (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.menu_recommendations(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  rank integer not null,
  score numeric(8, 3) not null,
  match_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (recommendation_id, restaurant_id)
);

create index if not exists recommendation_restaurants_recommendation_idx on public.recommendation_restaurants(recommendation_id);
create index if not exists recommendation_restaurants_rank_idx on public.recommendation_restaurants(rank);
