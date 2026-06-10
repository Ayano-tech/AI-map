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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get("sheetId");
    if (!sheetId) return NextResponse.json({ responses: [] });

    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "回答データ!A:F",
    });

    const rows = res.data.values || [];
    const responses = rows.slice(1).map(row => {
      try { return JSON.parse(row[5] || "{}"); } catch { return null; }
    }).filter(Boolean);

    return NextResponse.json({ responses });
  } catch (error) {
    console.error("Error fetching responses:", error);
    return NextResponse.json({ responses: [] });
  }
}
