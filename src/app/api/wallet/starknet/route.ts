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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const headers = privyHeaders();
    if (authHeader) {
      headers["privy-authorization-token"] = authHeader.replace("Bearer ", "");
    }

    // Create a server wallet via Privy
    const createRes = await fetch(`${PRIVY_API}/wallets`, {
      method: "POST",
      headers,
      body: JSON.stringify({ chain_type: "ethereum" }),
    });

    const createData = await createRes.json();
    console.log("[wallet/starknet] Full Privy create response keys:", Object.keys(createData));
    console.log("[wallet/starknet] Full Privy create response:", JSON.stringify(createData));

    if (!createRes.ok) {
      return NextResponse.json({ error: createData }, { status: createRes.status });
    }

    const walletId = createData.id;

    // Try to get public key from the response or fetch wallet details
    let publicKey = createData.public_key || createData.publicKey;

    if (!publicKey) {
      // Fetch wallet details which might have the public key
      const detailRes = await fetch(`${PRIVY_API}/wallets/${walletId}`, {
        method: "GET",
        headers: privyHeaders(),
      });
      const detailData = await detailRes.json();
      console.log("[wallet/starknet] Wallet detail keys:", Object.keys(detailData));
      console.log("[wallet/starknet] Wallet detail:", JSON.stringify(detailData));
      publicKey = detailData.public_key || detailData.publicKey || detailData.verification_key;
    }

    // If still no public key, derive one by doing a test sign
    // Privy uses secp256k1 keys — we can recover the pubkey from a signature
    if (!publicKey) {
      console.log("[wallet/starknet] No public key found, attempting to get via sign...");
      const testHash = "0x0100000000000000000000000000000000000000000000000000000000000000";
      const signRes = await fetch(`${PRIVY_API}/wallets/${walletId}/rpc`, {
        method: "POST",
        headers: privyHeaders(),
        body: JSON.stringify({
          method: "personal_sign",
          params: { message: testHash },
        }),
      });
      const signData = await signRes.json();
      console.log("[wallet/starknet] Sign response:", JSON.stringify(signData));

      // Use the signature data if available
      if (signData.data?.signature) {
        publicKey = signData.data.public_key || signData.data.address;
      }
    }

    // Last resort: use the ETH address as the public key identifier
    if (!publicKey) {
      publicKey = createData.address;
      console.log("[wallet/starknet] Using address as publicKey fallback:", publicKey);
    }

    return NextResponse.json({
      walletId,
      publicKey,
      address: createData.address,
    });
  } catch (err) {
    console.error("[wallet/starknet] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
