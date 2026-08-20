/**
 * 友だち登録している全員に一括でLINEメッセージを配信する（ブロードキャスト）
 * @param {string} messageText - 送信するテキスト内容
 */
function sendLineNotification(messageText) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!token) {
    Logger.log('【LINE Error】LINE_CHANNEL_ACCESS_TOKEN が設定されていません。');
    return;
  }

  // ブロードキャスト配信用のAPIエンドポイント（USER_ID不要）
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
      Logger.log('【LINE】全員への一括配信（ブロードキャスト）成功！');
    } else {
      Logger.log('【LINE Error】ステータスコード: ' + code + ' レスポンス: ' + response.getContentText());
    }
  } catch (e) {
    Logger.log('【LINE Exception】' + e.toString());
  }
}

/**
 * LINE送信用の単体疎通テスト関数
 * GASエディタからこの関数を選択して「実行」してください
 */
function testLineSend() {
  const sampleMessage = "☀️ 朝刊のむぎちゃんです！\n全体配信（ブロードキャスト）のテストに成功しました！";
  sendLineNotification(sampleMessage);
}