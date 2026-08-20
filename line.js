/**
 * 友だち登録している全員にFlex Message（カード型）を一括配信する（ブロードキャスト）
 * @param {Object} flexPayload - Flex MessageのJSON構造体
 */
function sendLineFlexNotification(flexPayload) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!token) {
    Logger.log('【LINE Error】LINE_CHANNEL_ACCESS_TOKEN が設定されていません。');
    return;
  }

  const url = 'https://api.line.me/v2/bot/message/broadcast';
  
  const payload = {
    messages: [
      {
        type: 'flex',
        altText: '🗞️ 本日の朝刊ニュースが届きました',
        contents: flexPayload
      }
    ]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    if (code === 200) {
      Logger.log('【LINE Flex】全員への一括配信（ブロードキャスト）成功！');
    } else {
      Logger.log('【LINE Flex Error】ステータスコード: ' + code + ' レスポンス: ' + response.getContentText());
    }
  } catch (e) {
    Logger.log('【LINE Exception】' + e.toString());
  }
}

/**
 * 友だち登録している全員にテキストメッセージを一括配信する（ブロードキャスト）
 * @param {string} messageText - 送信するテキスト内容
 */
function sendLineNotification(messageText) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!token) {
    Logger.log('【LINE Error】LINE_CHANNEL_ACCESS_TOKEN が設定されていません。');
    return;
  }

  const url = 'https://api.line.me/v2/bot/message/broadcast';
  
  const payload = {
    messages: [
      {
        type: 'text',
        text: messageText
      }
    ]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    if (code === 200) {
      Logger.log('【LINE Text】全員への一括配信（ブロードキャスト）成功！');
    } else {
      Logger.log('【LINE Text Error】ステータスコード: ' + code + ' レスポンス: ' + response.getContentText());
    }
  } catch (e) {
    Logger.log('【LINE Exception】' + e.toString());
  }
}

/**
 * Flex Messageの単体デザイン確認用テスト関数
 * GASエディタからこの関数を選択して「実行」してください
 */
function testLineFlexSend() {
  const dummyFlex = {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#1DB446",
      contents: [
        {
          type: "text",
          text: "🗞️ 朝刊のむぎちゃん",
          weight: "bold",
          color: "#FFFFFF",
          size: "lg"
        },
        {
          type: "text",
          text: "TEST MESSAGE",
          color: "#E8F5E9",
          size: "xs",
          margin: "xs"
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "1. カード表示のテストです",
          weight: "bold",
          size: "md",
          color: "#1DB446",
          wrap: true,
          margin: "md"
        },
        {
          type: "text",
          text: "Flex Messageによる綺麗なカード型配信の接続テストに成功しました！",
          size: "sm",
          color: "#555555",
          wrap: true,
          margin: "xs"
        }
      ]
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
          text: "今日も素晴らしい一日をお過ごしください！✨",
          size: "xs",
          color: "#AAAAAA",
          align: "center",
          margin: "md"
        }
      ]
    }
  };

  sendLineFlexNotification(dummyFlex);
}