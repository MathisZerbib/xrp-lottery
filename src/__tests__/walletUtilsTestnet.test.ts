import { generateMnemonic, recoverWalletFromMnemonic, RecoveredWallet } from '../utils/walletUtils';
import { Wallet } from 'xrpl';

interface MnemonicWallet {
    wallet: Wallet;
    mnemonic: string;
    address: string;
}

interface FaucetResponse {
    account: {
        xAddress: string;
        address: string;
        classicAddress: string;
    };
    amount: number;
    transactionHash: string;
}

const NETWORK = process.env.NETWORK || 'testnet'; // Default to testnet

const getFaucetUrl = () => {
    if (NETWORK === 'mainnet') {
        throw new Error('Faucet is not available for Mainnet');
    }
    return 'https://faucet.altnet.rippletest.net/accounts';
};

async function faucet(destination: string): Promise<FaucetResponse> {
    try {
        const response = await fetch(getFaucetUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destination }),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        console.log(`Faucet response: ${JSON.stringify(data)}`);
        return data;
    } catch (error) {
        console.error('Faucet error:', error);
        throw error;
    }
}

async function waitForWalletFunding(network: string, address: string, mnemonic: string, retries = 10, delayMs = 10000): Promise<RecoveredWallet> {
    for (let i = 0; i < retries; i++) {
        const recoveredWallet = await recoverWalletFromMnemonic(network, mnemonic);
        if (recoveredWallet.balance > 0) return recoveredWallet;
        console.log(`Retry ${i + 1}/${retries}: Wallet balance for ${address} is ${recoveredWallet.balance} XRP`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    throw new Error('Wallet is not funded after multiple retries.');
}

describe('Wallet Utils', () => {
    let mnemonicWallet: MnemonicWallet;
    let fundedWallet: RecoveredWallet | undefined;
    let faucetResponse: FaucetResponse;

    beforeAll(async () => {
        const mnemonic = generateMnemonic();
        const wallet = Wallet.fromMnemonic(mnemonic);
        mnemonicWallet = { wallet, mnemonic, address: wallet.address };
        console.log('Generated Wallet Address:', mnemonicWallet.address);

        if (NETWORK === 'testnet') {
            // Fund the wallet using the Testnet Faucet
            console.log('Requesting funds...');
            faucetResponse = await faucet(mnemonicWallet.address);
            fundedWallet = await waitForWalletFunding(NETWORK, faucetResponse.account.address, mnemonicWallet.mnemonic);
            console.log(`Wallet funded: ${fundedWallet.balance} XRP at address ${faucetResponse.account.address}`);
        } else {
            // For Mainnet, we assume the wallet is already funded
            fundedWallet = await recoverWalletFromMnemonic(NETWORK, mnemonicWallet.mnemonic);
        }
    }, 120000); // Extended timeout for funding process

    it('should create a wallet with its seed phrase', () => {
        const mnemonicWords = mnemonicWallet.mnemonic.split(' ');
        expect(mnemonicWords.length).toBe(12);
        expect(mnemonicWallet.wallet.address).toBe(mnemonicWallet.address);
    });

    it('should check the funds in the wallet', () => {
        if (!fundedWallet) throw new Error('Wallet not funded.');
        console.log(`Funded Wallet Balance: ${fundedWallet.balance} XRP at address ${faucetResponse?.account.address || mnemonicWallet.address}`);
        expect(fundedWallet.balance).toBeGreaterThan(0);
    });

    it('should verify the seed phrase is correct when connecting to the wallet', () => {
        const recoveredWallet = Wallet.fromMnemonic(mnemonicWallet.mnemonic);
        expect(recoveredWallet.address).toBe(mnemonicWallet.address);
    });

    it('should display the address, amount, and seed phrase', () => {
        if (!fundedWallet) throw new Error('Wallet not funded.');
        console.log(`Address: ${fundedWallet.address}`);
        console.log(`Balance: ${fundedWallet.balance} XRP`);
        console.log(`Seed Phrase: ${mnemonicWallet.mnemonic}`);
    });
});