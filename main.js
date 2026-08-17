// ==========================================
// 🛠️ 設定エリア（GASの「スクリプトプロパティ」から安全に取得）
// ==========================================
const scriptProperties = PropertiesService.getScriptProperties();
const GEMINI_API_KEY = scriptProperties.getProperty('GEMINI_API_KEY');
const TO_EMAIL       = scriptProperties.getProperty('TO_EMAIL');

// ==========================================
// 🚀 ニュース取得・要約・メール送信のメイン処理
// ==========================================
function sendDailyNews() {
  // 1. Yahoo!ニュース（主要）のRSSを取得
  const rssUrl = "https://news.yahoo.co.jp/rss/topics/top-picks.xml";
  const response = UrlFetchApp.fetch(rssUrl);
  const xml = XmlService.parse(response.getContentText());
  const items = xml.getRootElement().getChild('channel').getChildren('item');

  // 最新3件の「タイトル」と「リンク」を抽出
  let rawNewsText = "";
  for (let i = 0; i < Math.min(items.length, 3); i++) {
    let title = items[i].getChildText('title');
    let link = items[i].getChildText('link');
    rawNewsText += `・${title}\n  URL: ${link}\n\n`;
  }

  // 2. Gemini APIを使ってニュースを要約（出力フォーマットを厳格に指定）
  const prompt = `以下のニュース3件を読み、忙しい朝でも30秒で理解できるように、それぞれの要点を簡潔にまとめてください。

【出力ルール】
- 箇条書き記号（* や - や ・）は絶対に使わないでください。
- 各ニュースは **数字. タイトル** の形式で見出しにし、次の行に要約文を書いてください。

${rawNewsText}`;

  const summary = callGemini(prompt);

  // 3. 今日のおしゃれな日付文字列を作成
  const now = new Date();
  const dateStr = Utilities.formatDate(now, "JST", "yyyy.MM.dd EEE").toUpperCase();

  // 4. HTMLテンプレートを使ってメール本文を作成
  const htmlBody = buildHtmlEmail(summary, dateStr);
  const plainBody = `おはようございます！今日の要約ニュースです。\n\n${summary}`;
  const subject = `☀️ 【朝の要約ニュース】${Utilities.formatDate(now, "JST", "MM/dd")}`;

  // 5. Gmailで送信
  GmailApp.sendEmail(TO_EMAIL, subject, plainBody, {
    htmlBody: htmlBody
  });
}

// ==========================================
// 🎨 HTML整形関数（余白とスタイルを緻密に調整）
// ==========================================
function buildHtmlEmail(summary, dateStr) {
  const template = HtmlService.createTemplateFromFile('index');

  // 1. マークダウンの太字（見出し）を抽出して、余白付きの見出しブロックに変換
  let html = summary.replace(/\*\*(.*?)\*\*/g, (match, title) => {
    // ポッチや余計な記号を除去
    const cleanTitle = title.replace(/^[・\*\-\s]+/, '');
    return `<div style="font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 20px; margin-bottom: 8px;">${cleanTitle}</div>`;
  });

  // 2. 残った行（本文）に適切な行高と余白を設定
  html = html
    .replace(/^([^\<].+)$/gm, '<div style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 16px;">$1</div>')
    .replace(/\n/g, '');

  template.formattedSummary = html;
  template.dateStr = dateStr;

  return template.evaluate().getContent();
}

// ==========================================
// 🤖 Gemini APIを叩く関数
// ==========================================
function callGemini(promptText) {
  if (!GEMINI_API_KEY) {
    throw new Error('スクリプトプロパティに GEMINI_API_KEY が設定されていません！');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    "contents": [
      {
        "parts": [{"text": promptText}]
      }
    ]
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  const res = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(res.getContentText());

  if (json.error) {
    console.error('Gemini API Error:', JSON.stringify(json.error));
    throw new Error(`Gemini APIからエラーが返されました: ${json.error.message}`);
  }
  
  return json.candidates[0].content.parts[0].text;
}

// ==========================================
// 🧪 API消費ゼロ！HTMLデザイン確認用テスト関数
// ==========================================
function sendTestEmail() {
  // Gemini APIを叩かずに使うダミーテキスト
  const dummySummary = 
    "**1. 要約タイトルその1**\n" +
    "最初のニュースの内容です。\n\n" +
    "**2. 要約タイトルその2**\n" +
    "次のニュースの内容です。\n\n" +
    "**3. 要約タイトルその3**\n" +
    "最後のニュースの内容です。";

  const now = new Date();
  const dateStr = Utilities.formatDate(now, "JST", "yyyy.MM.dd EEE").toUpperCase();

  const htmlBody = buildHtmlEmail(dummySummary, dateStr);
  const plainBody = `[TEST] 今日の要約ニュースです。\n\n${dummySummary}`;
  const subject = `【TEST】朝の要約ニュース ${Utilities.formatDate(now, "JST", "MM/dd")}`;

  GmailApp.sendEmail(TO_EMAIL, subject, plainBody, {
    htmlBody: htmlBody
  });

  console.log("テストメールを送信しました！（API消費: 0回）");
}