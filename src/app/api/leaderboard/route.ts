import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/db";

export async function GET() {
  const entries = getLeaderboard();
  return NextResponse.json({ entries });
}
