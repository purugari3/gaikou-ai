# AI外構診断（GAIKOU AI CONCIERGE）

「全ては仕組みと導線設計。」をコンセプトに、「自然・緑・上質・シンプル」をデザインの軸とした
外構診断PWAです。13STEPの質問に答えるだけで、AIが「予算重視・デザイン重視・動線重視」の
3パターンの完成イメージ・概算金額・総合評価・節約ポイント・DIYアドバイスを生成します。

相談率の最大化を目的に、結果画面には無料セカンドオピニオン・Zoom相談・LINE登録・
Instagramシェアへの導線を設計しています。

将来的な拡張（外構見積AI／外構パースAI／施工店マッチング／DIYプラン生成）を
前提に、データ層・API層を分離した構成にしています。

---

## 1. 構成

```
/index.html              診断フォーム（13STEP → 3パターン結果表示）
/admin.html              管理画面
/manifest.json, /sw.js   PWA設定・Service Worker

/css/styles.css          デザインシステム（自然・緑・上質・シンプル / Appleライクな余白と角丸24px）

/js/config.js            設定（API/DB/管理パスワード/LINE・Zoom・Instagram/将来機能フラグ）
/js/db.js                データ層（Supabase or localStorage）
/js/app.js               診断フォーム・結果画面のロジック
/js/admin.js             管理画面のロジック

/assets/icons/           PWAアイコン

/functions/
  generate-proposal.js   AI提案文生成（Claude API・3パターン+総合評価+節約ポイント+DIYアドバイス）
  generate-image.js      AI外構画像生成（gpt-image-1・3パターン分・自動リトライ2回）
  notify.js              Googleスプレッドシート/LINE通知の中継

/supabase-schema.sql     Supabase用テーブル定義（任意）
/gas-webhook.gs           Google Apps Script サンプル（Sheets+LINE）
/netlify.toml             Netlify設定
```

---

## 2. デプロイ手順（Netlify）

1. このフォルダをGitリポジトリにする（または「Add new site」>「Deploy manually」でzipをドラッグ&ドロップ）
2. Netlifyで新規サイトを作成し、Build settingsはデフォルト（publish = `.`, functions = `functions`）のままでOK
3. Site settings > Environment variables で以下を設定（すべて任意）：

| 変数名 | 用途 | 未設定時の動作 |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI提案文生成（Claude API） | フロントエンドのローカル生成にフォールバック |
| `OPENAI_API_KEY` | AI外構画像生成（gpt-image-1・3パターン分） | 結果画面に「もう一度生成する」ボタンを表示 |
| `GAS_WEBHOOK_URL` | Googleスプレッドシート連携 | スキップ |
| `LINE_NOTIFY_TOKEN` | LINE通知 | スキップ |

さらに `js/config.js` で以下を自社の情報に差し替えてください（環境変数ではなくコード内の設定値です）。

| 設定項目 | 用途 |

|---|---|
| `LINE_ADD_FRIEND_URL` | 「画像を保存する」モーダルで案内する公式LINEの友達追加URL |
| `ZOOM_URL` | 結果画面から直接遷移するZoomミーティングURL |
| `INSTAGRAM.handle` / `INSTAGRAM.url` | Instagramシェア時に案内するアカウント |
| `ADMIN_PASSWORD` | 管理画面ログインパスワード |

4. デプロイ後、`https://あなたのサイト/` が診断フォーム、
   `https://あなたのサイト/admin.html` が管理画面になります。

---

## 3. 各機能の設定

### AI提案文生成（Claude API）
- `ANTHROPIC_API_KEY` を設定すると、`generate-proposal.js` がClaude API
  （`claude-sonnet-4-6`）を呼び出し、「予算重視・デザイン重視・動線重視」3パターンの
  提案文（コンセプト・概算金額・総合評価・節約ポイント）とDIYアドバイスをJSONで生成します。
- 未設定の場合は `js/app.js` 内の `mockProposals()` がローカルでテキストを生成するため、
  キー未設定でも一通り動作確認できます。

