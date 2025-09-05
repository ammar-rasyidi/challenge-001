"use client";

import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const ALCHEMY_BASE = (key: string) => `https://arb-sepolia.g.alchemy.com/v2/${key}`;

interface TokenBalance {
  name: string;
  symbol: string;
  balanceRaw: string;
  decimals: number;
  formatted: string;
  usdValue: number;
  address: `0x${string}`;
  coingeckoId: string;
}

// Static list of popular Arbitrum Sepolia testnet tokens
const POPULAR_ARBITRUM_TOKENS: Partial<TokenBalance>[] = [
  {
    name: "Ethereum",
    symbol: "ETH",
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    decimals: 18,
    coingeckoId: "ethereum",
  },
  {
    name: "Chainlink",
    symbol: "LINK",
    address: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
    decimals: 18,
    coingeckoId: "chainlink",
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    decimals: 6,
    coingeckoId: "usd-coin",
  },
  {
    name: "Tether",
    symbol: "USDT",
    address: "0x93d67359a0f6f117150a70fdde6bb96782497248",
    decimals: 6,
    coingeckoId: "tether",
  },
  {
    name: "Wrapped BTC",
    symbol: "WBTC",
    address: "0x92f3b59a79bff5dc60c0d59ea13a44d082b2bdfc",
    decimals: 8,
    coingeckoId: "wrapped-bitcoin",
  },
  {
    name: "Polygon",
    symbol: "MATIC",
    address: "0x37dBD10E7994AAcF6132cac7d33bcA899bd2C660",
    decimals: 18,
    coingeckoId: "polygon",
  },
];

