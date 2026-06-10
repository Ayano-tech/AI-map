/**
 * AI活用診断 マスタースプレッドシート初期化スクリプト
 *
 * 使い方：
 *  1. 空のGoogleスプレッドシートを開く
 *  2. 拡張機能 → Apps Script でこのコードを貼り付ける
 *  3. setupMasterSpreadsheet() を選択して実行
 *  4. 権限を承認する
 */

function setupMasterSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setName("AI活用診断_マスター管理");

  // ========================================
  // Sheet 1: companies タブ
  // ========================================
  let companiesSheet = ss.getSheetByName("companies");
  if (!companiesSheet) {
    // デフォルトの「シート1」をリネーム
    const defaultSheet = ss.getSheets()[0];
    defaultSheet.setName("companies");
    companiesSheet = defaultSheet;
  }

  companiesSheet.clearContents();

  // ヘッダー行
  const companyHeaders = [
    ["id", "name", "industry", "employeeCount", "code", "createdAt", "sheetId", "sheetUrl"]
  ];
  companiesSheet.getRange("A1:H1").setValues(companyHeaders);

  // ヘッダーのスタイル
  const companyHeaderRange = companiesSheet.getRange("A1:H1");
  companyHeaderRange.setBackground("#1A2A3E");
  companyHeaderRange.setFontColor("#FFFFFF");
  companyHeaderRange.setFontWeight("bold");
  companyHeaderRange.setHorizontalAlignment("center");

  // 列幅の調整
  companiesSheet.setColumnWidth(1, 140);  // id
  companiesSheet.setColumnWidth(2, 180);  // name
  companiesSheet.setColumnWidth(3, 120);  // industry
  companiesSheet.setColumnWidth(4, 100);  // employeeCount
  companiesSheet.setColumnWidth(5, 100);  // code
  companiesSheet.setColumnWidth(6, 180);  // createdAt
  companiesSheet.setColumnWidth(7, 200);  // sheetId
  companiesSheet.setColumnWidth(8, 300);  // sheetUrl

  // 列固定（ヘッダー行を凍結）
  companiesSheet.setFrozenRows(1);

  // ========================================
  // Sheet 2: 運用メモ タブ
  // ========================================
  let memoSheet = ss.getSheetByName("運用メモ");
  if (!memoSheet) {
    memoSheet = ss.insertSheet("運用メモ");
  }

  memoSheet.clearContents();

  const memoData = [
    ["AI活用診断 マスター管理シート", "", ""],
    ["", "", ""],
    ["【このシートの役割】", "", ""],
    ["このスプレッドシートはAI活用診断アプリのマスターデータベースです。", "", ""],
    ["企業を新規登録すると「companies」タブに1行追加されます。", "", ""],
    ["各企業の診断データは、別途作成される企業専用スプレッドシートに保存されます。", "", ""],
    ["", "", ""],
    ["【companiesタブの列説明】", "", ""],
    ["列名", "内容", "備考"],
    ["id", "企業の一意ID（タイムスタンプ）", "自動生成"],
    ["name", "企業名", "管理者が入力"],
    ["industry", "業種", "管理者が入力"],
    ["employeeCount", "従業員数", "管理者が入力"],
    ["code", "6桁アクセスコード", "自動生成（紛らわしい文字除外）"],
    ["createdAt", "登録日時", "ISO 8601形式"],
    ["sheetId", "企業専用SpreadsheetのID", "自動生成"],
    ["sheetUrl", "企業専用SpreadsheetのURL", "自動生成"],
    ["", "", ""],
    ["【企業専用スプレッドシートのタブ構成】", "", ""],
    ["タブ名", "内容", ""],
    ["企業マスター", "企業属性情報（設立年代・年商・IT投資姿勢等）", ""],
    ["回答データ", "全回答の生データ（JSONを含む）", ""],
    ["業務実態スコア", "業務フロー分析の数値化スコア", ""],
    ["AIリテラシー", "4Dフレームワークスコア（Delegation/Description/Discernment/Diligence）", ""],
    ["AI活用レベル", "AI利用レベル診断スコア", ""],
    ["集計サマリー", "組織全体の集計結果", ""],
    ["", "", ""],
    ["【環境変数設定値】", "", ""],
    ["変数名", "値", "設定場所"],
    ["GOOGLE_SPREADSHEET_MASTER_ID", "このスプレッドシートのID（URLから取得）", ".env.local / Vercel環境変数"],
    ["GOOGLE_SERVICE_ACCOUNT_EMAIL", "サービスアカウントのメールアドレス", ".env.local / Vercel環境変数"],
    ["GOOGLE_PRIVATE_KEY", "サービスアカウントの秘密鍵", ".env.local / Vercel環境変数"],
    ["ANTHROPIC_API_KEY", "Claude APIキー", ".env.local / Vercel環境変数"],
    ["ADMIN_PIN", "管理者ログインPIN（デフォルト：2026）", ".env.local / Vercel環境変数"],
  ];

  memoSheet.getRange(1, 1, memoData.length, 3).setValues(memoData);

  // メモシートのスタイル
  memoSheet.getRange("A1").setFontSize(16).setFontWeight("bold").setFontColor("#1A2A3E");
  memoSheet.getRange("A3").setFontWeight("bold").setBackground("#E8F2FA");
  memoSheet.getRange("A8").setFontWeight("bold").setBackground("#E8F2FA");
  memoSheet.getRange("A9:C9").setFontWeight("bold").setBackground("#6AA3D8").setFontColor("#FFFFFF");
  memoSheet.getRange("A19").setFontWeight("bold").setBackground("#E8F2FA");
  memoSheet.getRange("A20:B20").setFontWeight("bold").setBackground("#6AA3D8").setFontColor("#FFFFFF");
  memoSheet.getRange("A28").setFontWeight("bold").setBackground("#E8F2FA");
  memoSheet.getRange("A29:C29").setFontWeight("bold").setBackground("#6AA3D8").setFontColor("#FFFFFF");

  memoSheet.setColumnWidth(1, 260);
  memoSheet.setColumnWidth(2, 420);
  memoSheet.setColumnWidth(3, 200);

  // ========================================
  // スプレッドシートIDを表示
  // ========================================
  const spreadsheetId = ss.getId();
  const spreadsheetUrl = ss.getUrl();

  // 完了メッセージ
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    "✅ 初期設定完了",
    `マスタースプレッドシートの設定が完了しました。\n\n` +
    `【.env.local に設定してください】\n\n` +
    `GOOGLE_SPREADSHEET_MASTER_ID=\n${spreadsheetId}\n\n` +
    `スプレッドシートURL：\n${spreadsheetUrl}\n\n` +
    `次のステップ：\nこのシートにサービスアカウントの編集権限を付与してください。`,
    ui.ButtonSet.OK
  );

  console.log("=== セットアップ完了 ===");
  console.log("GOOGLE_SPREADSHEET_MASTER_ID=" + spreadsheetId);
  console.log("URL: " + spreadsheetUrl);
}


