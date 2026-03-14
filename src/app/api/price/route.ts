import { NextRequest, NextResponse } from "next/server";

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  STRK: "starknet",
};

// Simple in-memory cache to avoid rate limits
let priceCache: Record<string, { price: number; timestamp: number }> = {};
const CACHE_TTL = 10000; // 10 seconds

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || "BTC";
  const coinId = COINGECKO_IDS[token.toUpperCase()];

  if (!coinId) {
    return NextResponse.json({ error: "Unknown token" }, { status: 400 });
  }

  // Check cache
  const cached = priceCache[coinId];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ price: cached.price, timestamp: cached.timestamp });
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { next: { revalidate: 10 } }
    );
    const data = await res.json();
    const price = data[coinId]?.usd;

    if (price) {
      priceCache[coinId] = { price, timestamp: Date.now() };
      return NextResponse.json({ price, timestamp: Date.now() });
    }

    // Fallback: return a mock price for demo purposes
    const mockPrices: Record<string, number> = {
      bitcoin: 67500 + (Math.random() - 0.5) * 200,
      ethereum: 3500 + (Math.random() - 0.5) * 50,
      starknet: 1.2 + (Math.random() - 0.5) * 0.05,
    };

    return NextResponse.json({ price: mockPrices[coinId], timestamp: Date.now() });
  } catch {
    // Fallback mock prices
    const mockPrices: Record<string, number> = {
      bitcoin: 67500 + (Math.random() - 0.5) * 200,
      ethereum: 3500 + (Math.random() - 0.5) * 50,
      starknet: 1.2 + (Math.random() - 0.5) * 0.05,
    };

    return NextResponse.json({ price: mockPrices[coinId] || 0, timestamp: Date.now() });
  }
}
