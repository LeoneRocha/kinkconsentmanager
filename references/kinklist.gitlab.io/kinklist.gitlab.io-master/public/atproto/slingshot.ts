import { simpleFetchHandler } from '@atcute/client';
import { KittyAgent } from 'kitty-agent';

export const slingshotClient = new KittyAgent({
    handler: simpleFetchHandler({
        service: 'https://slingshot.microcosm.blue',
        fetch(input, init) {
            return fetch(input, {
                ...init,
                headers: {
                    ...init?.headers,
                    'User-Agent': 'kinklist.gitlab.io',
                },
            });
        },
    })
});
