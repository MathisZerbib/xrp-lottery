// setupTests.ts
import { Client } from 'xrpl';

const client = new Client('wss://s.altnet.rippletest.net:51233');

beforeAll(async () => {
    await client.connect();
});

afterAll(async () => {
    await client.disconnect();
});

export { client };