# 🗞️ 朝刊のむぎちゃん (gas-news-delivery)

Google Apps Script (GAS) と Gemini API を活用し、毎日毎朝の最新ニュースを全自動で要約し、**HTMLメール（Gmail）** と **LINE（Flex MessageカードUI）** へ同時配信する自動化システムです。

---

## 🚀 概要・特徴

* **🤖 Gemini API (Gemini 2.5 Flash) による要約**  
  毎朝膨大なニュースを読む時間がない人向けに、30秒で読めるよう重要ニュース3件を自動抽出・要約します。
* **📧 デザイン性の高い HTML メール配信**  
  Gmailを通じて、視認性の高い美しいHTMLデザインで朝刊を届けます。
* **💬 LINE ブロードキャスト配信（Flex Message）**  
  LINE Messaging APIの Flex Message を採用し、公式アカウントのような洗練されたカード型UIでニュースを一斉配信します。
* **🛡️ 堅牢なニュース取得（RSSトラブル対策済み）**  
  Yahoo!ニュースの主要トピックス（`top-picks.xml`）で発生しがちな「過去のアーカイブ記事が混ざるトラブル」を回避するため、国内・国際カテゴリを合成してGeminiに渡す安定構成を採用しています。
* **⚙️ 完全自動化 (GASタイマートリガー)**  
  GASのタイマートリガーを設定することで、毎朝決まった時間に完全無人配信します。

---

## 🏗️ 処理フロー

```text
  [ Yahoo!ニュース RSS ] ─── (国内 / 国際)
            │
            ▼
     [ GAS (main.gs) ] ─── ニューステキスト抽出
            │
            ▼
    [ Gemini 2.5 Flash ] ─── 30秒で読める要約文を作成
            │
  ┌─────────┴─────────┐
  ▼                   ▼
【Gmail API】       【LINE Messaging API】
 (HTMLメール)        (Flex Message / ブロードキャスト)
```

---

## 📂 ファイル構成

| ファイル名 | 役割 |
| :--- | :--- |
| `main.gs` | メイン処理。RSS取得・Gemini要約呼び出し・メールおよびLINE送信用データの生成と制御 |
| `line.gs` | LINE Messaging API（Broadcast）連携モジュール。テキスト・Flex Messageの送信処理 |
| `index.html` | Gmail送信用のHTMLメールテンプレート |

---

## 🛠️ セットアップ手順

### 1. スクリプトプロパティの設定
GASの「プロジェクトの設定」＞「スクリプト プロパティ」に以下のキーを登録します。

| プロパティ名 | 説明 |
| :--- | :--- |
| `GEMINI_API_KEY` | Google AI Studio で発行した Gemini API キー |
| `TO_EMAIL` | ニュースを受け取る送信先メールアドレス |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers で発行した「チャネルアクセストークン（長期）」 |

---

### 2. コードの導入（選べる2パターン）

ご自身の開発スタイルに合わせて、どちらかの方法で導入してください。

#### パターンA：ブラウザのGASエディタに直接コピペする（サクッと試したい方向け）
1. Google Apps Script で新規プロジェクトを作成します。
2. 左メニュー「HTMLを追加」で `index.html` を作成し、リポジトリの `index.html` の中身を貼り付けます。
3. `コード.gs` を `main.gs` にリネームし、リポジトリの `main.js` の中身を貼り付けます。
4. ファイル追加（`+`）から `line.gs` を作成し、リポジトリの `line.js` の中身を貼り付けます。

#### パターンB：clasp を使ってローカルからデプロイする（CLIで管理したい方向け）
```bash
# 1. リポジトリのクローン
git clone [https://github.com/mugimugi-chan/gas-news-delivery.git](https://github.com/mugimugi-chan/gas-news-delivery.git)
cd gas-news-delivery

# 2. clasp の準備とログイン
npm install -g @google/clasp
clasp login

# 3. GASプロジェクトの作成（新規作成の場合）
clasp create --title "gas-news-delivery" --type standalone

# （※既存のGASプロジェクトと紐付ける場合）
# clasp clone "YOUR_SCRIPT_ID"

# 4. コードのプッシュ
clasp push
```

### 3. LINE Official Account の準備

1. [LINE Developers](https://developers.line.biz/console/) にて Messaging API チャネルを作成します。
2. BotアカウントをスマホのLINEで友だち追加します。
3. チャネルアクセストークンを発行し、手順1のスクリプトプロパティに登録します。

---

## 💡 開発時の工夫・ハマりポイント（裏話）

### ⚠️ Yahoo!ニュースRSSの「時空の歪み（過去記事混在）」問題
開発初期、LINE通知テスト時に **「数年前の過去記事（災害や国際情勢）」が最新ニュースとして送られてくる現象** が発生しました。

* **原因**:  
  `[https://news.yahoo.co.jp/rss/topics/top-picks.xml](https://news.yahoo.co.jp/rss/topics/top-picks.xml)`（主要トピックス）は、タイミングによってアーカイブ記事や回想ニュースを返してくる仕様があるため。
* **対策**:  
  常にリアルタイムな最新ニュースを取得するため、**国内カテゴリ（`domestic.xml`）** と **国際カテゴリ（`world.xml`）** の2つのRSSをGAS側で取得・合成してGeminiに渡し、そこから重要ニュースを3件厳選させるロジックにアップデートしました。

---

## 🧪 各機能の単体テスト

コード内には、Gemini APIの無駄な消費を防ぎつつ安全に動作確認ができるテスト関数を用意しています。

* **`sendDailyNewsToGmail()`**: Gmail送信のみを実行
* **`sendDailyNewsToLine()`**: LINE（Flex Message）送信のみを実行
* **`sendDailyNewsToAll()`**: メールとLINEの両方に一括送信（本番トリガー用）
* **`testLineFlexSend()`** (`line.gs`内): API消費ゼロでLINEのカードデザイン（Flex Message）の表示を確認