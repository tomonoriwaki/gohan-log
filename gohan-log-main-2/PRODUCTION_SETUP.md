# もぐログ 本番化メモ

このファイルは、アカウント機能、共有データベース、写真ストレージ、メール認証、管理者権限、AI判定を本番運用するための設定メモです。

## いま追加済みのもの

- 投稿を全員で共有する Netlify Blobs ベースの保存処理
- 写真を保存する Netlify Blobs ベースのストレージ処理
- 料理写真かどうかを判定する Netlify Function `netlify/functions/analyze-food.mjs`
- PWA化用の `manifest.webmanifest` と `service-worker.js`
- 利用規約 `terms.html`
- プライバシーポリシー `privacy.html`

## Netlifyに必要な環境変数

Netlifyの管理画面で、対象サイトを開きます。

`Site configuration` -> `Environment variables` から追加します。

```text
OPENAI_API_KEY=sk-...
OPENAI_VISION_MODEL=gpt-4.1-mini
```

`OPENAI_API_KEY` を入れると、料理以外の画像を投稿前にAI判定で止められるようになります。

## 本物のメール認証について

本物のメール認証は、HTMLだけでは実現できません。おすすめは Supabase Auth です。

Supabase を使う場合は、次の機能をまとめて使えます。

- メールアドレス認証
- パスワードログイン
- メール確認
- 投稿用のPostgresデータベース
- 写真用のStorage
- Row Level Securityによる権限管理

## Supabaseで作るテーブル例

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  image_path text not null,
  shop_name text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_boosts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
```

## 管理者だけが他人の投稿を削除するルール例

```sql
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_boosts enable row level security;

create policy "posts are visible to everyone"
on public.posts for select
using (true);

create policy "users can create their own posts"
on public.posts for insert
with check (auth.uid() = user_id);

create policy "owners can delete own posts"
on public.posts for delete
using (auth.uid() = user_id);

create policy "admins can delete any post"
on public.posts for delete
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
```

## スマホアプリ化

まずはPWAとして公開できます。

1. Netlifyに反映する
2. スマホで公開URLを開く
3. iPhoneならSafariの共有ボタンから「ホーム画面に追加」
4. AndroidならChromeのメニューから「アプリをインストール」

App Store / Google Play に出す場合は、PWAを Capacitor で包む方法が次の段階です。

## 注意

利用規約とプライバシーポリシーは実用的なひな形です。公開規模が大きくなる場合、法律や各ストア審査に詳しい専門家の確認をおすすめします。
