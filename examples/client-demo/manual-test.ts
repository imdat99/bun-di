import { Hono } from 'hono';
import { hc } from 'hono/client';

// Attempt 1: Current structure
type Schema1 = {
    '/cats': {
        $get: {
            input: {},
            output: { json: string[] },
            outputFormat: 'json',
            status: 200
        }
    }
};
type AppType1 = Hono<any, Schema1, any>;

const client1 = hc<AppType1>('http://localhost:3000');
// Check if client1.cats.$get exists
// client1.cats.$get()

// Attempt 2: Input with valid keys but empty
type Schema2 = {
    '/cats': {
        $get: {
            input: {
                json: undefined,
                query: undefined,
                param: undefined,
                header: undefined,
                form: undefined,
                cookie: undefined,
            },
            output: { json: string[] },
            outputFormat: 'json',
            status: 200
        }
    }
};
type AppType2 = Hono<any, Schema2, any>;
const client2 = hc<AppType2>('http://localhost:3000');

// Attempt 3: Using Hono directly to infer
const app = new Hono()
    .get('/cats', (c) => c.json(['cat']));
type AppType3 = typeof app;
const client3 = hc<AppType3>('http://localhost:3000');
