// src/utils/walletUtils.ts
import { Client, Wallet } from 'xrpl';
import { AccountInfoRequest } from 'xrpl/dist/npm/models/methods';
import { generateMnemonic as bip39GenerateMnemonic } from 'bip39';

const NETWORK = process.env.NETWORK || 'testnet'; // Default to testnet

const getClientUrl = () => {
    if (NETWORK === 'mainnet') {
        return 'wss://s1.ripple.com';
    }
    return 'wss://s.altnet.rippletest.net:51233';
};

const client = new Client(getClientUrl());
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const generateMnemonic = (): string => {
    return bip39GenerateMnemonic();
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const checkAddressBalance = async (address: string): Promise<number> => {
    try {
        if (!client.isConnected()) {
            await client.connect();
        }

        const request: AccountInfoRequest = {
            command: 'account_info',
            account: address,
            ledger_index: 'validated'
        };

        const response = await client.request(request);
        return Number(response.result.account_data.Balance) / 1000000; // Convert drops to XRP
    } catch (error: unknown) {
        const err = error as { data?: { error?: string } };
        if (err.data?.error === 'actNotFound') {
            return 0;
        }
        throw error;
    } finally {
        if (client.isConnected()) {
            await client.disconnect();
        }
    }
};

export interface RecoveredWallet {
    mnemonic: string;
    address: string;
    balance: number;
}

export const recoverWalletFromMnemonic = async (mnemonic: string): Promise<RecoveredWallet> => {
    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            // First generate just the address from mnemonic
            const wallet = Wallet.fromMnemonic(mnemonic);

            // Check if address has funds before proceeding
            const balance = await checkAddressBalance(wallet.address);

            if (balance > 0) {
                // Only if we found funds, try to verify the seed works
                try {
                    // Verify the wallet can be recovered with this mnemonic
                    const verifiedWallet = Wallet.fromMnemonic(mnemonic);
                    if (verifiedWallet.address === wallet.address) {
                        console.info(`💰 Found wallet with ${balance} XRP`);
                        return {
                            mnemonic,
                            address: wallet.address,
                            balance
                        };
                    }
                } catch (seedError) {
                    console.error('❌ Seed verification failed:', seedError);
                    throw new Error('Seed verification failed');
                }
            }

            // No funds or seed verification failed
            return {
                mnemonic,
                address: wallet.address,
                balance: 0
            };

        } catch (error: unknown) {
            retries++;
            if (retries < MAX_RETRIES) {
                await delay(RETRY_DELAY * retries);
                continue;
            }
            throw error;
        }
    }

    throw new Error(`Failed to recover wallet after ${MAX_RETRIES} attempts`);
};