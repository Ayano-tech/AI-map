/**
 * AI活用診断 GAS Web App
 *
 * 【デプロイ手順】
 *  1. Google Apps Script (script.google.com) で新規プロジェクト作成
 *  2. このコードを貼り付け
 *  3. MASTER_SPREADSHEET_ID を実際のIDに書き換える
 *  4. 「デプロイ」→「新しいデプロイ」
 *  5. 種類：ウェブアプリ
 *     実行ユーザー：自分（スクリプトオーナー）
 *     アクセス：全員
 *  6. デプロイ後のURLを Next.js の GAS_WEB_APP_URL 環境変数に設定
 *
 * 【isDemo列の追加（既存マスターシートのみ）】
 *  マスタースプレッドシートを開き、setup-master-sheet.gs の addIsDemoColumn() を実行する
 */

const MASTER_SPREADSHEET_ID = "1FZRtMgai9n04bCqvR8_WKxIR5_D4IhBdmYik7-r_WmU";

// ----------------------------------------
// GET: getCompanies / getResponses
// ----------------------------------------
function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === "getCompanies") {
      return handleGetCompanies();
    }
    if (action === "getResponses") {
      return handleGetResponses(e.parameter.sheetId);
    }

    return jsonRes({ error: "Unknown action" });
  } catch (err) {
    return jsonRes({ error: err.message });
  }
}

// ----------------------------------------
// POST: createCompany / deleteCompany / saveResponse
// ----------------------------------------
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === "createCompany") {
      return handleCreateCompany(data);
    }
    if (action === "deleteCompany") {
      return handleDeleteCompany(data.id);
    }
    if (action === "saveResponse") {
      return handleSaveResponse(data);
    }
    if (action === "saveReport") {
      return handleSaveReport(data);
    }

    return jsonRes({ error: "Unknown action" });
  } catch (err) {
    return jsonRes({ error: err.message });
  }
}

// ----------------------------------------
// 企業一覧取得
// ----------------------------------------
function handleGetCompanies() {
  const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
  const sheet = ss.getSheetByName("companies");
  const rows = sheet.getDataRange().getValues();

  const companies = rows.slice(1)
    .filter(row => row[0])
    .map(row => ({
      id: row[0],
      name: row[1],
      industry: row[2] || "",
      employeeCount: row[3] || "",
      code: row[4],
      createdAt: row[5],
      sheetId: row[6] || null,
      sheetUrl: row[7] || null,
      isDemo: row[8] === true || row[8] === "TRUE",
    }));

  return jsonRes({ companies });
}

// ----------------------------------------
// 企業作成
// ----------------------------------------
function handleCreateCompany(data) {
  const {
    name, industry = "", employeeCount = "",
    foundingYearRange = "", annualRevenueRange = "",
    itInvestmentLevel = "", currentItTools = [],
    hasDxPerson = "", aiInitiativeStatus = "",
    isDemo = false,
  } = data;

  const id = Date.now().toString();
  const code = generateCode();
  const now = new Date().toISOString();

  // 企業専用スプレッドシート作成
  const newSS = SpreadsheetApp.create(`${name}_AI活用診断`);
  const sheetId = newSS.getId();
  const sheetUrl = newSS.getUrl();

  // 6タブ作成
  const tabNames = ["企業マスター", "回答データ", "業務実態スコア", "AIリテラシー", "AI活用レベル", "集計サマリー"];
  const defaultSheet = newSS.getSheets()[0];
  defaultSheet.setName(tabNames[0]);
  for (let i = 1; i < tabNames.length; i++) {
    newSS.insertSheet(tabNames[i]);
  }

  // 企業マスタータブ ヘッダー
  const masterSheet = newSS.getSheetByName("企業マスター");
  masterSheet.getRange("A1:L1").setValues([[
    "登録日時","企業ID","業種","従業員数","設立年代","年商規模",
    "IT投資姿勢","現在のITツール","DX担当者","AI導入状況","アクセスコード","シートURL"
  ]]);
  masterSheet.appendRow([
    now, id, industry, employeeCount,
    foundingYearRange, annualRevenueRange, itInvestmentLevel,
    Array.isArray(currentItTools) ? currentItTools.join("・") : currentItTools,
    hasDxPerson, aiInitiativeStatus, code, sheetUrl,
  ]);

  // 回答データタブ ヘッダー
  newSS.getSheetByName("回答データ").getRange("A1:F1").setValues([[
    "回答日時","年代","職種","勤続年数","テストスコア","回答データJSON"
  ]]);

  // 業務実態スコアタブ ヘッダー
  newSS.getSheetByName("業務実態スコア").getRange("A1:L1").setValues([[
    "回答日時","年代","職種","繰り返し業務スコア","ツール横断数","手動移送頻度",
    "コミュニケーション量","定型メール有無","ナレッジ到達性","情報共有断絶度","繁忙期残業レベル","AI不安スコア"
  ]]);

  // AIリテラシータブ ヘッダー
  newSS.getSheetByName("AIリテラシー").getRange("A1:G1").setValues([[
    "回答日時","年代","総合スコア","Delegation","Description","Discernment","Diligence"
  ]]);

  // マスターシートに企業登録
  const masterSS = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
  masterSS.getSheetByName("companies").appendRow([
    id, name, industry, employeeCount, code, now, sheetId, sheetUrl, !!isDemo
  ]);

  return jsonRes({
    company: {
      id, name, industry, employeeCount, code,
      sheetId, sheetUrl, createdAt: now,
      foundingYearRange, annualRevenueRange, itInvestmentLevel,
      currentItTools, hasDxPerson, aiInitiativeStatus, isDemo: !!isDemo,
    }
  });
}

