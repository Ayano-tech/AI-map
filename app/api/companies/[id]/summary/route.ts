import { NextRequest, NextResponse } from "next/server";
import { gasPost } from "@/lib/gas";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = await gasPost({ action: "saveSummary", id, ...body });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Save summary error:", error);
    return NextResponse.json({ error: "集計サマリーの保存に失敗" }, { status: 500 });
  }
}
