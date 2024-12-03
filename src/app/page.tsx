// pages/index.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  generateMnemonic,
  recoverWalletFromMnemonic,
} from "../utils/walletUtils";
import WalletDisplay from "../components/WalletDisplay";
import { Button } from "@/components/ui/button";
import { Wallet } from "../types";

export default function Home() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    processedCount: 0,
    foundWithFunds: 0,
    startTime: 0,
    elapsedTime: 0,
    successfulAttempts: 0,
    totalAttempts: 0,
  });
  const processedAddresses = useRef<Set<string>>(new Set());
  const isGenerating = useRef(false);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isLoading) {
      setStats((prev) => ({ ...prev, startTime: Date.now() }));
      timerRef.current = setInterval(() => {
        setStats((prev) => ({
          ...prev,
          elapsedTime: Math.floor((Date.now() - prev.startTime) / 1000),
        }));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isLoading]);

  const formatProbability = (successful: number, total: number): string => {
    if (total === 0) return "0%";
    const probability = (successful / total) * 100;
    return probability < 0.0001 ? "< 0.0001%" : `${probability.toFixed(4)}%`;
  };

  const registerWallet = async (wallet: Wallet) => {
    try {
      const response = await fetch("/api/registerWallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wallet),
      });

      if (!response.ok) {
        throw new Error("Failed to register wallet");
      }

      console.log("💾 Wallet registered successfully");
      setStats((prev) => ({
        ...prev,
        foundWithFunds: prev.foundWithFunds + 1,
      }));
    } catch (error) {
      console.error("❌ Error registering wallet:", error);
    }
  };

  const generateWallets = async () => {
    setIsLoading(true);
    setError(null);
    isGenerating.current = true;

    while (isGenerating.current) {
      try {
        const mnemonic = generateMnemonic();
        const wallet = await recoverWalletFromMnemonic(mnemonic);

        if (processedAddresses.current.has(wallet.address)) {
          continue;
        }

        processedAddresses.current.add(wallet.address);
        setStats((prev) => ({
          ...prev,
          processedCount: prev.processedCount + 1,
          totalAttempts: prev.totalAttempts + 1,
          successfulAttempts:
            wallet.balance > 0
              ? prev.successfulAttempts + 1
              : prev.successfulAttempts,
        }));

        if (wallet.balance > 0) {
          try {
            await registerWallet(wallet);
            setWallets((prev) => [...prev, wallet]);
            setStats((prev) => ({
              ...prev,
              foundWithFunds: prev.foundWithFunds + 1,
            }));
          } catch (error) {
            console.error("Failed to register wallet:", error);
          }
          break;
        }
      } catch (err) {
        setError("Failed to generate wallet. Please try again.");
        console.error(err);
        break;
      }
    }

    setIsLoading(false);
  };

  //   const generateWallets = async () => {
  //     setIsLoading(true);
  //     setError(null);
  //     isGenerating.current = true;

  //     while (isGenerating.current) {
  //       try {
  //         const mnemonic = generateMnemonic();
  //         const wallet = await recoverWalletFromMnemonic(mnemonic);

  //         if (processedAddresses.current.has(wallet.address)) {
  //           console.log(
  //             `⚠️ Address ${wallet.address} already processed. Skipping.`
  //           );
  //           continue;
  //         }

  //         processedAddresses.current.add(wallet.address);
  //         setStats((prev) => ({
  //           ...prev,
  //           processedCount: prev.processedCount + 1,
  //           totalAttempts: prev.totalAttempts + 1,
  //           successfulAttempts:
  //             wallet.balance > 0
  //               ? prev.successfulAttempts + 1
  //               : prev.successfulAttempts,
  //         }));

  //         console.log(`
  // 🔑 Mnemonic: ${mnemonic}
  // 📍 Address: ${wallet.address}
  // 💰 Balance: ${wallet.balance} XRP`);

  //         if (wallet.balance > 0) {
  //           setWallets((prev) => [...prev, wallet]);
  //           await registerWallet(wallet);
  //           console.log("🎉 Wallet with balance found!");
  //           break;
  //         }
  //       } catch (err) {
  //         setError("Failed to generate wallet. Please try again.");
  //         console.error("❌ Error:", err);
  //         break;
  //       }
  //     }

  //     setIsLoading(false);
  //   };

  const stopGenerating = () => {
    isGenerating.current = false;
    setIsLoading(false);
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const walletRate = stats.elapsedTime
    ? (stats.processedCount / stats.elapsedTime).toFixed(2)
    : "0";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="container max-w-4xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Wallet Generator</h1>
          <div className="flex justify-center space-x-4">
            <Button onClick={generateWallets} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Wallet"}
            </Button>
            <Button onClick={stopGenerating} disabled={!isLoading}>
              Stop
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 rounded-lg bg-white shadow-sm">
            <h2 className="font-bold mb-4">Statistics</h2>
            <p>⏱️ Elapsed Time: {formatTime(stats.elapsedTime)}</p>
            <p>🔄 Processed Addresses: {stats.processedCount}</p>
            <p>⚡ Rate: {walletRate} wallets/sec</p>
            <p>💰 Found with Funds: {stats.foundWithFunds}</p>
          </div>

          <div className="p-6 rounded-lg bg-white shadow-sm">
            <h2 className="font-bold mb-4">Probabilities</h2>
            <p title="Chance of finding a wallet with funds">
              🎯 Success rate:{" "}
              {formatProbability(stats.foundWithFunds, stats.processedCount)}
            </p>
            {/* <p title="Historical probability based on blockchain data">
              📊 Expected Rate: ~0.0001%
            </p> */}
            <p title="Attempts needed (statistical average)">
              🎲 Required Attempts:{" "}
              {Math.floor(1 / (stats.foundWithFunds / stats.processedCount)) ||
                "∞"}
            </p>
            {/* <p title="Estimated time to find wallet with current rate">
              ⏳ Est. Time to Find:{" "}
              {stats.foundWithFunds
                ? formatTime(
                    Math.floor(stats.elapsedTime / stats.foundWithFunds)
                  )
                : "∞"}
            </p> */}
          </div>
        </div>

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {wallets.map((wallet, index) => (
            <WalletDisplay key={index} wallet={wallet} />
          ))}
        </div>
      </div>
    </div>
  );
}
