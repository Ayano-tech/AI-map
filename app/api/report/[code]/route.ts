import { NextRequest, NextResponse } from "next/server";
import { gasGet } from "@/lib/gas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const data = await gasGet({ action: "getCompanies" });
    const companies: Array<Record<string, unknown>> = data.companies || [];
    const company = companies.find((c) => c.code === code);
    if (!company) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const sheetId = company.sheetId as string | null;
    let responses: unknown[] = [];
    if (sheetId) {
      const resData = await gasGet({ action: "getResponses", sheetId });
      responses = resData.responses || [];
    }
    return NextResponse.json({ company, responses });
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json({ error: "取得に失敗" }, { status: 500 });
  }
}
