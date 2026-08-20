// ==========================================
// 🛠️ 設定エリア（GASの「スクリプトプロパティ」から安全に取得）
// ==========================================
const scriptProperties = PropertiesService.getScriptProperties();
const GEMINI_API_KEY = scriptProperties.getProperty('GEMINI_API_KEY');
const TO_EMAIL       = scriptProperties.getProperty('TO_EMAIL');

// ==========================================
// 🚀 1. Gmailへニュースを送信する独立関数
// ==========================================
function sendDailyNewsToGmail() {
  console.log("--- Gmail配信処理を開始します ---");

  // ニュース取得 & Gemini要約を実行
  const { summary, dateStr } = getNewsSummary_();
  if (!summary) return;

  if (!TO_EMAIL) {
    console.error("【Error】スクリプトプロパティに TO_EMAIL が設定されていません。");
    return;
  }

  // HTMLメールの作成と送信
  const htmlBody = buildHtmlEmail(summary, dateStr);
  const plainBody = `おはようございます！今日の要約ニュースです。\n\n${summary}`;
  const now = new Date();
  const subject = `☀️ 【朝の要約ニュース】${Utilities.formatDate(now, "JST", "MM/dd")}`;

  GmailApp.sendEmail(TO_EMAIL, subject, plainBody, {
    htmlBody: htmlBody
  });

  console.log("Gmailの送信が成功しました！");
}

// ==========================================
// 💬 2. LINEへニュースを送信する独立関数
// ==========================================
function sendDailyNewsToLine() {
  console.log("--- LINE配信処理を開始します ---");

  // ニュース取得 & Gemini要約を実行
  const { summary, dateStr } = getNewsSummary_();
  if (!summary) return;

  // LINE用テキストへ整形してブロードキャスト送信
  const lineMessage = formatForLine(summary, dateStr);
  sendLineNotification(lineMessage);

  console.log("LINEの送信処理が完了しました！");
}

// ==========================================
// 🔄 3. GmailとLINEの両方に一括送信する関数（トリガー用）
// ==========================================
function sendDailyNewsToAll() {
  console.log("--- メール・LINE 一括配信を開始します ---");
  sendDailyNewsToGmail();
  sendDailyNewsToLine();
  console.log("--- すべての配信が完了しました ---");
}

// ==========================================
// 🛠️ 【共通内部関数】RSS取得 ＆ Gemini要約
// ==========================================
function getNewsSummary_() {
  try {
    // 1. 国内と国際の最新RSSを取得
    const rssUrls = [
      "https://news.yahoo.co.jp/rss/categories/domestic.xml", // 国内
      "https://news.yahoo.co.jp/rss/categories/world.xml"    // 国際（世界事情）
    ];

    let rawNewsText = "";

    rssUrls.forEach(url => {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (response.getResponseCode() === 200) {
        const xml = XmlService.parse(response.getContentText());
        const items = xml.getRootElement().getChild('channel').getChildren('item');
        
        // 各カテゴリから上位2件ずつ抽出
        for (let i = 0; i < Math.min(items.length, 2); i++) {
          let title = items[i].getChildText('title');
          let link = items[i].getChildText('link');
          rawNewsText += `・${title}\n  URL: ${link}\n\n`;
        }
      }
    });

    // 2. Geminiプロンプト（国内外から重要なものを厳選させる）
    const prompt = `以下の国内外の最新ニュースから、今日抑えておくべき重要ニュースを3件選び、忙しい朝でも30秒で理解できるように要点を簡潔にまとめてください。

【出力ルール】
- 箇条書き記号（* や - や ・）は絶対に使わないでください。
- 各ニュースは **数字. タイトル** の形式で見出しにし、次の行に要約文を書いてください。

${rawNewsText}`;

    const summary = callGemini(prompt);
    const now = new Date();
    const dateStr = Utilities.formatDate(now, "JST", "yyyy.MM.dd EEE").toUpperCase();

    return { summary, dateStr };
  } catch (e) {
    console.error("要約生成エラー: " + e.toString());
    return { summary: null, dateStr: null };
  }
}

// ==========================================
// 💬 LINE送信用テキスト整形関数
// ==========================================
function formatForLine(summary, dateStr) {
  let cleanSummary = summary.replace(/\*\*(.*?)\*\*/g, '$1');

  let text = `🗞️ 【朝刊のむぎちゃん】 ${dateStr}\n`;
  text += `----------------------------------------\n\n`;
  text += cleanSummary.trim();
  text += `\n\n----------------------------------------\n`;
  text += `今日も良い一日をお過ごしください！☀️`;

  return text;
}

// ==========================================
// 🎨 HTML整形関数
// ==========================================
function buildHtmlEmail(summary, dateStr) {
  const template = HtmlService.createTemplateFromFile('index');

  let html = summary.replace(/\*\*(.*?)\*\*/g, (match, title) => {
    const cleanTitle = title.replace(/^[・\*\-\s]+/, '');
    return `<div style="font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 20px; margin-bottom: 8px;">${cleanTitle}</div>`;
  });

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
// 🧪 API消費ゼロ！HTML＆LINE送信テスト用関数
// ==========================================
function sendTestAll() {
  const dummySummary = 
    "**1. 要約タイトルその1**\n" +
    "最初のニュースの内容です。\n\n" +
    "**2. 要約タイトルその2**\n" +
    "次のニュースの内容です。\n\n" +
    "**3. 要約タイトルその3**\n" +
    "最後のニュースの内容です。";

  const now = new Date();
  const dateStr = Utilities.formatDate(now, "JST", "yyyy.MM.dd EEE").toUpperCase();

  // メールテスト
  if (TO_EMAIL) {
    const htmlBody = buildHtmlEmail(dummySummary, dateStr);
    const plainBody = `[TEST] 今日の要約ニュースです。\n\n${dummySummary}`;
    const subject = `【TEST】朝の要約ニュース ${Utilities.formatDate(now, "JST", "MM/dd")}`;
    GmailApp.sendEmail(TO_EMAIL, subject, plainBody, { htmlBody: htmlBody });
  }

  // LINEテスト
  const lineMessage = formatForLine(dummySummary, dateStr);
  sendLineNotification(lineMessage);

  console.log("テストメール＆LINEテスト送信完了！");
}