// ----------------------------------------
// 企業削除
// ----------------------------------------
function handleDeleteCompany(id) {
  const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
  const sheet = ss.getSheetByName("companies");
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      sheet.deleteRow(i + 1);
      return jsonRes({ success: true });
    }
  }
  return jsonRes({ error: "Not found" });
}

// ----------------------------------------
// 回答一覧取得
// ----------------------------------------
function handleGetResponses(sheetId) {
  if (!sheetId) return jsonRes({ responses: [] });

  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName("回答データ");
  if (!sheet) return jsonRes({ responses: [] });

  const rows = sheet.getDataRange().getValues();
  const responses = rows.slice(1)
    .filter(row => row[0])
    .map(row => {
      try { return JSON.parse(row[5]); } catch { return null; }
    })
    .filter(Boolean);

  return jsonRes({ responses });
}

// ----------------------------------------
// 回答保存
// ----------------------------------------
function handleSaveResponse(data) {
  const { companySheetId, response: r } = data;
  const ss = SpreadsheetApp.openById(companySheetId);

  // 回答データタブ
  ss.getSheetByName("回答データ").appendRow([
    r.submittedAt,
    r.basic["Q0-1"] || "",
    r.basic["Q0-2"] || "",
    r.basic["Q0-3"] || "",
    r.testScore,
    JSON.stringify(r),
  ]);

  // AIリテラシータブ
  const cs = r.chapterScores || {};
  ss.getSheetByName("AIリテラシー").appendRow([
    r.submittedAt,
    r.basic["Q0-1"] || "",
    r.testScore,
    cs["Delegation"]  ? cs["Delegation"].score  : 0,
    cs["Description"] ? cs["Description"].score : 0,
    cs["Discernment"] ? cs["Discernment"].score : 0,
    cs["Diligence"]   ? cs["Diligence"].score   : 0,
  ]);

  // 業務実態スコアタブ
  const wm = r.workflowMetrics || {};
  ss.getSheetByName("業務実態スコア").appendRow([
    r.submittedAt,
    r.basic["Q0-1"] || "",
    r.basic["Q0-2"] || "",
    wm.repetition_score    || 0,
    wm.tool_fragmentation  || 0,
    wm.manual_transfer_freq|| 0,
    wm.communication_volume|| 0,
    wm.recurring_mail_flag || 0,
    wm.knowledge_accessibility || 0,
    wm.info_sharing_gap    || 0,
    wm.peak_overload       || 0,
    wm.ai_anxiety_level    || 0,
  ]);

  return jsonRes({ success: true });
}

// ----------------------------------------
// 診断レポート保存
// ----------------------------------------
function handleSaveReport(data) {
  const { companySheetId, reportJson, generatedAt } = data;
  const ss = SpreadsheetApp.openById(companySheetId);
  const sheet = ss.getSheetByName("集計サマリー");

  // ヘッダーがなければ作成
  if (sheet.getLastRow() === 0) {
    sheet.getRange("A1:C1").setValues([["生成日時", "レポートJSON", "バージョン"]]);
  }

  sheet.appendRow([generatedAt || new Date().toISOString(), reportJson, "v1"]);
  return jsonRes({ success: true });
}

// ----------------------------------------
// ユーティリティ
// ----------------------------------------
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function jsonRes(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
