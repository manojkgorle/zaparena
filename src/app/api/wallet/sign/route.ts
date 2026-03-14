import { NextRequest, NextResponse } from "next/server";

const PRIVY_API = "https://auth.privy.io/api/v1";

// Signs a hash via Privy server wallets rawSign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletId, hash } = body;

    if (!walletId || !hash) {
      return NextResponse.json({ error: "Missing walletId or hash" }, { status: 400 });
    }

    const res = await fetch(`${PRIVY_API}/wallets/${walletId}/rpc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "privy-app-id": process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
        "Authorization": `Basic ${Buffer.from(
          `${process.env.NEXT_PUBLIC_PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`
        ).toString("base64")}`,
      },
      body: JSON.stringify({
        method: "personal_sign",
        params: { message: hash },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[wallet/sign] Privy API error:", JSON.stringify(data));
      return NextResponse.json({ error: data }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[wallet/sign] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
