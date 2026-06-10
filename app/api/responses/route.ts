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
      spreadsheetId: companySheetId, range: "AIリテラシー!A:G", valueInputOption: "RAW",
      requestBody: { values: [[
        surveyResponse.submittedAt, surveyResponse.basic["Q0-1"] || "",
        surveyResponse.testScore,
        cs["Delegation"]?.score || 0, cs["Description"]?.score || 0,
        cs["Discernment"]?.score || 0, cs["Diligence"]?.score || 0,
      ]] },
    });

    const wm = surveyResponse.workflowMetrics || {};
    await sheets.spreadsheets.values.append({
      spreadsheetId: companySheetId, range: "業務実態スコア!A:L", valueInputOption: "RAW",
      requestBody: { values: [[
        surveyResponse.submittedAt,
        surveyResponse.basic["Q0-1"] || "",
        surveyResponse.basic["Q0-2"] || "",
        wm.repetition_score ?? 0,
        wm.tool_fragmentation ?? 0,
        wm.manual_transfer_freq ?? 0,
        wm.communication_volume ?? 0,
        wm.recurring_mail_flag ?? 0,
        wm.knowledge_accessibility ?? 0,
        wm.info_sharing_gap ?? 0,
        wm.peak_overload ?? 0,
        wm.ai_anxiety_level ?? 0,
      ]] },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving response:", error);
    return NextResponse.json({ error: "保存に失敗" }, { status: 500 });
  }
}
