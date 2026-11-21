import { signal, computed, Signal, effect } from "@preact/signals";
import { render } from "preact";
import { useEffect, useMemo, useReducer, useState } from "preact/hooks";
import { Masonry } from "masonic";
import Tippy from "@tippyjs/react";
import { choiceOptions, choiceOptionIndices, Choice } from "./base";
import { exportImage } from "./exporter";
import { compress, decompress } from "qfs-compression";
import { createPortal } from "preact/compat";
import { defaultKinks } from "./kinks";
import { oauthClient, savedHandle, user } from "./atproto/signed-in-user";
import { Blob, Did, LegacyBlob, parseResourceUri } from "@atcute/lexicons";
import { getAllBacklinks, getBacklinks } from "./atproto/constellation";
import type { AppBskyActorProfile } from '@atcute/bluesky';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun } from "@fortawesome/free-solid-svg-icons/faSun";
import { faMoon } from "@fortawesome/free-solid-svg-icons/faMoon";
import { LocationProvider, Route, Router, useLocation, useRoute } from "preact-iso/router";
import { ErrorBoundary } from "preact-iso/lazy";
import { slingshotClient } from "./atproto/slingshot";
import { IoGitlabKinklistKinklistList } from "./lexicons";
import { Kink, KinkCategory, parseKinks, unparseKinks } from "./parser";

const root = document.querySelector("#root");

const kinkData = signal(localStorage.getItem("kink-text") ? parseKinks(localStorage.getItem("kink-text")!) : defaultKinks);

/**
 * Maps kink name -> participant -> choice (id string)
 * Entries may be undefined!
 */
const kinkSelections: Map<Kink, Map<string, Signal<Choice>>> = new Map();

function findKinkCategory(kink: Kink): KinkCategory | undefined {
    for (const category of kinkData.value.kinkCategories) {
        const index = category.kinks.indexOf(kink);
        if (index !== -1) {
            return category;
        }
    }
    return undefined;
}

interface LegendChoiceProps {
    type: string;
    typeDescription: string;
}

function LegendChoice({ type, typeDescription }: LegendChoiceProps) {
    return (
        <div class="level-item is-justify-content-flex-start">
            <button class={"choice " + type} title={typeDescription} disabled />
            <span>{typeDescription}</span>
        </div>
    );
}

function Legend() {
    return (
        <>
            {choiceOptions.map((e) => (
                <LegendChoice type={e[0]} typeDescription={e[1]} />
            ))}
        </>
    );
}

const base64Alphabet = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"]; // base64 alphabet

const toBinary = (n: number): string => n.toString(2).padStart(8, "0"); // convert num to 8-bit binary string

/**
 * https://stackoverflow.com/a/62362724
 */
function bytesArrToBase64(arr: number[] | Uint8Array): string {
    // @ts-expect-error
    if (Uint8Array.prototype.toBase64) {
        return Uint8Array.from(arr).toBase64();
    }

    const l = arr.length;
    let result = "";

    for (let i = 0; i <= (l - 1) / 3; i++) {
        const c1 = i * 3 + 1 >= l; // case when "=" is on end
        const c2 = i * 3 + 2 >= l; // case when "=" is on end
        const chunk = toBinary(arr[3 * i]) + toBinary(c1 ? 0 : arr[3 * i + 1]) + toBinary(c2 ? 0 : arr[3 * i + 2]);
        const r = chunk
            .match(/.{1,6}/g)!
            .map((x, j) => (j == 3 && c2 ? "=" : j == 2 && c1 ? "=" : base64Alphabet[+("0b" + x)]));
        result += r.join("");
    }

    return result;
}
/**
 * https://stackoverflow.com/a/62364519
 */
function base64ToBytesArr(str: string): Uint8Array {
    if (Uint8Array.fromBase64) {
        const bytes = Uint8Array.fromBase64(str);
        return bytes;
    }

    const result = [];

    for (let i = 0; i < str.length / 4; i++) {
        const chunk = [...str.slice(4 * i, 4 * i + 4)];
        const bin = chunk.map((x) => base64Alphabet.indexOf(x).toString(2).padStart(6, "0")).join("");
        const bytes = bin.match(/.{1,8}/g)!.map((x) => +("0b" + x));
        result.push(...bytes.slice(0, 3 - (str[4 * i + 2] == "=" ? 1 : 0) - (str[4 * i + 3] == "=" ? 1 : 0)));
    }
    return new Uint8Array(result);
}

function getSelectedKinkOrDefault(kink: Kink, participant: string): Signal<Choice> {
    let theKink = kinkSelections.get(kink);
    if (!theKink) kinkSelections.set(kink, theKink = new Map());
    let theSignal = theKink.get(participant);
    if (!theSignal) theKink.set(participant, theSignal = signal(Choice.NotEntered));
    return theSignal;
}

function setKinkSelection(kink: Kink, participant: string, toChoiceId: Choice, updateHash = true) {
    getSelectedKinkOrDefault(kink, participant).value = toChoiceId;

    if (updateHash) {
        window.location.hash = serializeChoices();
    }
}

/**
 * 4-bit padding reference
 */
const PADDING_MARKER = 0xf;
function serializeChoices(): string {
    const bytes: number[] = [];

    let i = -1;
    function pushNumber(num: number) {
        if (i !== -1) {
            i |= num << 4;
            bytes.push(i);
            i = -1;
        } else {
            i = num;
        }
    }

    for (const kink of kinkData.value.kinksById) {
        const category = findKinkCategory(kink);
        if (category) {
            for (const participant of category.participants) {
                pushNumber(choiceOptionIndices[getSelectedKinkOrDefault(kink, participant).value]);
            }
        }
    }

    if (i !== -1) {
        pushNumber(PADDING_MARKER);
    }

    // return bytesArrToBase64(bytes);

    return "!" + bytesArrToBase64(compress(new Uint8Array(bytes)));
}

