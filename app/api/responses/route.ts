import { NextRequest, NextResponse } from "next/server";
import { gasPost } from "@/lib/gas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await gasPost({ action: "saveResponse", ...body });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error saving response:", error);
    return NextResponse.json({ error: "保存に失敗" }, { status: 500 });
  }
}
