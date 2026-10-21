import { NextResponse } from "next/server";
import { aiEnabled } from "@/lib/server/ai";
import { hasDatabase } from "@/lib/server/db";
import { getUsage } from "@/lib/server/usage";

export async function GET() {
  const { userId, ...usage } = await getUsage();
  return NextResponse.json({ usage, signedIn: !!userId, ai: aiEnabled(), database: hasDatabase });
}
