// components/WalletDisplay.tsx
import React from "react";
import { Wallet } from "../types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

interface WalletDisplayProps {
  wallet: Wallet;
}

const WalletDisplay: React.FC<WalletDisplayProps> = ({ wallet }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatBalance = (balance: number) => {
    return balance.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  return (
    <Card
      className={`${
        wallet.balance > 0 ? "border-green-500" : "border-red-500"
      } transition-all hover:shadow-lg`}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg font-bold">
            💰 {formatBalance(wallet.balance)} XRP
          </span>
          <span className="text-sm text-gray-500">
            {new Date().toLocaleString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">🔑 Mnemonic</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(wallet.mnemonic)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all">
            {wallet.mnemonic}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">📍 Address</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(wallet.address)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all">
            {wallet.address}
          </p>
        </div>

        {wallet.balance > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <a
              href={`https://xrpscan.com/account/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              View on XRPScan →
            </a>
            <span className="text-green-500 font-medium">
              ✨ Found with funds!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletDisplay;
