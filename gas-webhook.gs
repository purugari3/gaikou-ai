/* ============================================================
   Google Apps Script — Webhook for GAIKOU AI DIAGNOSIS
   ------------------------------------------------------------
   使い方:
   1. Google スプレッドシートを新規作成し、シート名を
      「診断結果」「相談予約」の2つ用意する
   2. 拡張機能 > Apps Script を開き、このコードを貼り付ける
   3. LINE_NOTIFY_TOKEN を自分のトークンに置き換える
      （https://notify-bot.line.me/ja/ から発行）
   4. 「デプロイ」>「新しいデプロイ」>「ウェブアプリ」
      - アクセスできるユーザー: 全員
      - 発行されたURLを Netlify の環境変数 GAS_WEBHOOK_URL に設定
   ============================================================ */

const LINE_NOTIFY_TOKEN = 'YOUR_LINE_NOTIFY_TOKEN';

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const type = body.type;
  const data = body.data || {};

  if (type === 'diagnosis') {
    writeDiagnosis(data);
    notifyLine(buildDiagnosisMessage(data));
  } else if (type === 'reservation') {
    writeReservation(data);
    notifyLine(buildReservationMessage(data));
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function writeDiagnosis(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('診断結果');
  const a = data.answers || {};
  sheet.appendRow([
    new Date(),
    a.atmosphere, a.siteArea, a.siteShape, a.buildingArea, a.buildingType,
    a.gardenArea, a.carNormal, a.carKei, a.carport,
    a.gatePost, a.deliveryBox, a.fenceBlind, a.fenceOpen,
    a.artificialGrass, a.woodDeck, a.planting,
    a.exteriorStyle, a.budget,
    (a.priorities || []).map(p => p.label).join(' > '),
    data.image_url || ''
  ]);
}

function writeReservation(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('相談予約');
  sheet.appendRow([
    new Date(),
    data.name, data.contact, data.method, data.message
  ]);
}

function buildDiagnosisMessage(data) {
  const a = data.answers || {};
  return '\n【AI外構診断 完了】\n雰囲気: ' + (a.atmosphere || '-') +
    '\nスタイル: ' + (a.exteriorStyle || '-') +
    '\n予算: ' + (a.budget || '-');
}

function buildReservationMessage(data) {
  return '\n【無料相談の申し込み】\nお名前: ' + data.name +
    '\n連絡先: ' + data.contact +
    '\n方法: ' + (data.method || '-') +
    '\nご要望: ' + (data.message || 'なし');
}

function notifyLine(message) {
  if (!LINE_NOTIFY_TOKEN || LINE_NOTIFY_TOKEN === 'YOUR_LINE_NOTIFY_TOKEN') return;
  UrlFetchApp.fetch('https://notify-api.line.me/api/notify', {
    method: 'post',
    headers: { Authorization: 'Bearer ' + LINE_NOTIFY_TOKEN },
    payload: { message: message }
  });
}
