-- ============================================================
-- 星際科學記號大冒險：成績紀錄表
-- 使用方式：到 Supabase 後台 → SQL Editor → 貼上整份執行
-- ============================================================

create table if not exists sci_notation_records (
  id bigint generated always as identity primary key,
  class_name text not null default '',
  seat_no text not null default '',
  student_name text not null default '',
  level text not null default '',
  score integer not null default 0,
  correct_count integer not null default 0,
  total_count integer not null default 0,
  accuracy integer not null default 0,
  max_combo integer not null default 0,
  answers jsonb not null default '[]'::jsonb,
  played_at timestamptz not null default now()
);

-- 啟用 RLS，並開放匿名新增 + 讀取（校園課堂使用，簡化授權）
alter table sci_notation_records enable row level security;

drop policy if exists "公開新增成績" on sci_notation_records;
create policy "公開新增成績" on sci_notation_records
  for insert to anon with check (true);

drop policy if exists "公開讀取成績" on sci_notation_records;
create policy "公開讀取成績" on sci_notation_records
  for select to anon using (true);

create index if not exists idx_sci_records_class on sci_notation_records (class_name);
create index if not exists idx_sci_records_played on sci_notation_records (played_at desc);
