import { NextRequest, NextResponse } from "next/server";
import { gasGet, gasPost } from "@/lib/gas";

export async function GET() {
  try {
    const data = await gasGet({ action: "getCompanies" });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json({ error: "取得に失敗" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await gasPost({ action: "createCompany", ...body });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json({ error: "企業の作成に失敗" }, { status: 500 });
  }
}