### AI外構画像生成（3パターン）
- `generate-image.js` は `OPENAI_API_KEY` を設定するとOpenAI Images API（**gpt-image-1**）を呼び出します。
  `response_format` は指定せず、`b64_json` で返却された画像を `data:image/png;base64,...` 形式の
  `imageUrl` に変換してフロントへ返します（`url`形式が返る場合はそのまま使用）。
- 429/5xx・タイムアウト時は最大2回まで自動リトライします（合計3回・全体で約27秒以内）。
  `netlify.toml` で `generate-image` のタイムアウトを30秒に設定しています。
- フロントエンドは「予算重視・デザイン重視・動線重視」それぞれ専用のプロンプトで
  本関数を3回並列に呼び出し、パターンごとに異なる完成イメージを生成します。
  生成した画像URLは各パターンのデータとして保持され、`localStorage`（`gaikou_last_images`）にも保存されます。
- 画像が生成できない場合でも画面は崩れず、結果画面に「画像を生成しています／
  混雑状況により少し時間がかかっています」と表示され、「もう一度生成する」ボタンで
  そのパターンだけ再試行できます（詳細なエラー内容はFunction logs / ブラウザコンソールに出力されます）。

### 画像保存（LINE登録）・Zoom相談・Instagramシェア
- 結果画面の「画像を保存する」ボタンは、`js/config.js` の `LINE_ADD_FRIEND_URL`
  （公式LINEの友達追加リンク）への誘導をはさんでから画像をダウンロードできる構成です。
  リード（友達登録）を獲得しつつ、高画質画像を提供する導線になっています。
- 無料セカンドオピニオンのバナーには `ZOOM_URL`（Zoomミーティングリンク）への
  ボタンを設置しており、フォーム入力なしで即時相談に進めます。
- 「Instagramでシェア」ボタンは、対応端末では画像付きでWeb Shareを行い、
  非対応の場合はキャプションをコピーして `INSTAGRAM.url` を新規タブで開きます。
  `js/config.js` の `INSTAGRAM.handle` / `INSTAGRAM.url` を自社アカウントに変更してください。

### 診断結果の保存・管理画面
- デフォルトはブラウザの `localStorage` に保存されます（同一端末・同一ブラウザでのみ閲覧可）。
- 複数人で管理画面を使う場合は **Supabase** の利用を推奨します。
  1. Supabaseでプロジェクトを作成
  2. SQL Editorで `supabase-schema.sql` を実行
  3. `js/config.js` に `SUPABASE_URL` / `SUPABASE_ANON_KEY` を設定
  4. 以降、診断結果・相談予約・連携設定がSupabaseに保存されます

- 管理画面（`/admin.html`）のログインパスワードは `js/config.js` の
  `ADMIN_PASSWORD` で設定します（初期値: `kadomatsu-2026`）。
  簡易的なクライアント側ゲートのため、本格運用時はSupabase Authへの移行を推奨します。

### CSV出力
- 管理画面の「診断一覧」「相談予約」タブから、表示中の全データをCSV（Excel対応のBOM付き）でダウンロードできます。

### Googleスプレッドシート連携 / LINE通知
- `gas-webhook.gs` をGoogleスプレッドシートのApps Scriptに設定し、ウェブアプリとして公開
- 発行されたURLを `GAS_WEBHOOK_URL` に設定すると、診断完了・相談予約時にスプレッドシートへ自動記録 + LINE Notifyへ通知されます
- GASを使わず直接LINEだけに通知したい場合は `LINE_NOTIFY_TOKEN` のみ設定してください

### PWA対応
- `manifest.json` / `sw.js` により、スマホで「ホーム画面に追加」が可能です
- アイコンは `/assets/icons/icon-192.png` `/assets/icons/icon-512.png`

---

## 4. デザインシステム

- コンセプト: 「自然・緑・上質・シンプル」（ナチュラルモダン × 高級住宅展示場）
  ／Appleライクな余白・角丸24px・薄いシャドウ
- カラー: Paper(背景) `#F7FAF6` / Surface(カード) `#FFFFFF` / Main `#5E8B65` /
  Sub `#7FA37F` / Accent `#BFD8B8` / Button `#4F7A54` / Button Hover `#3F6544`