interface PerformanceMetrics {
  batchTime: number;
  individualTime: number;
  batchCallCount: number;
  individualCallCount: number;
}

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    setIsDarkMode(window?.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  }, []);

  useEffect(() => {
    if (!connectedAddress) {
      setTokens([]);
      setError(null);
      setPerformanceMetrics(null);
      return;
    }

    if (!ALCHEMY_API_KEY) {
      setError("Missing NEXT_PUBLIC_ALCHEMY_API_KEY - set it in your environment.");
      return;
    }

    const ctrl = new AbortController();
    let aborted = false;

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const fetchCoinGeckoPrice = async (coingeckoId: string): Promise<number> => {
      try {
        // Use simple price endpoint instead of contract lookup to avoid rate limiting
        await sleep(120); // just to add small delay so we dont hit their api rate limit

        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`, {
          signal: ctrl.signal,
        });
        if (!r.ok) return 0;
        const j = await r.json();
        return j[coingeckoId]?.usd ?? 0;
      } catch {
        return 0;
      }
    };

    const postAlchemy = async (payload: any) => {
      const url = ALCHEMY_BASE(ALCHEMY_API_KEY);
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      if (!resp.ok) throw new Error(`Alchemy returned ${resp.status}`);
      const json = await resp.json();
      return json;
    };

    const fetchTokens = async () => {
      setLoading(true);
      setError(null);
      setTokens([]);
      setPerformanceMetrics(null);

      try {
        // Performance tracking
        let batchStartTime = 0;
        let batchEndTime = 0;
        let individualStartTime = 0;
        let individualEndTime = 0;
        let batchCallCount = 0;
        let individualCallCount = 0;

        // Batch method - fetch all token balances at once
        const contracts = POPULAR_ARBITRUM_TOKENS.map(token => token.address).filter(
          (addr): addr is `0x${string}` => addr !== undefined,
        );

        let balanceResults: { contractAddress: string; tokenBalance: string }[] = [];
        let individualBalanceResults: { contractAddress: string; tokenBalance: string }[] = [];

        // Run batch method
        batchStartTime = performance.now();
        try {
          const balPayload = {
            jsonrpc: "2.0",
            id: 1,
            method: "alchemy_getTokenBalances",
            params: [connectedAddress, contracts],
          };
          batchCallCount++;
          const balResp = await postAlchemy(balPayload);
          const tokenBalances = balResp?.result?.tokenBalances ?? [];
          balanceResults = Array.isArray(tokenBalances)
            ? tokenBalances.map((b: any) => ({
                contractAddress: (b.contractAddress || b.contract || "").toLowerCase(),
                tokenBalance: b.tokenBalance ?? b.token_balance ?? b.tokenBalanceHex ?? "0",
              }))
            : [];
        } catch (err: any) {
          console.error("Batch method failed:", err);
        }
        batchEndTime = performance.now();

        // run individual method for comparison.
        individualStartTime = performance.now();
        individualBalanceResults = [];
        for (const contract of contracts) {
          if (aborted) break;
          try {
            const singleBalPayload = {
              jsonrpc: "2.0",
              id: 1,
              method: "alchemy_getTokenBalances",
              params: [connectedAddress, [contract]],
            };
            individualCallCount++;
            const r = await postAlchemy(singleBalPayload);
            const arr = r?.result?.tokenBalances ?? [];
            if (Array.isArray(arr) && arr[0]) {
              individualBalanceResults.push({
                contractAddress: arr[0].contractAddress?.toLowerCase?.() ?? contract,
                tokenBalance: arr[0].tokenBalance ?? "0",
              });
            }
          } catch (err: any) {
            console.error(`Individual call failed for ${contract}:`, err);
          }
          await sleep(120);
        }
        individualEndTime = performance.now();

        // Use batch results if available, otherwise use individual results
        const finalBalanceResults = balanceResults.length > 0 ? balanceResults : individualBalanceResults;

        // Set performance metrics
        setPerformanceMetrics({
          batchTime: batchEndTime - batchStartTime,
          individualTime: individualEndTime - individualStartTime,
          batchCallCount,
          individualCallCount,
        });

        // Process results
        const results: TokenBalance[] = [];

        for (const token of POPULAR_ARBITRUM_TOKENS) {
          if (aborted) break;

          // Find balance for this token
          const balance = finalBalanceResults.find(
            b => b.contractAddress.toLowerCase() === token.address?.toLowerCase(),
          );

          const raw = balance?.tokenBalance ?? "0";
          let rawDecimal = raw;

          try {
            if (raw.startsWith("0x") || raw.startsWith("0X")) {
              rawDecimal = BigInt(raw).toString();
            }
          } catch {
            // ignore error
          }

          // For ETH, we need to get the native balance separately
          if (token.symbol === "ETH") {
            try {
              const ethPayload = {
                jsonrpc: "2.0",
                id: 1,
                method: "eth_getBalance",
                params: [connectedAddress, "latest"],
              };
              const ethResp = await postAlchemy(ethPayload);
              rawDecimal = BigInt(ethResp.result || "0").toString();
            } catch {
              // ignore error
            }
          }

          const formatted = formatTokenAmount(rawDecimal, token.decimals || 18, 6);
          const priceUSD = await fetchCoinGeckoPrice(token.coingeckoId || "");

          results.push({
            name: token.name || "",
            symbol: token.symbol || "",
            balanceRaw: rawDecimal,
            decimals: token.decimals || 18,
            formatted,
            usdValue: Number((Number(formatted) * (priceUSD || 0)).toFixed(6)),
            address: token.address as `0x${string}`,
            coingeckoId: token.coingeckoId || "",
          });

          await sleep(150); // Rate limiting protection
        }

        setTokens(results);
        setLastUpdated(Date.now());
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("fetchTokens error:", err);
        setError(err?.message ?? "Failed to fetch tokens from Alchemy");
        setTokens([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();

    return () => {
      aborted = true;
      ctrl.abort();
    };
  }, [connectedAddress, reloadKey]);

  const totalUsd = tokens.reduce((s, t) => s + t.usdValue, 0);

  const refresh = () => {
    setReloadKey(k => k + 1);
  };

  return (
    <div className="flex items-center flex-col justify-between flex-grow pt-10">
      <div className="flex flex-col justify-center flex-grow w-full max-w-4xl">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">Arbitrum Sepolia Token Dashboard</span>
          </h1>

          <div className="flex justify-center items-center space-x-2 my-4">
            <p className={`my-2 font-medium ${!isDarkMode ? "text-[#E3066E]" : ""}`}>Connected Address:</p>
            <Address address={connectedAddress} />
          </div>

          <div className="bg-base-300 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Portfolio Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-base-100 p-4 rounded-lg">
                <h3 className="text-lg font-semibold">Total Value</h3>
                <p className="text-2xl">${formatNumber(totalUsd, 2)} USD</p>
                {lastUpdated && (
                  <p className="text-xs text-muted mt-1">Last updated: {new Date(lastUpdated).toLocaleString()}</p>
                )}
              </div>

              <div className="bg-base-100 p-4 rounded-lg">
                <h3 className="text-lg font-semibold">Actions</h3>
                <div className="flex gap-2 items-center mt-2">
                  <button
                    onClick={refresh}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  >
                    {loading ? "Refreshing..." : "Refresh Balances"}
                  </button>
                </div>

                {performanceMetrics && (
                  <div className="mt-4 p-3 bg-base-200 rounded">
                    <h4 className="font-semibold mb-2">Performance Metrics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Batch Method:</span>
                        <div>Time: {performanceMetrics.batchTime.toFixed(2)}ms</div>
                        <div>Calls: {performanceMetrics.batchCallCount}</div>
                      </div>
                      <div>
                        <span className="font-medium">Individual Method:</span>
                        <div>
                          Time:{" "}
                          {performanceMetrics.individualTime > 0
                            ? performanceMetrics.individualTime.toFixed(2) + "ms"
                            : "Not used"}
                        </div>
                        <div>Calls: {performanceMetrics.individualCallCount}</div>
                      </div>
                    </div>
                  </div>
                )}

                {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Arbitrum Sepolia Tokens</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokens.map(token => (
                <div key={token.address} className="bg-base-100 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold">
                    {token.name} ({token.symbol})
                  </h3>
                  <p className="text-xl">{formatNumber(token.formatted, 6)}</p>
                  <p className="text-sm">${formatNumber(token.usdValue, 6)} USD</p>
                  <div className="mt-2 text-xs">
                    <div>
                      Contract: <code className="break-all">{token.address}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-base-300 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Arbitrum Sepolia Testnet Faucets</h2>
            <ul className="list-disc list-inside">
              <li>
                <strong>ETH/ARB Faucet:</strong>{" "}
                <a
                  href="https://www.alchemy.com/faucets/arbitrum-sepolia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  https://www.alchemy.com/faucets/arbitrum-sepolia
                </a>
              </li>
              <li>
                <strong>LINK Faucet:</strong>{" "}
                <a
                  href="https://faucets.chain.link/arbitrum-sepolia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  https://faucets.chain.link/arbitrum-sepolia
                </a>
              </li>
              <li>
                <strong>QuickNode Faucet:</strong>{" "}
                <a
                  href="https://faucet.quicknode.com/arbitrum/sepolia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  https://faucet.quicknode.com/arbitrum/sepolia
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

function formatTokenAmount(raw: string, decimals: number, precision = 4): string {
  try {
    const n = BigInt(raw);
    if (n === BigInt(0)) return "0";
    const factor = BigInt(10) ** BigInt(decimals);
    const whole = n / factor;
    const remainder = n % factor;

    let frac = (Number(remainder) / Number(factor)).toFixed(precision).slice(2);
    if (!frac || /^0+$/.test(frac)) frac = "0".repeat(Math.max(1, precision)).slice(0, precision);
    return `${whole.toString()}.${frac}`.replace(/\.?0+$/, m => (m === "." ? ".0" : ""));
  } catch (err: any) {
    const v = Number(raw) / 10 ** decimals;
    if (isNaN(v)) return "0";
    return v.toFixed(precision);
  }
}

function formatNumber(value: string | number, maxFractionDigits = 6, minFractionDigits = 0): string {
  const n = typeof value === "string" ? Number(value.replace(/,/g, "")) : Number(value);
  if (!isFinite(n)) return String(value);
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  }).format(n);
}
