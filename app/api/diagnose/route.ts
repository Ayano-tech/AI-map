import { NextRequest, NextResponse } from "next/server";
import { generateDiagnosticReport } from "@/lib/claude";
import { gasPost } from "@/lib/gas";

export async function POST(request: NextRequest) {
  try {
    const { company, responses } = await request.json();
    if (!company || !responses || responses.length === 0) {
      return NextResponse.json({ error: "企業情報と回答データが必要です" }, { status: 400 });
    }
    const report = await generateDiagnosticReport(company, responses);

    if (company.sheetId) {
      gasPost({
        action: "saveReport",
        companySheetId: company.sheetId,
        reportJson: report,
        generatedAt: new Date().toISOString(),
      }).catch(console.error);
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Diagnosis error:", error);
    return NextResponse.json({ error: "診断レポートの生成に失敗しました" }, { status: 500 });
  }
}
