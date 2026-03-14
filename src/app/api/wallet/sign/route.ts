import { NextRequest, NextResponse } from "next/server";

const PRIVY_API = "https://auth.privy.io/api/v1";

function privyHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "privy-app-id": process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
    "Authorization": `Basic ${Buffer.from(
      `${process.env.NEXT_PUBLIC_PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`
    ).toString("base64")}`,
  };
}

// Starkzap PrivySigner sends: POST { walletId, hash }
// We call Privy's rawSign and return: { signature: "0x<r><s>" }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletId, hash } = body;

    if (!walletId || !hash) {
      return NextResponse.json({ error: "Missing walletId or hash" }, { status: 400 });
    }

    console.log("[wallet/sign] Signing hash:", hash, "with wallet:", walletId);

    const res = await fetch(`${PRIVY_API}/wallets/${walletId}/rpc`, {
      method: "POST",
      headers: privyHeaders(),
      body: JSON.stringify({
        method: "raw_sign",
        params: { hash },
      }),
    });

    const data = await res.json();
    console.log("[wallet/sign] Privy response:", JSON.stringify(data));

    if (!res.ok) {
      console.error("[wallet/sign] Privy error:", JSON.stringify(data));
      return NextResponse.json({ error: "Signing failed", details: data }, { status: res.status });
    }

    // Privy returns { data: { signature: "0x..." } } or { signature: "0x..." }
    const signature = data.data?.signature || data.signature;

    if (!signature) {
      console.error("[wallet/sign] No signature in response:", JSON.stringify(data));
      return NextResponse.json({ error: "No signature returned" }, { status: 500 });
    }

    return NextResponse.json({ signature });
  } catch (err) {
    console.error("[wallet/sign] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