function deserializeChoices(base64: string) {
    const bytes = base64.startsWith("!") ? decompress(base64ToBytesArr(base64.slice(1))) : base64ToBytesArr(base64);

    let isUpperHalf = false;
    let index = 0;
    for (const kink of kinkData.value.kinksById) {
        const category = findKinkCategory(kink);
        if (!category) {
            continue;
        }

        for (const participant of category.participants) {
            const byte = bytes[index];
            let choice;
            if (isUpperHalf) {
                choice = (byte >> 4) & 0xf;

                if (choice === PADDING_MARKER) {
                    console.warn("Reached the end of data early.");
                    break;
                }

                isUpperHalf = false;
                index++;
            } else {
                choice = byte & 0xf;

                isUpperHalf = true;
            }

            const choiceId = choiceOptions[choice][0];
            // console.log('Setting kink selection for', kink.name, participant, 'to', choiceId);
            setKinkSelection(kink, participant, choiceId, false);
        }
    }

    window.location.hash = serializeChoices();
}

interface KinkChoiceButtonProps {
    kink: Kink;
    participant: string;
    choiceId: Choice;
    choiceDescription: string;
}

function KinkChoiceButton({ kink, participant, choiceId, choiceDescription }: KinkChoiceButtonProps) {
    const selected = computed(() => getSelectedKinkOrDefault(kink, participant).value === choiceId);

    return (
        <div class="column">
            <button
                class={`choice ${choiceId}${selected.value ? " selected" : ""}`}
                title={choiceDescription}
                onClick={() => {
                    setKinkSelection(kink, participant, choiceId);
                }}
            />
        </div>
    );
}

function TheKink({ kinkCategory, kink }: { kinkCategory: KinkCategory; kink: Kink }) {
    return (
        <tr class="kinks-row">
            {kinkCategory.participants.map((participant) => (
                <td data-choice-type={participant}>
                    <div class="choices choice-general">
                        <div class="columns is-mobile is-gapless">
                            {choiceOptions.map(([id, name]) => (
                                <KinkChoiceButton
                                    key={kink + "_" + participant + "_" + id}
                                    kink={kink}
                                    participant={participant}
                                    choiceId={id}
                                    choiceDescription={name}
                                />
                            ))}
                        </div>
                    </div>
                </td>
            ))}
            <td>
                {kink.description != null ? (
                    <Tippy content={kink.description}>
                        <span class="has-description" aria-description={kink.description}>
                            {kink.name}
                        </span>
                    </Tippy>
                ) : (
                    <span>{kink.name}</span>
                )}
            </td>
        </tr>
    );
}

interface TheKinkCategoryProps {
    kinkCategory: KinkCategory;
}

