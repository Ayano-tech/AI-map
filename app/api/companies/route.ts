import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"],
  });
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function GET() {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_MASTER_ID,
      range: "companies!A:H",
    });
    const rows = res.data.values || [];
    const companies = rows.slice(1).map(row => ({
      id: row[0], name: row[1], industry: row[2] || "", employeeCount: row[3] || "",
      code: row[4], createdAt: row[5], sheetId: row[6] || null, sheetUrl: row[7] || null,
    }));
    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json({ error: "取得に失敗" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      name, industry, employeeCount,
      foundingYearRange = "", annualRevenueRange = "", itInvestmentLevel = "",
      currentItTools = [], hasDxPerson = "", aiInitiativeStatus = "",
    } = await request.json();
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const id = Date.now().toString();
    const code = generateCode();

    const newSheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `${name}_AI活用診断` },
        sheets: [
          { properties: { title: "企業マスター" } },
          { properties: { title: "回答データ" } },
          { properties: { title: "業務実態スコア" } },
          { properties: { title: "AIリテラシー" } },
          { properties: { title: "AI活用レベル" } },
          { properties: { title: "集計サマリー" } },
        ],
      },
    });
    const sheetId = newSheet.data.spreadsheetId!;
    const sheetUrl = newSheet.data.spreadsheetUrl!;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId, range: "企業マスター!A1:L1", valueInputOption: "RAW",
      requestBody: { values: [["登録日時", "企業ID", "業種", "従業員数", "設立年代", "年商規模", "IT投資姿勢", "現在のITツール", "DX担当者", "AI導入状況", "アクセスコード", "シートURL"]] },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId, range: "企業マスター!A:L", valueInputOption: "RAW",
      requestBody: { values: [[
        new Date().toISOString(), id, industry || "", employeeCount || "",
        foundingYearRange, annualRevenueRange, itInvestmentLevel,
        Array.isArray(currentItTools) ? currentItTools.join("・") : currentItTools,
        hasDxPerson, aiInitiativeStatus, code, sheetUrl,
      ]] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId, range: "回答データ!A1:F1", valueInputOption: "RAW",
      requestBody: { values: [["回答日時", "年代", "職種", "勤続年数", "テストスコア", "回答データJSON"]] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId, range: "業務実態スコア!A1:L1", valueInputOption: "RAW",
      requestBody: { values: [["回答日時", "年代", "職種", "繰り返し業務スコア", "ツール横断数", "手動移送頻度", "コミュニケーション量", "定型メール有無", "ナレッジ到達性", "情報共有断絶度", "繁忙期残業レベル", "AI不安スコア"]] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId, range: "AIリテラシー!A1:G1", valueInputOption: "RAW",
      requestBody: { values: [["回答日時", "年代", "総合スコア", "Delegation", "Description", "Discernment", "Diligence"]] },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_MASTER_ID, range: "companies!A:H", valueInputOption: "RAW",
      requestBody: { values: [[id, name, industry || "", employeeCount || "", code, new Date().toISOString(), sheetId, sheetUrl]] },
    });

    return NextResponse.json({
      company: {
        id, name, industry, employeeCount, code, sheetId, sheetUrl,
        createdAt: new Date().toISOString(),
        foundingYearRange, annualRevenueRange, itInvestmentLevel,
        currentItTools, hasDxPerson, aiInitiativeStatus,
      },
    });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json({ error: "企業の作成に失敗" }, { status: 500 });
  }
}
