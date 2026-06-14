-- ============================================================
-- GAIKOU AI DIAGNOSIS — Supabase Schema
-- Supabaseの SQL Editor でそのまま実行してください。
-- 実行後、assets/config.js に SUPABASE_URL / SUPABASE_ANON_KEY を設定すると、
-- 診断結果・相談予約・管理設定がSupabaseに保存されます。
-- ============================================================

-- 診断結果
create table if not exists diagnoses (
  id text primary key,
  created_at timestamptz not null default now(),
  answers jsonb not null,
  proposal jsonb,
  image_url text,
  status text not null default 'new'  -- new | done
);

-- 相談予約
create table if not exists reservations (
  id text primary key,
  created_at timestamptz not null default now(),
  name text not null,
  contact text not null,
  method text,                         -- online | visit | phone
  message text,
  diagnosis_summary jsonb,
  status text not null default 'new'   -- new | done
);

-- 管理画面設定（シングルトン: id=1）
create table if not exists settings (
  id integer primary key default 1,
  gas_webhook_url text,
  line_notify_token text,
  notify_email text
);

-- ---- Row Level Security -------------------------------------------------
-- フロントエンドはanonキーで insert / select するため、最低限のポリシーを設定します。
-- 本番運用では、管理画面のselect/update/deleteはSupabase Auth経由の
-- service_role もしくは認証済みユーザーに限定することを推奨します。

alter table diagnoses enable row level security;
alter table reservations enable row level security;
alter table settings enable row level security;

create policy "anon can insert diagnoses" on diagnoses
  for insert to anon with check (true);
create policy "anon can select diagnoses" on diagnoses
  for select to anon using (true);
create policy "anon can update diagnoses" on diagnoses
  for update to anon using (true);

create policy "anon can insert reservations" on reservations
  for insert to anon with check (true);
create policy "anon can select reservations" on reservations
  for select to anon using (true);

create policy "anon can select settings" on settings
  for select to anon using (true);
create policy "anon can upsert settings" on settings
  for insert to anon with check (true);
create policy "anon can update settings" on settings
  for update to anon using (true);
