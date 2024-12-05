import { NextResponse } from 'next/server'
import { Client, Wallet, xrpToDrops } from 'xrpl'

export async function POST(request: Request) {
    const { seedPhrase, recipientAddress, network } = await request.json()

    if (!seedPhrase || !recipientAddress) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const clientUrl = network === 'mainnet' ? 'wss://s1.ripple.com' : 'wss://s.altnet.rippletest.net:51233'
    const client = new Client(clientUrl)

    try {
        await client.connect()

        const wallet = Wallet.fromMnemonic(seedPhrase)
        const accountInfo = await client.request({
            command: 'account_info',
            account: wallet.address,
            ledger_index: 'validated',
        })

        const balance = Number(accountInfo.result.account_data.Balance) / 1000000 // Convert drops to XRP
        const transferAmount = balance * 0.98 // 98% of the balance

        const prepared = await client.autofill({
            TransactionType: 'Payment',
            Account: wallet.address,
            Amount: xrpToDrops(transferAmount.toFixed(6)), // Convert XRP to drops, round to 6 decimal places
            Destination: recipientAddress,
        })

        const signed = wallet.sign(prepared)
        const result = await client.submitAndWait(signed.tx_blob)

        await client.disconnect()

        if (result.result.validated == true) {
            return NextResponse.json({
                success: true,
                message: `Successfully transferred ${transferAmount.toFixed(6)} XRP to ${recipientAddress}`,
                newBalance: (balance - transferAmount).toFixed(6),
            })
        } else {
            return NextResponse.json({ error: 'Transaction failed', details: result.result.meta }, { status: 500 })
        }
    } catch (error) {
        await client.disconnect()
        return NextResponse.json({ error: 'An error occurred', details: error }, { status: 500 })
    }
}

