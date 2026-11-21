import { StatefulPreactOAuthClient } from "kitty-agent/oauth-preact";
import { KinklistClient } from "./client";
import { computed, signal } from "@preact/signals";

import metadata from '../client-metadata5.json' with { type: 'json' };

export const oauthClient = new StatefulPreactOAuthClient<KinklistClient>(
    {
        clientId: document.location.hostname === '127.0.0.1' || document.location.hostname === 'localhost'
            ? `http://localhost?redirect_uri=${encodeURIComponent(`http://127.0.0.1:${document.location.port}/oauth-redirect.html`)}` +
                `&scope=${encodeURIComponent(metadata.scope)}`
            : metadata.client_id,
        redirectUri: document.location.hostname === '127.0.0.1' || document.location.hostname === 'localhost'
            ? `http://127.0.0.1:${document.location.port}/oauth-redirect.html`
            : document.location.host !== 'kinklist.gitlab.io'
            ? 'https://kinklist.wisp.place/oauth-redirect.html'
            : 'https://kinklist.gitlab.io/oauth-redirect.html',
        scope: metadata.scope,
    },
    {
        computed,
        signal,
    },
    (loginState) => new KinklistClient(loginState),
);

export const user = oauthClient.user;
export const savedHandle = oauthClient.handle;
