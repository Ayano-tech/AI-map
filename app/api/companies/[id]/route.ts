import { NextRequest, NextResponse } from "next/server";
import { gasPost } from "@/lib/gas";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await gasPost({ action: "deleteCompany", id });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "削除に失敗" }, { status: 500 });
  }
}
