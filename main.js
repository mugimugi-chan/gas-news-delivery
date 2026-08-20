// ==========================================
// 🛠️ 設定エリア（GASの「スクリプトプロパティ」から安全に取得）
// ==========================================
const scriptProperties = PropertiesService.getScriptProperties();
const GEMINI_API_KEY = scriptProperties.getProperty('GEMINI_API_KEY');
const TO_EMAIL       = scriptProperties.getProperty('TO_EMAIL');

// 🎨 LINEカードデザインのカラー設定（モーニング・スカイ）
const LINE_THEME = {
  HEADER_BG: "#0284C7",  // 清々しいスカイブルー（ヘッダー背景）
  HEADER_TEXT: "#FFFFFF",// ヘッダー文字色（白）
  TITLE_TEXT: "#0369A1", // 見出し文字色（深みのあるブルー）
  BODY_TEXT: "#334155"   // 本文文字色（ダークスレート）
};

// ==========================================
// 🚀 1. Gmailへニュースを送信する独立関数
// ==========================================
function sendDailyNewsToGmail() {
  console.log("--- Gmail配信処理を開始します ---");

  const { summary, dateStr } = getNewsSummary_();
  if (!summary) return;

  if (!TO_EMAIL) {
    console.error("【Error】スクリプトプロパティに TO_EMAIL が設定されていません。");
    return;
  }

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
// 💬 2. LINEへカード型（Flex Message）で送信する独立関数
// ==========================================
function sendDailyNewsToLine() {
  console.log("--- LINE (Flex Message) 配信処理を開始します ---");

  const { summary, dateStr } = getNewsSummary_();
  if (!summary) return;

  // Flex Message のJSONを作成（色設定を適用）
  const flexJson = buildFlexMessage_(summary, dateStr);
  
  // LINE送信（line.gsの関数を呼び出し）
  sendLineFlexNotification(flexJson);

  console.log("LINE Flex Message の送信処理が完了しました！");
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
// 🛠️ 【共通内部関数】RSS取得（国内＋国際） ＆ Gemini要約
// ==========================================
function getNewsSummary_() {
  try {
    const rssUrls = [
      "https://news.yahoo.co.jp/rss/categories/domestic.xml", // 国内
      "https://news.yahoo.co.jp/rss/categories/world.xml"    // 国際
    ];

    let rawNewsText = "";

    rssUrls.forEach(url => {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (response.getResponseCode() === 200) {
        const xml = XmlService.parse(response.getContentText());
        const items = xml.getRootElement().getChild('channel').getChildren('item');
        
        for (let i = 0; i < Math.min(items.length, 2); i++) {
          let title = items[i].getChildText('title');
          let link = items[i].getChildText('link');
          rawNewsText += `・${title}\n  URL: ${link}\n\n`;
        }
      }
    });

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
// 🎨 LINE Flex Message（カードデザイン）構築関数
// ==========================================
function buildFlexMessage_(summary, dateStr) {
  let cleanSummary = summary.replace(/\*\*(.*?)\*\*/g, '$1');
  const lines = cleanSummary.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const bodyContents = [];

  lines.forEach(line => {
    if (/^\d+\./.test(line)) {
      bodyContents.push({
        type: "text",
        text: line,
        weight: "bold",
        size: "md",
        color: LINE_THEME.TITLE_TEXT, // 設定エリアの色を適用
        wrap: true,
        margin: "md"
      });
    } else {
      bodyContents.push({
        type: "text",
        text: line,
        size: "sm",
        color: LINE_THEME.BODY_TEXT,  // 設定エリアの色を適用
        wrap: true,
        margin: "xs"
      });
    }
  });

  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: LINE_THEME.HEADER_BG, // 設定エリアの色を適用
      contents: [
        {
          type: "text",
          text: "🗞️ 朝刊のむぎちゃん",
          weight: "bold",
          color: LINE_THEME.HEADER_TEXT,
          size: "lg"
        },
        {
          type: "text",
          text: dateStr,
          color: LINE_THEME.HEADER_TEXT,
          size: "xs",
          margin: "xs"
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: bodyContents
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "separator",
          color: "#EEEEEE"
        },
        {
          type: "text",
          text: "今日も素晴らしい一日をお過ごしください！☀️",
          size: "xs",
          color: "#AAAAAA",
          align: "center",
          margin: "md"
        }
      ]
    }
  };
}

// ==========================================
// 🎨 HTML整形関数（Gmail用）
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