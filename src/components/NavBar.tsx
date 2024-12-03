"use client";

// src/components/NavBar.tsx
import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface NavBarProps {
  network: string;
  toggleNetwork: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ network, toggleNetwork }) => {
  const setNetwork = (network: string) => {
    localStorage.setItem("network", network);
  };

  useEffect(() => {
    const storedNetwork = localStorage.getItem("network");
    if (storedNetwork) {
      setNetwork(storedNetwork);
    }
  }, []);

  return (
    <header className="w-full flex justify-between items-center p-4 bg-white shadow-md">
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-blue-500 hover:text-blue-700">
          Home
        </Link>
        <Link href="/import" className="text-blue-500 hover:text-blue-700">
          Import Wallet
        </Link>
      </div>
      <div className="relative">
        <Button className="relative z-10" onClick={toggleNetwork}>
          {network === "testnet" ? "Switch to Mainnet" : "Switch to Testnet"}
        </Button>
      </div>
    </header>
  );
};

export default NavBar;
