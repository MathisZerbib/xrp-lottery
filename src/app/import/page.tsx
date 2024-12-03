// src/app/import/page.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Client, Wallet, xrpToDrops } from "xrpl";
import Confetti from "@/components/Confetti";
import NavBar from "@/components/NavBar";

const seedSchema = z.object({
  seedWords: z
    .string()
    .min(1, "Seed phrase is required")
    .refine(
      (value) => value.split(" ").length === 12,
      "Seed phrase must be exactly 12 words."
    ),
});

const transferSchema = z.object({
  recipient: z.string().min(1, "Recipient address is required"),
  amount: z.string().refine((value) => Number(value) > 0, {
    message: "Amount must be greater than 0",
  }),
});

const WalletImport = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [network, setNetwork] = useState("testnet");
  const [isLoading, setIsLoading] = useState(false);

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(seedSchema),
    defaultValues: { seedWords: "" },
  });

  const {
    handleSubmit: handleTransferSubmit,
    control: transferControl,
    setValue: setTransferValue,
    formState: { errors: transferErrors },
  } = useForm({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      recipient: process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS || "",
      amount: 0,
    },
  });

  const getClientUrl = (network: string) => {
    return network === "mainnet"
      ? "wss://s1.ripple.com"
      : "wss://s.altnet.rippletest.net:51233";
  };

  const fetchBalance = async (address: string) => {
    setIsLoading(true);
    const client = new Client(getClientUrl(network));
    await client.connect();
    const response = await client.request({
      command: "account_info",
      account: address,
      ledger_index: "validated",
    });
    await client.disconnect();
    setIsLoading(false);
    return Number(response.result.account_data.Balance) / 1000000; // Convert drops to XRP
  };

  const onSubmit = async (data: { seedWords: string }) => {
    setIsLoading(true);
    try {
      const mnemonic = data.seedWords.trim();
      const walletInstance = Wallet.fromMnemonic(mnemonic);
      setWallet(walletInstance);
      setError(null);

      const walletBalance = await fetchBalance(walletInstance.address);
      setBalance(walletBalance);
    } catch {
      setError("Invalid seed phrase. Please try again.");
      setWallet(null);
      setBalance(null);
    }
    setIsLoading(false);
  };

  const transferFunds = async (data: { recipient: string; amount: number }) => {
    if (!wallet) return;

    setIsLoading(true);
    const client = new Client(getClientUrl(network));
    await client.connect();

    const prepared = await client.autofill({
      TransactionType: "Payment",
      Account: wallet.address,
      Amount: xrpToDrops(data.amount.toString()), // Convert XRP to drops
      Destination: data.recipient,
    });

    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    await client.disconnect();

    if (result.result.validated) {
      setTransferSuccess(
        `Successfully transferred ${data.amount} XRP to ${data.recipient}`
      );
      const updatedBalance = await fetchBalance(wallet.address);
      setBalance(updatedBalance);
      setShowConfetti(true);
    } else {
      setError(`Failed to transfer funds: ${result.result.meta}`);
    }
    setIsLoading(false);
  };

  const toggleNetwork = () => {
    const newNetwork = network === "testnet" ? "mainnet" : "testnet";
    setNetwork(newNetwork);
    localStorage.setItem("network", newNetwork);
  };

  const setTransferAmount = (percentage: number) => {
    if (balance !== null) {
      const amount = (balance * percentage).toFixed(5);
      setTransferValue("amount", Number(amount));
    }
  };

  return (
    <div>
      <NavBar network={network} toggleNetwork={toggleNetwork} />
      <div className="max-w-md mx-auto p-4">
        {network === "testnet" && (
          <div className="w-full bg-yellow-200 text-yellow-800 text-center p-2">
            Warning: You are currently using the Testnet. All funds are for
            testing purposes only.
          </div>
        )}
        <h2 className="mb-4 text-2xl font-bold text-center text-gray-800">
          Import Wallet
        </h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <Controller
              name="seedWords"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Enter your 12-word seed phrase"
                  className="w-full"
                />
              )}
            />
            {errors.seedWords && (
              <p className="mt-1 text-sm text-red-600">
                {errors.seedWords.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full">
            {isLoading ? "Loading..." : "Import Wallet"}
          </Button>
        </form>
        {wallet && (
          <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded">
            <h3 className="text-green-800 font-bold">Wallet Imported!</h3>
            <p>
              Address: <span className="font-mono">{wallet.address}</span>
            </p>
            {balance !== null && (
              <p>
                Balance: <span className="font-mono">{balance} XRP</span>
              </p>
            )}
          </div>
        )}
        {balance !== null && (
          <div className="mt-4">
            <h3 className="mb-2 text-lg font-semibold text-center">
              Transfer Funds
            </h3>
            <form onSubmit={handleTransferSubmit(transferFunds)}>
              <div className="mb-4">
                <Controller
                  name="recipient"
                  control={transferControl}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Recipient Address"
                      className="w-full"
                    />
                  )}
                />
                {transferErrors.recipient && (
                  <p className="mt-1 text-sm text-red-600">
                    {transferErrors.recipient.message}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <Controller
                  name="amount"
                  control={transferControl}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Amount in XRP"
                      className="w-full"
                    />
                  )}
                />
                {transferErrors.amount && (
                  <p className="mt-1 text-sm text-red-600">
                    {transferErrors.amount.message}
                  </p>
                )}
              </div>
              <div className="flex justify-between mb-4 gap-2">
                <Button
                  type="button"
                  onClick={() => setTransferAmount(0.25)}
                  className="w-1/4"
                >
                  25%
                </Button>
                <Button
                  type="button"
                  onClick={() => setTransferAmount(0.5)}
                  className="w-1/4"
                >
                  50%
                </Button>
                <Button
                  type="button"
                  onClick={() => setTransferAmount(0.75)}
                  className="w-1/4"
                >
                  75%
                </Button>
                <Button
                  type="button"
                  onClick={() => setTransferAmount(0.99)}
                  className="w-1/4"
                >
                  99%
                </Button>
              </div>
              <Button type="submit" className="w-full">
                {isLoading ? "Loading..." : "Transfer Funds"}
              </Button>
            </form>
            {transferSuccess && (
              <>
                <p className="mt-4 text-sm text-green-600">{transferSuccess}</p>
                {showConfetti && <Confetti />}
              </>
            )}
          </div>
        )}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
};

export default WalletImport;
