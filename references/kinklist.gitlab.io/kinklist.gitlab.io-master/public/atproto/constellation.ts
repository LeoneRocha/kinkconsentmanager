import { simpleFetchHandler } from '@atcute/client';
import { ActorIdentifier, Did, Nsid, RecordKey, ResourceUri } from '@atcute/lexicons';
import { Records } from '@atcute/lexicons/ambient';
import { KittyAgent } from 'kitty-agent';

export const constellationClient = new KittyAgent({
    handler: simpleFetchHandler({
        service: 'https://constellation.microcosm.blue',
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

export async function getBacklinks({
    subject,
    source,
    did,
    limit,
    reverse,
    cursor
}: {
    subject: `at://${ActorIdentifier}/${Nsid}/${RecordKey}` | Did | string,
    source: `${(keyof Records) & Nsid}:${string}`,
    did?: Did[],
    limit?: number,
    reverse?: boolean,
    cursor?: string
}) {
    return await constellationClient.getSafe('blue.microcosm.links.getBacklinks', {
        as: 'json',
        params: {
            subject: subject as ResourceUri,
            source,
            did,
            limit,
            reverse,
            cursor
        }
    });
}

export async function getAllBacklinks({
    subject,
    source,
    did,
    limit,
    reverse
}: {
    subject: `at://${ActorIdentifier}/${Nsid}/${RecordKey}` | Did | string,
    source: `${(keyof Records) & Nsid}:${string}`,
    did?: Did[],
    limit?: number,
    reverse?: boolean
}) {
    let result = await getBacklinks({
        subject: subject as ResourceUri,
        source,
        did,
        limit: 100,
        reverse
    });

    let records = result.records;

    if (limit && records.length >= limit) {
        return { ...result, records: records.slice(0, limit) };
    }

    while (result.cursor) {
        result = await getBacklinks({
            subject,
            source,
            did,
            limit: 100,
            reverse,
            cursor: result.cursor
        });
        records.push(...result.records);
        if (limit && records.length >= limit) {
            return { ...result, records: records.slice(0, limit) };
        }
    }

    return { ...result, records };
}
