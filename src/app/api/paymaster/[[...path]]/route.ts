import { NextRequest, NextResponse } from "next/server";

const AVNU_PAYMASTER_URL = "https://sepolia.paymaster.avnu.fi";
const AVNU_API_KEY = process.env.AVNU_API_KEY!;

async function proxyToPaymaster(request: NextRequest) {
  try {
    const body = await request.text();

    const res = await fetch(AVNU_PAYMASTER_URL, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        "x-paymaster-api-key": AVNU_API_KEY,
      },
      body: body || undefined,
    });

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[paymaster] Proxy error:", err);
    return NextResponse.json({ error: "Paymaster proxy error" }, { status: 500 });
  }
}

export const GET = proxyToPaymaster;
export const POST = proxyToPaymaster;
