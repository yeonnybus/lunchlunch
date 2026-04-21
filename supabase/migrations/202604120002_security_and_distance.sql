alter table public.restaurants enable row level security;
alter table public.crawl_jobs enable row level security;
alter table public.daily_context enable row level security;
alter table public.user_preferences enable row level security;
alter table public.menu_recommendations enable row level security;
alter table public.recommendation_restaurants enable row level security;

drop policy if exists restaurants_read_authenticated on public.restaurants;
create policy restaurants_read_authenticated
on public.restaurants
for select
to authenticated
using (true);

drop policy if exists daily_context_read_authenticated on public.daily_context;
create policy daily_context_read_authenticated
on public.daily_context
for select
to authenticated
using (true);

drop policy if exists user_preferences_select_own on public.user_preferences;
create policy user_preferences_select_own
on public.user_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_preferences_insert_own on public.user_preferences;
create policy user_preferences_insert_own
on public.user_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists user_preferences_update_own on public.user_preferences;
create policy user_preferences_update_own
on public.user_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists menu_recommendations_select_own on public.menu_recommendations;
create policy menu_recommendations_select_own
on public.menu_recommendations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists menu_recommendations_insert_own on public.menu_recommendations;
create policy menu_recommendations_insert_own
on public.menu_recommendations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists recommendation_restaurants_select_own on public.recommendation_restaurants;
create policy recommendation_restaurants_select_own
on public.recommendation_restaurants
for select
to authenticated
using (
  exists (
    select 1
    from public.menu_recommendations mr
    where mr.id = recommendation_id
      and mr.user_id = auth.uid()
  )
);

create table if not exists public.geocode_cache (
  query text primary key,
  lat double precision not null,
  lng double precision not null,
  provider text,
  last_resolved_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists geocode_cache_last_resolved_at_idx on public.geocode_cache(last_resolved_at desc);

drop trigger if exists geocode_cache_set_updated_at on public.geocode_cache;
create trigger geocode_cache_set_updated_at
before update on public.geocode_cache
for each row
execute function public.set_updated_at();

alter table public.geocode_cache enable row level security;

alter table public.recommendation_restaurants
  add column if not exists distance_meters integer,
  add column if not exists walk_bucket text;
