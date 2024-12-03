// components/Statistics.tsx
import React from "react";

interface StatisticsProps {
  stats: {
    elapsedTime: number;
    processedCount: number;
    foundWithFunds: number;
  };
  walletRate: string;
  formatTime: (seconds: number) => string;
}

const Statistics: React.FC<StatisticsProps> = ({ stats, walletRate, formatTime }) => {
  return (
    <div className="p-6 rounded-lg bg-white shadow-sm">
      <h2 className="font-bold mb-4">Statistics</h2>
      <p>⏱️ Elapsed Time: {formatTime(stats.elapsedTime)}</p>
      <p>🔄 Processed Addresses: {stats.processedCount}</p>
      <p>⚡ Rate: {walletRate} wallets/sec</p>
      <p>💰 Found with Funds: {stats.foundWithFunds}</p>
    </div>
  );
};

export default Statistics;