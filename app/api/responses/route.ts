import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function POST(request: NextRequest) {
  try {
    const { companySheetId, response: surveyResponse } = await request.json();
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: companySheetId, range: "回答データ!A:F", valueInputOption: "RAW",
      requestBody: { values: [[
        surveyResponse.submittedAt, surveyResponse.basic["Q0-1"] || "",
        surveyResponse.basic["Q0-2"] || "", surveyResponse.basic["Q0-3"] || "",
        surveyResponse.testScore, JSON.stringify(surveyResponse),
      ]] },
    });

    const cs = surveyResponse.chapterScores || {};
    await sheets.spreadsheets.values.append({
      spreadsheetId: companySheetId, range: "リテラシースコア!A:G", valueInputOption: "RAW",
      requestBody: { values: [[
        surveyResponse.submittedAt, surveyResponse.basic["Q0-1"] || "",
        surveyResponse.testScore,
        cs["Delegation"]?.score || 0, cs["Description"]?.score || 0,
        cs["Discernment"]?.score || 0, cs["Diligence"]?.score || 0,
      ]] },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving response:", error);
    return NextResponse.json({ error: "保存に失敗" }, { status: 500 });
  }
}
