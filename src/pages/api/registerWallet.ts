// pages/api/registerWallet.ts
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { Wallet } from 'xrpl';

const WALLETS_FILE = path.join(process.cwd(), 'data', 'wallets.json');

async function ensureDirectoryExists() {
    const dir = path.dirname(WALLETS_FILE);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

async function readWallets() {
    try {
        const data = await fs.readFile(WALLETS_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function writeWallets(wallets: Wallet[]) {
    await ensureDirectoryExists();
    await fs.writeFile(
        WALLETS_FILE,
        JSON.stringify(wallets, null, 2),
        'utf8'
    );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === 'POST') {
            const { mnemonic, address, balance } = req.body;

            // Read existing wallets
            const wallets = await readWallets();

            // Add new wallet
            wallets.push({
                mnemonic,
                address,
                balance,
                timestamp: new Date().toISOString()
            });

            // Write updated data
            await writeWallets(wallets);

            res.status(200).json({ message: 'Wallet registered successfully' });

        } else if (req.method === 'GET') {
            const wallets = await readWallets();
            res.status(200).json(wallets);

        } else {
            res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        });
    }
}