- フォント: 見出し=Shippori Mincho／本文=Zen Kaku Gothic New／数値・ラベル=Space Mono
- 詳細は `css/styles.css` のコメントを参照してください

---

## 5. 将来拡張モジュールの追加方法

`js/config.js` の `FEATURES` フラグで管理します。

```js
FEATURES: {
  estimateAI: false,    // 外構見積AI
  perspectiveAI: false, // 外構パースAI
  matching: false,      // 施工店マッチング
  diyPlan: false        // DIYプラン生成
}
```

| モジュール | 追加方法の想定 |
|---|---|
| 外構見積AI | `functions/generate-estimate.js` を追加し、結果画面に「見積を見る」カードを追加。回答内容＋地域相場データから概算金額を算出 |
| 外構パースAI | `generate-image.js` にバリエーション生成（角度・素材・色変更）のエンドポイントを追加し、結果画面にギャラリーUIを追加 |
| 施工店マッチング | `reservations` テーブルに `store_id` 等を追加し、エリア・予算でマッチングするロジックを管理画面に追加 |
| DIYプラン生成 | 予算が小さい回答に対して、購入リスト・施工手順を生成する新規Functionを追加し、結果画面に分岐表示 |

いずれも既存の「診断回答（answers）→ AI生成 → 結果カード表示 → 保存」という
データフローに合流させる形で追加できるよう、`js/app.js` のレンダリング部分を
カード単位のコンポーネントとして分離しています。

---

## 6. ローカル確認

サーバーレス関数を使わずに `index.html` を直接ブラウザで開いても、
AI生成はローカルのモック・画像は「もう一度生成する」表示で動作確認できます。

Netlify Functionsを含めてローカル確認する場合は [Netlify CLI](https://docs.netlify.com/cli/get-started/) を使用してください。

```bash
npm install -g netlify-cli
netlify dev
```

---

## 7. トラブルシューティング：環境変数が反映されない場合

`OPENAI_API_KEY` や `ANTHROPIC_API_KEY` をNetlifyの環境変数に設定したのに
「未設定です」「読み取れませんでした」と表示される場合、以下を確認してください。

1. **設定後に再デプロイされているか**
   Netlify Functionsは環境変数を**ビルド/デプロイ時にバンドル**します。
   サイト稼働中に環境変数を追加・変更しても、既存のデプロイには反映されません。
   Netlifyの管理画面で **Deploys → Trigger deploy → Clear cache and deploy site** を実行してください。

2. **適用範囲（Scopes）が正しいか**
   環境変数の設定画面で、対象スコープに **Functions**（またはAll scopes）が
   含まれているかを確認してください。Builds のみに設定されている場合、
   Function実行時には読み取れません。

3. **デプロイコンテキストが正しいか**
   Production / Deploy previews / Branch deploys ごとに異なる値を設定している場合、
   実際にアクセスしているURLのコンテキストに値が設定されているか確認してください。

4. **キー名の前後にスペースが入っていないか**
   `generate-image.js` / `generate-proposal.js` / `notify.js` は、
   キー名が完全一致しない場合でも大文字小文字を無視して再検索し、
   値の前後の空白・改行を自動的に除去するようにしています。
   それでも読み取れない場合、Function logに
   「OPENAI関連のキー名一覧」（値は表示しません）が出力されるので、
   実際に設定されているキー名を確認できます。

5. **Function logsの確認方法**
   Netlify管理画面 → Functions → 該当の関数 → ログ で、
   `generate-image: OPENAI_API_KEY readable = true/false` という行を確認してください。
   `false` の場合は上記1〜4を再確認し、再デプロイしてください。



## Vercel公開メモ

この版はVercel対応済みです

GitHubへZIPではなく中身をアップロードしてからVercelでImportしてください

必要な環境変数

- ANTHROPIC_API_KEY
- OPENAI_API_KEY
- GAS_WEBHOOK_URL 任意
- LINE_NOTIFY_TOKEN 任意

フロント側のAPIパスは以下へ変更済みです

- /api/generate-proposal
- /api/generate-image
- /api/notify
