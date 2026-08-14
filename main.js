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

  // 2. Gemini APIを使ってニュースを要約（1回目のAPI呼び出し）
  const prompt = `以下のニュース3件を読み、忙しい朝でも30秒で理解できるように、それぞれの要点を簡潔にまとめてください。\n\n${rawNewsText}`;
  const summary = callGemini(prompt);

  // 3. Gmailで自分宛てに送信
  const subject = "【朝の要約ニュース】今日のピックアップ";
  const body = `おはようございます！今日の要約ニュースです。\n\n${summary}`;
  
  GmailApp.sendEmail(TO_EMAIL, subject, body);
}

// ==========================================
// 🤖 Gemini APIを叩く関数
// ==========================================
function callGemini(promptText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
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
  
  return json.candidates[0].content.parts[0].text;
}