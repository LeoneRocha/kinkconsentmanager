import type { KittyAgent } from "kitty-agent";
import { IoGitlabKinklistKinklistList, IoGitlabKinklistKinklistProfile } from "../lexicons";
import { Did } from "@atcute/lexicons";
import { slingshotClient } from "./slingshot";
import { now as tidNow } from '@atcute/tid';

export class KinklistClient {
    constructor(private readonly loginState: {
        readonly handle: string;
        readonly did: Did;
        readonly pds: string;
        readonly agent: KittyAgent;
    }) { }

    appviewAgent = this.agent.clone({
        proxy: {
            did: 'did:web:api.bsky.app',
            serviceId: '#bsky_appview'
        },
    })

    get agent(): KittyAgent {
        return this.loginState.agent;
    }

    get user() {
        return this.loginState;
    }

    async createList(list: Omit<IoGitlabKinklistKinklistList.Main, "createdAt" | "$type">) {
        const { uri, cid } = await this.agent.put({
            collection: 'io.gitlab.kinklist.kinklist.list',
            repo: this.user.did,
            rkey: tidNow(),
            record: {
                $type: 'io.gitlab.kinklist.kinklist.list',
                ...list,
                createdAt: new Date().toISOString(),
            },
        });

        return { uri, cid };
    }

    async createOrUpdateProfile(profile: Omit<IoGitlabKinklistKinklistProfile.Main, "createdAt" | "updatedAt" | "$type">) {
        const { cid, value } = await this.agent.tryGetRecord({
            collection: 'io.gitlab.kinklist.kinklist.profile',
            repo: this.user.did,
            rkey: 'self'
        });

        await this.agent.put({
            collection: 'io.gitlab.kinklist.kinklist.profile',
            repo: this.user.did,
            rkey: 'self',
            record: {
                $type: 'io.gitlab.kinklist.kinklist.profile',
                ...profile,
                createdAt: value?.createdAt ?? new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            swapRecord: cid ?? undefined,
        });
    }

    async tryGetOwnProfile() {
        return await slingshotClient.tryGetRecord({
            collection: 'io.gitlab.kinklist.kinklist.profile',
            repo: this.user.did,
            rkey: 'self'
        });
    }

    async tryGetProfile(did: Did) {
        return await slingshotClient.tryGetRecord({
            collection: 'io.gitlab.kinklist.kinklist.profile',
            repo: did,
            rkey: 'self'
        });
    }
}