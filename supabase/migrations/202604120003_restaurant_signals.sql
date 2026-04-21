alter table public.restaurants
  add column if not exists price_tier text,
  add column if not exists premium_risk_score smallint not null default 0,
  add column if not exists cuisine_tags text[] not null default '{}';

create index if not exists restaurants_price_tier_idx on public.restaurants(price_tier);
create index if not exists restaurants_premium_risk_idx on public.restaurants(premium_risk_score);
create index if not exists restaurants_cuisine_tags_gin_idx on public.restaurants using gin(cuisine_tags);