function TheKinkCategory({ kinkCategory }: TheKinkCategoryProps) {
    return (
        <div class="masonry-inner" data-num-participants={String(kinkCategory.participants.length)}>
            <h1 class="subtitle kinks-subtitle">
                {kinkCategory.name}
                {kinkCategory.description != null && (
                    <>
                        {" "}
                        <Tippy content={kinkCategory.description}>
                            <span class="has-subtitle-description" aria-description={kinkCategory.description}>
                                (?)
                            </span>
                        </Tippy>
                    </>
                )}
            </h1>
            <table class="table kinks-table is-striped is-narrow is-hoverable">
                <thead>
                    {kinkCategory.participants.map((participant) => (
                        <th class="kinks-header">{participant}</th>
                    ))}
                </thead>
                <tbody>
                    {kinkCategory.kinks.map((kink) => (
                        <TheKink kinkCategory={kinkCategory} kink={kink} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

interface MasonryItemProps {
    index: number;
    data: KinkCategory;
    width: number;
}

function MasonryItem({ index, data: kinkCategory, width }: MasonryItemProps) {
    return <TheKinkCategory kinkCategory={kinkCategory} />;
}

function getBlobCid(blob?: Blob | LegacyBlob) {
    if (!blob) return undefined;

    if ('cid' in blob) {
        return blob.cid;
    } else {
        return blob.ref.$link;
    }
}

function KinksSection({
    creatorDid,
    creatorProfile,
    createdOn
}: {
    creatorDid: Did | undefined;
    creatorProfile: AppBskyActorProfile.Main | undefined;
    createdOn: Date | undefined;
}) {
    return (
        <>
            {creatorProfile && creatorDid && <div class="card">
                <div class="card-content">
                    <div class="media">
                        <div class="media-left">
                            <figure class="image is-64x64">
                                <img
                                    src={`https://cdn.bsky.app/img/avatar/plain/${creatorDid}/${getBlobCid(creatorProfile?.avatar)}@jpeg`}
                                    alt="Placeholder image"
                                />
                            </figure>
                        </div>
                        <div class="media-content">
                            <p class="title is-4">List by {creatorProfile.displayName}</p>
                            <p class="subtitle is-6">Created on {createdOn?.toLocaleString('en-US')}</p>
                        </div>
                    </div>
                </div>
            </div>}
            <Masonry
                key={kinkData.value.kinkCategories} // this dogshit component breaks if you don't do this
                items={kinkData.value.kinkCategories}
                render={MasonryItem}
                columnWidth={460}
                maxColumnCount={8}
                overscanBy={10}
            />
        </>
    );
}

function Modal({
    children,
    open,
    onClose,
    container,
    zIndex,
}: {
    children: import("preact").ComponentChildren;
    open: boolean;
    onClose: () => void;
    container: HTMLElement;
    zIndex?: number;
}) {
    if (!container) return null;

    return createPortal(
        <div class={`modal${open ? " is-active" : ""}`} style={zIndex ? { zIndex: zIndex } : undefined}>
            <div class="modal-background" />
            <div class="modal-content">{children}</div>
            <button class="modal-close is-large" aria-label="close" onClick={onClose} />
        </div>,
        container,
    );
}

const changelog = [
    {
        version: "19 - September 10th 2026",
        changes: ["Improved cis/trans naming in Grouping section"]
    },
    {
        version: "18 - February 19th 2026",
        changes: ["Added customized list sharing"]
    },
    {
        version: "17 - February 18th 2026",
        changes: ["Add Customize List", "Add friends section", "Reorganize navbar"],
    },
    {
        version: "16 - February 16th 2026",
        changes: ["Add Quiz Mode"],
    },
    {
        version: "15 - February 15th 2026",
        changes: ["Add ATProto support"],
    },
    {
        version: "14 - February 13th 2026",
        changes: ["Use Preact for rendering", "Upgrade to Bulma 1.0.4", "Port to TypeScript"],
    },
    {
        version: "13 - November 14th 2022",
        changes: [
            "Remove Futanari options in favor of an easier to understand selection of sexual characteristics irrespective of gender",
            'Changed title of "Fantasy / Non-con" to "Fantasy / Con-non-con"',
            'Changed "without breath control" to "w/o breath control" so it fits in the margin',
            'Added "Clone / selfcest"',
        ],
    },
    { version: "12 - September 17th 2021", changes: ["Improve mobile layout"] },
    {
        version: "11 - June 17th 2021",
        changes: [
            "Properly handle fail scenario in exporter when clipboard access permission is not given",
            'Rename "Fantasy / Consensual non-con" back to "Fantasy / Non-con" because it didn\'t fit in the image (oops)',
        ],
    },
    {
        version: "10 - June 15th 2021",
        changes: [
            'Rename "Fantasy / Non-con" category to "Fantasy / Consensual non-con"',
            "Change choice button border color in dark theme to white, thanks to anonymous contributor for this fix",
        ],
    },
    {
        version: "9 - June 15th 2021",
        changes: [
            "Add Macrophilia, Microphilia, Detachable body parts, Oviposition, Rope bondage, Suspension bondage, Cages, Gaping, Fear play and Water bondage (both types) to the list",
            "Added a distinction between Futanari/Transfeminine and Futanari/Hermaphrodite",
            "Removed Hate sex from the list",
            "Added support for descriptions, and added descriptions to most of the kinks (and some categories)",
            "Add light/dark theme detection and toggle",
            "Add Self/Partner to Bodies category",
            "Rename Interactions to Interactions & Groupings",
            "Moved fantasy roleplay scenarios to a new Fantasy / Interactions category",
            "Add website logo and Twitter/Discord embed code",
            "Add this changelog",
        ],
    },
    {
        version: "8 - April 27th 2021",
        changes: ["Align legend to the left on mobile devices, thanks to anonymous contributor for this fix"],
    },
    { version: "7 - November 9th 2020", changes: ["Add Scat to the list"] },
    {
        version: "6 - October 9th 2020",
        changes: ["Rewrite the entire list, using Bulma, in order to completely eliminate scrolling issues"],
    },
    {
        version: "5 - September 21th 2020",
        changes: ["Add Clown, Hate sex and Choking to list", 'Remove "Handholding" meme entry from list'],
    },
    {
        version: "4 - August 17th 2020",
        changes: ["Add Zettai ryoiki, Gas masks, Hypnoplay, Droneplay and Kitsunemimi to list"],
    },
    {
        version: "3 - August 9th 2020",
        changes: ["Add Beard, Hairy body, Shaven body, Bimbofication, Excessive cum and Gas to list"],
    },
    {
        version: "2 - July 11th 2020",
        changes: [
            "Many internal changes",
            "Fix issues with hotkeys",
            'Add "Autosave" checkbox, as an attempt to stop scrolling issues in Android Chrome webview',
        ],
    },
    { version: "1 - July 10th 2020", changes: ["Initial GitLab release"] },
];

function getKinkAndParticipantByIndex(index: number): { category: KinkCategory, kink: Kink, participant: string } | undefined {
    for (const category of kinkData.value.kinkCategories) {
        for (const participant of category.participants) {
            for (const kink of category.kinks) {
                if (index === 0) {
                    return { category, kink, participant };
                }
                index--;
            }
        }
    }
    return undefined;
}

function maxKinkIndex() {
    let max = 0;
    for (const category of kinkData.value.kinkCategories) {
        for (const participant of category.participants) {
            for (const kink of category.kinks) {
                max++;
            }
        }
    }
    return max;
}

function QuizMode() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const maxIndex = useMemo(() => maxKinkIndex(), []);

    function wrap(index: number) {
        return (index + maxIndex) % maxIndex;
    }

    const currentKink = useMemo(() => getKinkAndParticipantByIndex(currentIndex), [currentIndex]);

    const indexMinus1 = useMemo(() => wrap(currentIndex - 1), [currentIndex]);
    const indexMinus2 = useMemo(() => wrap(currentIndex - 2), [currentIndex]);
    const indexMinus3 = useMemo(() => wrap(currentIndex - 3), [currentIndex]);
    const indexPlus1 = useMemo(() => wrap(currentIndex + 1), [currentIndex]);
    const indexPlus2 = useMemo(() => wrap(currentIndex + 2), [currentIndex]);
    const indexPlus3 = useMemo(() => wrap(currentIndex + 3), [currentIndex]);

    const kinkMinus1 = useMemo(() => getKinkAndParticipantByIndex(indexMinus1), [indexMinus1]);
    const kinkMinus2 = useMemo(() => getKinkAndParticipantByIndex(indexMinus2), [indexMinus2]);
    const kinkMinus3 = useMemo(() => getKinkAndParticipantByIndex(indexMinus3), [indexMinus3]);
    const kinkPlus1 = useMemo(() => getKinkAndParticipantByIndex(indexPlus1), [indexPlus1]);
    const kinkPlus2 = useMemo(() => getKinkAndParticipantByIndex(indexPlus2), [indexPlus2]);
    const kinkPlus3 = useMemo(() => getKinkAndParticipantByIndex(indexPlus3), [indexPlus3]);

    function getChoice({ category, kink, participant }: { category: KinkCategory, kink: Kink, participant: string }) {
        return getSelectedKinkOrDefault(kink, participant).value;
    }

    function advance(amount: number) {
        setCurrentIndex(wrap(currentIndex + amount));
    }

    function selectAndAdvance(choice: Choice) {
        setKinkSelection(currentKink!.kink, currentKink!.participant, choice);
        advance(1);
    }

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.altKey || e.shiftKey || e.ctrlKey) return;

            if (e.key === 'ArrowUp') {
                advance(-1);
                e.preventDefault();
                e.stopPropagation();
            }
            if (e.key === 'ArrowDown') {
                advance(1);
                e.preventDefault();
                e.stopPropagation();
            }

            const btn = Number(e.key);
            if (!isNaN(btn)) {
                selectAndAdvance(choiceOptions[btn - 1][0]);
                e.preventDefault();
                e.stopPropagation();
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    });

    return (
        <div id="InputOverlay">
            <div class="widthWrapper">
                <div id="InputPrevious">
                    <div class="kink-simple" role="button" onClick={() => advance(-3)}>
                        <span class={`inline-choice ${getChoice(kinkMinus3!)}`}></span>{" "}
                        <span class="txt-category">{kinkMinus3?.category.name}</span>
                        <span class="txt-field">{kinkMinus3?.participant}</span>
                        <span class="txt-kink">{kinkMinus3?.kink.name}</span>
                    </div>
                    <div class="kink-simple" role="button" onClick={() => advance(-2)}>
                        <span class={`inline-choice ${getChoice(kinkMinus2!)}`}></span>{" "}
                        <span class="txt-category">{kinkMinus2?.category.name}</span>
                        <span class="txt-field">{kinkMinus2?.participant}</span>
                        <span class="txt-kink">{kinkMinus2?.kink.name}</span>
                    </div>
                    <div class="kink-simple" role="button" onClick={() => advance(-1)}>
                        <span class={`inline-choice ${getChoice(kinkMinus1!)}`}></span>{" "}
                        <span class="txt-category">{kinkMinus1?.category.name}</span>
                        <span class="txt-field">{kinkMinus1?.participant}</span>
                        <span class="txt-kink">{kinkMinus1?.kink.name}</span>
                    </div>
                </div>
                <div id="InputCurrent">
                    <h2 id="InputCategory">
                        {currentKink?.category.description != null ? (
                            <Tippy content={currentKink?.category.description}>
                                <span class="has-description" aria-description={currentKink?.category.description}>
                                    {currentKink?.category.name}
                                </span>
                            </Tippy>
                        ) : (
                            <span>{currentKink?.category.name}</span>
                        )}
                    </h2>
                    <h3 id="InputField"><span class="participant">{currentKink?.participant}</span>
                        {currentKink?.kink.description != null ? (
                            <Tippy content={currentKink?.kink.description}>
                                <span class="has-description" aria-description={currentKink?.kink.description}>
                                    {currentKink?.kink.name}
                                </span>
                            </Tippy>
                        ) : (
                            <span>{currentKink?.kink.name}</span>
                        )}
                    </h3>
                    <div id="InputValues">
                        <div>
                            {choiceOptions.map(([id, name, color], idx) => (
                                <div
                                    class={"big-choice" + (getChoice(currentKink!) == id ? " selected" : "")}
                                    key={id}
                                    role="button"
                                    onClick={() => selectAndAdvance(id)}>
                                    <span data-color={color} class={`inline-choice ${id}`}></span>{" "}
                                    <span class="legend-text">{name}</span>
                                    <span class="btn-num-text">{idx + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div id="InputNext">
                    <div class="kink-simple" role="button" onClick={() => advance(1)}>
                        <span class={`inline-choice ${getChoice(kinkPlus1!)}`}></span>{" "}
                        <span class="txt-category">{kinkPlus1?.category.name}</span>
                        <span class="txt-kink">{kinkPlus1?.kink.name}</span>
                    </div>
                    <div class="kink-simple" role="button" onClick={() => advance(2)}>
                        <span class={`inline-choice ${getChoice(kinkPlus2!)}`}></span>{" "}
                        <span class="txt-category">{kinkPlus2?.category.name}</span>
                        <span class="txt-kink">{kinkPlus2?.kink.name}</span>
                    </div>
                    <div class="kink-simple" role="button" onClick={() => advance(3)}>
                        <span class={`inline-choice ${getChoice(kinkPlus3!)}`}></span>{" "}
                        <span class="txt-category">{kinkPlus3?.category.name}</span>
                        <span class="txt-kink">{kinkPlus3?.kink.name}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

async function getFollowers(did: Did, limit = 1500) {
    if (!user.value) return { followers: [] };

    let { cursor, followers } = await user.value.agent.getSafe('app.bsky.graph.getFollowers', {
        as: 'json',
        params: {
            actor: did,
            limit: 100
        }
    });

    if (followers.length >= limit) {
        return { followers: followers.slice(0, limit) };
    }

    while (cursor) {
        let moreFollowers;
        ({ cursor, followers: moreFollowers } = await user.value.agent.getSafe('app.bsky.graph.getFollowers', {
            as: 'json',
            params: {
                actor: did,
                cursor,
                limit: 100
            }
        }));

        followers.push(...moreFollowers);
        if (followers.length >= limit) {
            return { followers: followers.slice(0, limit) };
        }
    }

    return { followers };
}

async function getFollows(did: Did, limit = 1500) {
    if (!user.value) return { follows: [] };

    let { cursor, follows } = await user.value.client.appviewAgent.getSafe('app.bsky.graph.getFollows', {
        as: 'json',
        params: {
            actor: did,
            limit: 100
        }
    });

    if (follows.length >= limit) {
        return { follows: follows.slice(0, limit) };
    }

    while (cursor) {
        let moreFollows;
        ({ cursor, follows: moreFollows } = await user.value.client.appviewAgent.getSafe('app.bsky.graph.getFollows', {
            as: 'json',
            params: {
                actor: did,
                cursor,
                limit: 100
            }
        }));

        follows.push(...moreFollows);
        if (follows.length >= limit) {
            return { follows: follows.slice(0, limit) };
        }
    }

    return { follows };
}

async function getProfile(actor: Did) {
    if (!user.value) return undefined;

    return await user.value.agent.getSafe('app.bsky.actor.getProfile', {
        as: 'json',
        params: {
            actor
        }
    });
}

function usePromise<T>(promise: Promise<T>): [
    state: T,
    error: undefined,
    loading: false,
] | [
    state: undefined,
    error: unknown,
    loading: true,
] | [
    state: undefined,
    error: undefined,
    loading: true,
];
function usePromise<T>(promise?: Promise<T>): [
    state: T | undefined,
    error: undefined,
    loading: false,
] | [
    state: undefined,
    error: unknown,
    loading: true,
] | [
    state: undefined,
    error: undefined,
    loading: true,
];
function usePromise<T>(promise?: Promise<T>) {
    const [state, setState] = useState<T>();
    const [error, setError] = useState<unknown>();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!promise) {
            setState(undefined);
            setError(undefined);
            return;
        }

        setLoading(true);
        promise
            .then(setState)
            .catch(setError)
            .finally(() => setLoading(false));
    }, [promise]);

    return [state, error, loading] as [
        state: T | undefined,
        error: undefined,
        loading: false,
    ] | [
        state: undefined,
        error: unknown,
        loading: true,
    ] | [
        state: undefined,
        error: undefined,
        loading: true,
    ];
}

type KinksArray = { section: string, name: string, participant: string, choice: Choice }[];

const compatibilityScoreThresholds = {
    Super: 1000,
    Good: 500,
    Decent: 250,
    Bad: 50,
    Poor: 0
};

function areAllKinksUnset() {
    return kinkData.value.kinkCategories.every(category =>
        category.kinks.every(kink =>
            category.participants.every(participant =>
                getSelectedKinkOrDefault(kink, participant).value === 'not-entered'
            )
        )
    );
}

function getCompatibilityScore(
    myUserKinks: KinksArray,
    otherUserKinks: KinksArray
) {
    const choiceScoreWeight: Record<Choice, number> = {
        favorite: 10,
        like: 7,
        okay: 5,
        maybe: 5,
        no: 5,
        'not-entered': 0,
        'want-to-try': 5
    };

    const similarChoiceWeight: Record<Choice, Record<Choice, number>> = {
        favorite: {
            favorite: 1,
            like: 0.7,
            okay: 0.5,
            maybe: 0.2,
            no: 0,
            'not-entered': 0,
            'want-to-try': 0.5
        },
        like: {
            favorite: 1,
            like: 1,
            okay: 0.5,
            maybe: 0.2,
            no: 0,
            'not-entered': 0,
            'want-to-try': 0.5
        },
        okay: {
            favorite: 1,
            like: 0.5,
            okay: 1,
            maybe: 0.2,
            no: 0,
            'not-entered': 0,
            'want-to-try': 0.5
        },
        maybe: {
            favorite: 0.7,
            like: 0.5,
            okay: 0.5,
            maybe: 1,
            no: 0,
            'not-entered': 0,
            'want-to-try': 0.2
        },
        no: {
            favorite: 0,
            like: 0,
            okay: 0,
            maybe: 0,
            no: 1,
            'not-entered': 0,
            'want-to-try': 0
        },
        'not-entered': {
            favorite: 0,
            like: 0,
            okay: 0,
            maybe: 0,
            no: 0,
            'not-entered': 0,
            'want-to-try': 0
        },
        'want-to-try': {
            favorite: 0.5,
            like: 0.5,
            okay: 0.5,
            maybe: 0.2,
            no: 0,
            'not-entered': 0,
            'want-to-try': 1
        }
    };

    const myKinks = new Map<string, Choice>();
    for (const kink of myUserKinks) {
        myKinks.set(kink.section + '::' + kink.name, kink.choice);
    }

    const otherKinks = new Map<string, Choice>();
    for (const kink of otherUserKinks) {
        otherKinks.set(kink.section + '::' + kink.name, kink.choice);
    }

    let score = 0;
    let totalMatches = 0;
    let possibleMatches = 0;
    for (const [key, myChoice] of myKinks) {
        const otherChoice = otherKinks.get(key);
        if (otherChoice === undefined) continue;

        score += (similarChoiceWeight[myChoice][otherChoice] ?? 0) * choiceScoreWeight[myChoice];

        if (myChoice !== 'not-entered' && otherChoice !== 'not-entered') {
            if (myChoice === otherChoice) totalMatches++;
            possibleMatches++;
        }
    }

    return { score, totalMatches, possibleMatches };
}

function UserCard({ did, handle, displayName, avatar, myKinks, kinks }: { did: Did, handle?: string, displayName?: string, avatar?: string, myKinks: KinksArray, kinks: KinksArray }) {
    const compatibilityScore = useMemo(() => {
        if (!myKinks || !kinks) return { score: 0, totalMatches: 0, possibleMatches: 0 };
        return getCompatibilityScore(myKinks, kinks);
    }, [myKinks, kinks]);

    const [compatRating, compatEmoji] = useMemo(() => {
        if (compatibilityScore.score >= compatibilityScoreThresholds.Super) return ['Super', '🥵'];
        if (compatibilityScore.score >= compatibilityScoreThresholds.Good) return ['Good', '🔥'];
        if (compatibilityScore.score >= compatibilityScoreThresholds.Decent) return ['Decent', '🙂'];
        if (compatibilityScore.score >= compatibilityScoreThresholds.Bad) return ['Bad', '😐'];
        return ['Poor', '😢'];
    }, [compatibilityScore.score]);

    console.log('Compatibility score for', handle, 'is', compatibilityScore);

    return (
        <div class="card">
            <div class="card-content">
                <div class="media">
                    {avatar && <div class="media-left">
                        <figure class="image is-64x64">
                            <img
                                src={avatar}
                                alt={displayName + "'s avatar"}
                            />
                        </figure>
                    </div>}
                    <div class="media-content">
                        {displayName && <p class="title is-5">{displayName}</p>}
                        {handle && <p class="subtitle is-6">@{handle}</p>}
                    </div>
                </div>

                <div class="content">
                    <p>Compatibility: <strong>{compatRating}</strong> {compatEmoji} ({compatibilityScore.totalMatches}/{compatibilityScore.possibleMatches})</p>
                </div>
            </div>
        </div>
    );
}

async function getUserKinks<T extends { did: Did }>(users: T[]): Promise<{
    users: {
        user: T,
        kinks: KinksArray
    }[], userCount: number
}> {
    if (!user.value) return { users: [], userCount: users.length };

    let userCount = users.length;
    const result: { user: T, kinks: KinksArray }[] = await Promise.all(
        users.map(async (theUser) => {

            let profile;
            try {
                profile = await user.value!.client.tryGetProfile(theUser.did);
                if (!profile.value) return { user: theUser, kinks: [] };
            } catch (err) {
                return { user: theUser, kinks: [] };
            }

            const kinks = profile.value.kinks.map(kink => ({
                section: kink.section,
                name: kink.name,
                participant: kink.participant,
                choice: kink.choice as Choice
            }));

            return { user: theUser, kinks };
        })
    );

    return { users: result.filter(e => e.kinks.length > 0), userCount };
}

function Friends() {
    const followers = useMemo(() => user.value && getFollowers(user.value.did).then(e => getUserKinks(e.followers)), [user.value?.did]);
    const [followersState, followersError, followersLoading] = usePromise(followers);

    const follows = useMemo(() => user.value && getFollows(user.value.did).then(e => getUserKinks(e.follows)), [user.value?.did]);
    const [followsState, followsError, followsLoading] = usePromise(follows);

    const myKinks = useMemo(() => getKinksArray(), []);

    if (followersLoading) {
        return <div class="box content">Loading followers...</div>;
    }

    if (followsLoading) {
        return <div class="box content">Loading follows...</div>;
    }

    if (followersError) {
        console.error(followersError);
        return <div class="box content">Failed to load followers: {followersError}</div>;
    }

    if (followsError) {
        return <div class="box content">Failed to load follows: {followsError}</div>;
    }

    return (
        <div class="box content">
            <h2 class="subtitle">Followers</h2>
            <p class="subtitle is-6">{followersState?.userCount} followers, {followersState?.users.length} have profiles</p>
            <div class="grid is-col-min-16">
                {followersState?.users.map((e) => (
                    <div class="cell">
                        <UserCard {...e.user} kinks={e.kinks} myKinks={myKinks} />
                    </div>
                ))}
            </div>

            <h2 class="subtitle">Following</h2>
            <p class="subtitle is-6">{followsState?.userCount} following, {followsState?.users.length} have profiles</p>
            <div class="grid is-col-min-16">
                {followsState?.users.map((e) => (
                    <div class="cell">
                        <UserCard {...e.user} kinks={e.kinks} myKinks={myKinks} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function CustomizeList({
    onClose
}: {
    onClose: () => void;
}) {
    const [localKinkText, setLocalKinkText] = useState(unparseKinks(kinkData.value.kinkCategories));
    const error = useMemo(() => {
        try {
            parseKinks(localKinkText);
            return undefined;
        } catch (err) {
            return err;
        }
    }, [localKinkText]);

    const [publishedLink, setPublishedLink] = useState("");
    const [publishedModalOpen, setPublishedModalOpen] = useState(false);
    const location = useLocation();

    function save() {
        localStorage.setItem("kink-text", localKinkText);
        kinkData.value = parseKinks(localKinkText);
        onClose();
    }

    function resetToDefault() {
        localStorage.removeItem("kink-text");
        setLocalKinkText(unparseKinks(defaultKinks.kinkCategories));
    }

    async function publish() {
        if (!user.value) {
            return;
        }

        try {
            const { uri } = await user.value.client.createList({
                kinkDefinitions: parseKinks(localKinkText).kinkCategories,
            });

            const result = parseResourceUri(uri);
            if (!result.ok) {
                throw new Error("Failed to parse URI: " + result.error);
            }

            setPublishedLink(`${document.location.origin}/${result.value.repo}/lists/${result.value.rkey}`);
            setPublishedModalOpen(true);
        } catch (err) {
            console.error(err);
            alert("Failed to publish kink list: " + err);
        }
    }

    function closeAllModals() {
        setPublishedModalOpen(false);
        onClose();
    }

    function goto(url: string) {
        closeAllModals();
        location.route(url);
    }

    return (
        <div class="box content">
            <h1 class="title">Customize List</h1>

            <div class="field">
                <textarea class="textarea" placeholder={localKinkText} value={localKinkText} onChange={e => {
                    setLocalKinkText(e.currentTarget.value);
                }} style={{ '--bulma-textarea-min-height': '24em' }} />
            </div>
            {error && <div class="notification is-danger">{String(error)}</div>}

            <div class="field is-grouped">
                <button class="button is-primary" disabled={error !== undefined} onClick={save}>Save</button>
                <button class="button is-secondary" onClick={resetToDefault}>Reset to Default</button>
                {user.value && <button class="button is-secondary" onClick={publish}>Share to ATProto</button>}
            </div>

            <Modal open={publishedModalOpen} onClose={() => setPublishedModalOpen(false)} container={document.body} zIndex={1000}>
                <div class="box content">
                    <h1 class="title">Successfully published!</h1>
                    <p>Your kink list is now available at <a href={publishedLink} onClick={() => goto(publishedLink)}>{publishedLink}</a></p>
                </div>
            </Modal>
        </div>
    )
}

async function uploadKinks() {
    if (!user.value) {
        return false;
    }

    await user.value.client.createOrUpdateProfile({
        kinks: getKinksArray(),
        kinkDefinitions: kinkData.value.kinkCategories
    });

    return true;
}

function Navbar({
    hasInitialSession
}: {
    hasInitialSession: boolean;
}) {
    const [exportImageOpen, setExportImageOpen] = useState(false);
    const [exportModalContent, setExportModalContent] = useState<HTMLElement | null>(null);
    const [quizModeOpen, setQuizModeOpen] = useState(false);
    const [navbarMenuActive, setNavbarMenuActive] = useState(false);
    const [friendsOpen, setFriendsOpen] = useState(false);
    const [customizeListOpen, setCustomizeListOpen] = useState(false);
    const [exportDropdownActive, setExportDropdownActive] = useState(false);
    const location = useLocation();

    function exportImageCallback() {
        const canvas = exportImage(kinkData.value.kinkCategories, kinkData.value.kinksById, (kink, participant) => getSelectedKinkOrDefault(kink, participant).value);

        // Try 1: https://stackoverflow.com/a/57546936

        if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write !== undefined) {
            canvas.toBlob((blob) => {
                if (blob === null) {
                    noCopyFallback();
                    return;
                }

                navigator.permissions
                    // @ts-expect-error
                    .query({ name: "clipboard-write" })
                    .then((status) => {
                        if (status.state !== "granted") {
                            // FAIL SCENARIO
                            noCopyFallback();
                            return;
                        }

                        const item = new ClipboardItem({ "image/png": blob });
                        navigator.clipboard.write([item]);

                        alert("Copied to clipboard!");
                    })
                    .catch((err) => {
                        // FAIL SCENARIO
                        console.error(err);
                        noCopyFallback();
                    });
            });
            return;
        }

        noCopyFallback();

        function noCopyFallback() {
            const image = document.createElement("img");
            image.src = canvas.toDataURL();

            setExportModalContent(image);
            setExportImageOpen(true);
        }
    }

    async function signIn(action: 'upload' | 'sign-in') {
        localStorage.setItem("oauth-redirect-kinks", serializeChoices());
        localStorage.setItem("oauth-redirect-action", action);

        if (!hasInitialSession) {
            await oauthClient.waitForInitialSession();
        }

        if (!user.value) {
            const handle = prompt("Enter your ATProto handle:", savedHandle.value || "");

            if (!handle) {
                return;
            }

            await oauthClient.authenticateIfNecessary(handle, false);
            // This may not return if OAuth redirect, in which case the second part is handled below
            // in the useEffect that checks for the OAuth redirect page.
            // If it does return, then we can proceed to upload the kinks immediately.
        }
    }

    async function exportAtprotoCallback() {
        await signIn('upload');

        const success = await uploadKinks();

        if (success) {
            alert("Successfully uploaded kinks!");
        }
    }

    const [darkThemeChecked, setDarkThemeChecked] = useState(document.documentElement.classList.contains("theme-dark"));

    return (
        <nav class="navbar px-5 mt-5 mb-2" role="navigation" aria-label="main navigation">
            <div class="navbar-brand">
                <div class="navbar-item">
                    <h1 class="title">Kink list</h1>
                </div>

                <div role="button" class={`navbar-burger ${navbarMenuActive ? "is-active" : ""}`} onClick={() => setNavbarMenuActive(!navbarMenuActive)} aria-label="menu" aria-expanded={navbarMenuActive} data-target="navMenu">
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                </div>
            </div>

            <div class={`navbar-menu ${navbarMenuActive ? "is-active" : ""}`}>
                <div class="navbar-start">
                    <div class={`navbar-item has-dropdown ${exportDropdownActive ? "is-active" : ""}`} onClick={() => setExportDropdownActive(!exportDropdownActive)}>
                        <a class="navbar-link">
                            Export
                        </a>

                        <div class="navbar-dropdown">
                            <a class="navbar-item" onClick={exportImageCallback}>
                                to Clipboard
                            </a>

                            <Modal open={exportImageOpen} onClose={() => setExportImageOpen(false)} container={document.body}>
                                <div class="box">
                                    <h1 class="title">Exported! Copy the image to your clipboard or save it now.</h1>
                                    <div id="export-modal-content">{exportModalContent}</div>
                                </div>
                            </Modal>

                            <a class="navbar-item" onClick={exportAtprotoCallback}>
                                to ATProto
                            </a>
                        </div>
                    </div>

                    <a class="navbar-item" onClick={() => setQuizModeOpen(true)}>
                        Quiz Mode
                    </a>

                    <Modal open={quizModeOpen} onClose={() => setQuizModeOpen(false)} container={document.body}>
                        {quizModeOpen && <QuizMode />}
                    </Modal>

                    <a class="navbar-item" id="customize-list" onClick={() => {
                        setCustomizeListOpen(true);
                        location.route('/'); // remove any /:did/lists/:rkey from the URL and hide the card
                    }}>
                        Customize List
                    </a>

                    <Modal open={customizeListOpen} onClose={() => setCustomizeListOpen(false)} container={document.body}>
                        <CustomizeList onClose={() => setCustomizeListOpen(false)} />
                    </Modal>
                </div>

                {hasInitialSession && <div class="navbar-end">
                    {user.value
                        ? <>
                            <a class="navbar-item" onClick={() => setFriendsOpen(true)}>
                                Friends
                            </a>
                            <div class="navbar-item">
                                @{user.value.handle}
                            </div>
                            <a class="navbar-item" onClick={() => oauthClient.revokeSessions()}>
                                Sign out
                            </a>
                        </>
                        : (
                            <a class="navbar-item" onClick={() => signIn('sign-in')}>
                                Sign in with ATProto
                            </a>
                        )}
                </div>}

                <Modal open={friendsOpen} onClose={() => setFriendsOpen(false)} container={document.body}>
                    {friendsOpen && <Friends />}
                </Modal>


                <a class="navbar-item" onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (!darkThemeChecked) {
                        localStorage.setItem("theme", "dark");
                        document.documentElement.classList.add("theme-dark");
                        setDarkThemeChecked(true);
                    } else {
                        localStorage.setItem("theme", "light");
                        document.documentElement.classList.remove("theme-dark");
                        setDarkThemeChecked(false);
                    }
                }}>
                    {darkThemeChecked ? <FontAwesomeIcon icon={faSun} /> : <FontAwesomeIcon icon={faMoon} />}
                </a>
            </div>
        </nav>
    )
}

function Root() {
    const { did, rkey } = useRoute().params;
    const [changelogOpen, setChangelogOpen] = useState(false);
    const [hasInitialSession, setHasInitialSession] = useState(false);
    const [listProfileRecord, setListProfileRecord] = useState<AppBskyActorProfile.Main>();
    const [createdOn, setCreatedOn] = useState<Date>();

    useEffect(() => {
        const hash = location.hash.slice(1);
        oauthClient
            .waitForInitialSession()
            .then(() => setHasInitialSession(true))
            .finally(async () => {
                if (document.location.pathname.endsWith("/oauth-redirect.html")) {
                    console.log("On OAuth redirect page, finalizing authorization...");

                    // Retrieve kinks from local storage as OAuth metadata is in the hash
                    const storedKinks = localStorage.getItem("oauth-redirect-kinks");
                    const action = localStorage.getItem("oauth-redirect-action");

                    if (storedKinks) {
                        console.log("Deserializing kinks from local storage");
                        deserializeChoices(storedKinks);

                        console.log("Finalizing authorization");
                        if (!user.value) {
                            await oauthClient.finalizeAuthorization(new URLSearchParams(hash));
                        }

                        if (action === 'upload') {
                            console.log("Uploading kinks");
                            const success = await uploadKinks();

                            // Return to index page without redirecting
                            history.replaceState(
                                null,
                                "",
                                location.origin +
                                location.pathname.replace("/oauth-redirect.html", "") +
                                location.search +
                                "#" +
                                serializeChoices(),
                            );

                            if (success) {
                                alert("Successfully uploaded kinks!");
                            } else {
                                alert("Failed to upload kinks!");
                            }
                        }

                        // Remove local storage
                        localStorage.removeItem("oauth-redirect-kinks");
                        localStorage.removeItem("oauth-redirect-action");
                    }
                }

                if (areAllKinksUnset() && user.value) {
                    const profile = await user.value.client.tryGetOwnProfile();
                    // Update local kinks with the ones from the profile
                    if (profile.value) {
                        for (const profileKink of profile.value.kinks) {
                            const kink = kinkData.value.kinkCategories
                                .find(category => category.name === profileKink.section)
                                ?.kinks.find(kink => kink.name === profileKink.name);

                            if (kink) {
                                setKinkSelection(kink, profileKink.participant, profileKink.choice as Choice, false);
                            }
                        }
                        window.location.hash = serializeChoices();
                    }
                }
            });

        if (hash && !document.location.pathname.endsWith("/oauth-redirect.html")) {
            try {
                deserializeChoices(hash);
            } catch (err) {
                console.error("Failed to load saved kinks:", err);
            }
        }
    }, []);

    useEffect(() => {
        if (document.location.pathname.includes('/lists/')) {
            Promise.all([
                slingshotClient.getRecord({
                    collection: 'io.gitlab.kinklist.kinklist.list',
                    repo: did as Did,
                    rkey: rkey,
                }),
                slingshotClient.getRecord({
                    collection: 'app.bsky.actor.profile',
                    repo: did as Did,
                    rkey: 'self',
                })
            ]).then(([record, profile]) => {
                kinkData.value = parseKinks(unparseKinks(record.value.kinkDefinitions));
                setListProfileRecord(profile.value);
                setCreatedOn(new Date(record.value.createdAt));
            })
        }
    }, [did, rkey]);

    return (
        <div id="root">
            <Navbar hasInitialSession={hasInitialSession} />

            <nav class="level px-5">
                <div id="legend" class="kinks-legend level-left">
                    <Legend />
                </div>
            </nav>

            <section class="section kinks-section">
                <KinksSection creatorProfile={listProfileRecord} creatorDid={did as Did} createdOn={createdOn} />
            </section>
            <footer class="footer">
                <div class="content has-text-centered">
                    <p>
                        Created by <a href="https://witchsky.app/profile/did:plc:nmc77zslrwafxn75j66mep6o">@maxine.puppykitty.racing</a>
                    </p>
                    <p>
                        Open source on <a href="https://gitlab.com/kinklist/kinklist.gitlab.io">GitLab</a>
                    </p>
                    <p>
                        Based on the many Kinklists that came before it
                    </p>
                    <p>
                        <a onClick={() => setChangelogOpen(true)}>
                            Changelog (Version {changelog[0].version})
                        </a>
                    </p>
                </div>
            </footer>

            <Modal open={changelogOpen} onClose={() => setChangelogOpen(false)} container={document.body}>
                <div class="box content">
                    <h1 class="title">Changelog</h1>
                    {changelog.map((entry) => (
                        <div>
                            <h2 class="subtitle">Version {entry.version}</h2>
                            <ul>
                                {entry.changes.map((change) => (
                                    <li>{change}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
}

function App() {
    return (
        <LocationProvider>
            <ErrorBoundary>
                <Router>
                    <Route path="/:did/lists/:rkey" component={Root} />
                    <Route default component={Root} />
                </Router>
            </ErrorBoundary>
        </LocationProvider>
    );
}

render(<App />, root!);
function getKinksArray(): KinksArray {
    return kinkData.value.kinkCategories.flatMap((category) =>
        category.kinks.flatMap((kink) =>
            category.participants.map((participant) => ({
                section: category.name,
                name: kink.name,
                participant: participant,
                choice: getSelectedKinkOrDefault(kink, participant).value,
            })),
        ),
    );
}