/**
 * サンプルデータ投入（動作確認用）
 * 本番運用前のテスト時のみ使用
 */
function insertSampleData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("companies");
  if (!sheet) {
    SpreadsheetApp.getUi().alert("「companies」タブが見つかりません。先に setupMasterSpreadsheet() を実行してください。");
    return;
  }

  const sampleRows = [
    [
      "1700000000001",
      "サンプル株式会社",
      "IT・情報通信",
      "50名",
      "SAMPLE",
      new Date().toISOString(),
      "",
      ""
    ]
  ];

  sheet.getRange(2, 1, sampleRows.length, 8).setValues(sampleRows);

  SpreadsheetApp.getUi().alert("サンプルデータを1件追加しました。\nアクセスコード：SAMPLE");
}


/**
 * companiesタブのデータを整形表示（確認用）
 */
function showCompanyList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("companies");
  if (!sheet) {
    SpreadsheetApp.getUi().alert("「companies」タブが見つかりません。");
    return;
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert("登録企業がありません。");
    return;
  }

  let message = `登録企業数：${data.length - 1}社\n\n`;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      message += `[${i}] ${row[1]}（コード：${row[4]}）\n`;
    }
  }

  SpreadsheetApp.getUi().alert("企業一覧", message, SpreadsheetApp.getUi().ButtonSet.OK);
}
