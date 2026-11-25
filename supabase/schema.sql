-- Sistem Analisis Sentimen Media Sosial
-- Jalankan skrip ini dalam Supabase SQL Editor.

create table if not exists public.sentiment_records (
  id               uuid primary key default gen_random_uuid(),
  external_id      text not null unique,          -- kunci untuk upsert, elak rekod berganda
  crawl_date       date not null,                 -- tarikh folder harian YYYY-MM-DD
  platform         text not null,                 -- x | tiktok | facebook | threads
  content          text not null,
  sentiment        text not null check (sentiment in ('positif', 'negatif', 'neutral')),
  confidence_score double precision not null default 0
                   check (confidence_score >= 0 and confidence_score <= 1),
  keywords         text[] not null default '{}',
  engagement_count integer not null default 0 check (engagement_count >= 0),
  created_at       timestamptz not null default now()
);

-- Kategori siaran (ditambah kemudian; selamat dijalankan semula)
alter table public.sentiment_records add column if not exists commodity   text;
alter table public.sentiment_records add column if not exists source      text;
alter table public.sentiment_records add column if not exists source_type text
  check (source_type in ('sosial', 'berita', 'peruncit'));
alter table public.sentiment_records add column if not exists lang        text;
alter table public.sentiment_records add column if not exists topics      text[] not null default '{}';
alter table public.sentiment_records add column if not exists states      text[] not null default '{}';
alter table public.sentiment_records add column if not exists districts   text[] not null default '{}';
alter table public.sentiment_records add column if not exists posted_date date;
-- Pecahan interaksi (null = tiada dalam data sumber)
alter table public.sentiment_records add column if not exists likes    integer;
alter table public.sentiment_records add column if not exists comments integer;
alter table public.sentiment_records add column if not exists shares   integer;
-- ai | kata_kunci | label
alter table public.sentiment_records add column if not exists sentiment_source text;
create index if not exists sentiment_records_sentiment_source_idx
  on public.sentiment_records (sentiment_source);

create index if not exists sentiment_records_crawl_date_idx
  on public.sentiment_records (crawl_date desc);
create index if not exists sentiment_records_platform_idx
  on public.sentiment_records (platform);
create index if not exists sentiment_records_sentiment_idx
  on public.sentiment_records (sentiment);
create index if not exists sentiment_records_keywords_idx
  on public.sentiment_records using gin (keywords);

-- Jejak fail Google Drive yang sudah disegerakkan (digunakan oleh /api/sync-drive)
create table if not exists public.drive_sync_log (
  file_id       text primary key,
  folder_name   text not null,
  file_name     text not null,
  modified_time text,
  record_count  integer not null default 0,
  synced_at     timestamptz not null default now()
);

-- Risiko & harga per komoditi daripada fail db-curated-YYYY-MM-DD.csv
create table if not exists public.commodity_risk (
  key             text primary key,               -- YYYY-MM-DD:slug-komoditi
  date            date not null,
  commodity       text not null,
  risk_before     double precision,
  risk_current    double precision,
  risk_forward    double precision,
  band            text not null default '',
  sentiment_index double precision,
  sample_n        integer,
  price_label     text not null default '',
  price_value     double precision,
  price_unit      text not null default '',
  price_date      date,
  preliminary     boolean not null default false,
  analyst_note    text not null default '',
  created_at      timestamptz not null default now()
);

create index if not exists commodity_risk_date_idx on public.commodity_risk (date desc);
create index if not exists commodity_risk_commodity_idx on public.commodity_risk (commodity);

-- Row Level Security: pelayar (anon key) hanya boleh membaca.
-- Penulisan dibuat oleh API server menggunakan service role key (memintas RLS).
alter table public.sentiment_records enable row level security;
alter table public.drive_sync_log enable row level security;
alter table public.commodity_risk enable row level security;

drop policy if exists "Baca awam sentiment_records" on public.sentiment_records;
create policy "Baca awam sentiment_records"
  on public.sentiment_records for select
  to anon, authenticated
  using (true);

-- Realtime: benarkan postgres_changes pada jadual ini
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sentiment_records'
  ) then
    alter publication supabase_realtime add table public.sentiment_records;
  end if;
end $$;
