// components/Probabilities.tsx
import React from "react";

interface ProbabilitiesProps {
  stats: {
    processedCount: number;
    foundWithFunds: number;
  };
  formatProbability: (successful: number, total: number) => string;
}

const Probabilities: React.FC<ProbabilitiesProps> = ({ stats, formatProbability }) => {
  return (
    <div className="p-6 rounded-lg bg-white shadow-sm">
      <h2 className="font-bold mb-4">Probabilities</h2>
      <p title="Chance of finding a wallet with funds">
        🎯 Success rate: {formatProbability(stats.foundWithFunds, stats.processedCount)}
      </p>
      <p title="Attempts needed (statistical average)">
        🎲 Required Attempts: {Math.floor(1 / (stats.foundWithFunds / stats.processedCount)) || "∞"}
      </p>
    </div>
  );
};

export default Probabilities;