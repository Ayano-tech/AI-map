import { NextRequest, NextResponse } from "next/server";
import { gasGet } from "@/lib/gas";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get("sheetId");
    if (!sheetId) return NextResponse.json({ responses: [] });

    const data = await gasGet({ action: "getResponses", sheetId });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching responses:", error);
    return NextResponse.json({ responses: [] });
  }
}
