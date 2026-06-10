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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_MASTER_ID,
      range: "companies!A:H",
    });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex < 1) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_MASTER_ID,
      range: `companies!A${rowIndex + 1}:H${rowIndex + 1}`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "削除に失敗" }, { status: 500 });
  }
}
