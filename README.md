# ポジション希望調査・割当アプリ(GitHub Pages 版)

サーバー不要で GitHub Pages だけで動くバージョン。
回答はGitHubのAPI経由で「非公開リポジトリ」内のCSV(`responses.csv`)に追記されていき、
管理者ページでCSVを読み込んで最適割当(181,440通り全列挙)を計算します。

## 仕組み

```
参加者 ── index.html(GitHub Pages) ──▶ GitHub API ──▶ 非公開リポジトリ assignment-data/responses.csv
管理者 ── admin.html(GitHub Pages) ◀── GitHub API ◀── responses.csv → 全パターン計算 → 結果表示
```

## セットアップ手順(初回のみ・約10分)

### 1. サイト用の公開リポジトリを作る
1. GitHubで **New repository** → リポジトリ名は例えば `assignment-app`、**Public** で作成
2. このフォルダのファイル一式(index.html, admin.html, config.js, app-common.js, optimizer.js)をアップロード
   (「uploading an existing file」からドラッグ&ドロップでOK)

### 2. データ用の非公開リポジトリを作る
1. **New repository** → リポジトリ名は例えば `assignment-data`、**Private** で作成
2. READMEを作るだけでOK(CSVは自動生成されます)

### 3. パーソナルアクセストークンを発行する
1. GitHub → 右上アイコン → **Settings** → 左下 **Developer settings**
2. **Personal access tokens → Fine-grained tokens** → **Generate new token**
3. 設定内容:
   - **Token name**: 好きな名前(例: assignment-writer)
   - **Expiration**: 調査期間に合わせる(例: 7 days)
   - **Repository access**: **Only select repositories** → `assignment-data` を選択
   - **Permissions → Repository permissions → Contents**: **Read and write**
   - ※ 他の権限は一切付けない
4. 発行されたトークン(`github_pat_` で始まる)をコピー(画面を閉じると二度と見られません)

### 4. config.js を編集してコミット
`config.js` の以下を書き換えてコミット(変更は1〜2分でPagesに反映):
- `dataRepo`: `あなたのユーザー名/assignment-data`
- `token`: 発行したトークン
- `adminPassword`: 管理者ページのパスワード(変更推奨)

### 5. GitHub Pages を有効化する
1. `assignment-app` リポジトリ → **Settings** → **Pages**
2. Source: **Deploy from a branch** / Branch: **main** / /(root) → **Save**
3. 数分後 `https://あなたのユーザー名.github.io/assignment-app/` が公開される

### 6. 動作確認
- 上記URLを開いて自分の名前でテスト回答 → `assignment-data` リポジトリに `responses.csv` が作られることを確認
- `/assignment-app/admin.html` からログインして回答が見えること、「結果を算出」が動くことを確認
- `test.html`(https://…/assignment-app/test.html)を開くと計算ロジックの自己テストが走ります

## 使い方

- 参加者には `https://…github.io/assignment-app/` のURLだけを共有してください
- 管理者は `/admin.html` から回答確認・結果算出・コピー(出力形式は下記)・CSVダウンロードができます

```
下4誰々
下3誰々
下2誰々
下1誰々
0誰々
上1誰々
上2誰々
上3誰々
上4誰々
```

判定基準(第1希望+100 / 第2希望+50 / 第3希望+20 / NG割当-100,000 / 優先メンバーは10倍)は
Pythonサーバー版と完全に同じです。管理者ページ内にも同じ説明があります。

## セキュリティ上の注意(必ず読んでください)

- トークンはサイトのJS(config.js)に埋め込むため、**技術的に取り出すことは可能**です。
  ただし権限を「assignment-dataリポジトリのContents読み書きのみ」に絞ってあるので、
  悪用されても他のリポジトリやアカウントには影響しません。7人程度の知り合いで使う想定なら
  実用上十分な水準ですが、不特定多数にURLを公開する用途には使わないでください。
- 回答CSVは非公開リポジトリに置くため、通常の閲覧では参加者同士はお互いの回答を見られません。
- 管理者ページのパスワードはあくまで簡易的な鍵です(静的サイトなので完全な認証は不可能)。
- 調査が終わったら、トークンを失効させる(Developer settingsからDelete)か有効期限を過ぎさせることをおすすめします。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | 参加者用回答フォーム(全プルダウン) |
| `admin.html` | 管理者ページ(回答一覧・結果算出・コピー・CSVダウンロード) |
| `config.js` | 設定(リポジトリ名・トークン・パスワード・参加者・選択肢) |
| `app-common.js` | GitHub APIでのCSV読み書き・バリデーション |
| `optimizer.js` | 最適割当計算(サーバー版と同じロジック) |
| `bg.png` | 背景パターン(live-linksと同じ素材) |
| `test.html` | 計算ロジックの自己テスト(開発用・公開しても害はない) |

※ デザインは「ライブ映像(live-links)」と同じテーマ(Zen Maru Gothic・ピンク系)で統一しています。
Google Fontsを読み込むため、表示にはインターネット接続が必要です(オフラインでもフォントが変わるだけで機能します)。

## サーバー版(Python)との違い

| | Pythonサーバー版 | このGitHub Pages版 |
|---|---|---|
| 公開 | 自PC起動中のみ(LAN共有) | 常時URLで公開 |
| データ保存 | 自PCの responses.json | GitHub非公開リポジトリのCSV |
| 回答の保護 | 完全(管理者APIはパスワード保護) | 緩い(上記注意参照) |
| セットアップ | `python server.py` のみ | リポジトリ2つ+トークン発行 |
