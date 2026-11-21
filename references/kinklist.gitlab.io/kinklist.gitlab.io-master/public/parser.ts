export interface Kink {
    name: string;
    description?: string;
}

export interface KinkCategory {
    name: string;
    description?: string;
    kinks: Kink[];
    participants: string[];
}

function sliceOnce(str: string, char: string): [string, string?] {
    const index = str.indexOf(char);

    if (index !== -1) {
        const leftHalf = str.slice(0, index).trim();
        const rightHalf = str.slice(index + char.length).trim();
        return [leftHalf, rightHalf];
    }

    return [str.trim(), undefined];
}

function removeSymbols(str: string, symbolStart: string, symbolEnd: string | null = null): string {
    if (str.startsWith(symbolStart)) {
        str = str.slice(1);
    }

    if (symbolEnd !== null && str.endsWith(symbolEnd)) {
        str = str.slice(0, -1);
    }

    return str.trim();
}

export function unparseKinks(kinkCategories: KinkCategory[]): string {
    let result: string[] = [];
    for (const category of kinkCategories) {
        result.push('# ', category.name);
        if (category.description) {
            result.push(' ::: ', category.description);
        }
        result.push('\n');
        if (category.participants.length > 0) {
            result.push('(', category.participants.join(', '), ')\n');
        }
        for (const kink of category.kinks) {
            result.push('* ', kink.name);
            if (kink.description) {
                result.push(' ::: ', kink.description);
            }
            result.push('\n');
        }
        result.push('\n');
    }

    return result.join("");
}

export function parseKinks(kinkStr: string) {
    const kinkCode = kinkStr
        .split("\n")
        .map((e, i) => [e.trim(), i + 1] as const)
        .filter((e) => e[0]);

    const kinkCategories: KinkCategory[] = [];

    const kinksById: Kink[] = [];

    let curKinkCategory: KinkCategory | undefined;
    let curKinkId = 0;
    for (const [line, lineNum] of kinkCode) {
        if (line.startsWith("#")) {
            const [categoryName, categoryDesc] = sliceOnce(removeSymbols(line, "#"), ":::");

            curKinkCategory = {
                name: categoryName,
                description: categoryDesc,
                kinks: [],
                participants: ["Unknown"],
            };
            kinkCategories.push(curKinkCategory);
        } else if (line.startsWith("(") && line.endsWith(")")) {
            if (curKinkCategory === undefined) {
                throw new Error(`Encountered a participant definition before a kink type declaration (line ${lineNum})`);
            }
            curKinkCategory.participants = removeSymbols(line, "(", ")")
                .split(",")
                .map((e) => e.trim());
        } else if (line.startsWith("*")) {
            if (curKinkCategory?.kinks === undefined) {
                throw new Error(`Encountered a kink definition before a kink type declaration (line ${lineNum})`);
            }

            const [kinkName, kinkDescription] = sliceOnce(removeSymbols(line, "*"), ":::");
            const kink = { name: kinkName, description: kinkDescription };
            curKinkCategory.kinks.push(kink);
            kinksById[curKinkId++] = kink;
        }
    }

    return { kinkCategories, kinksById };
}
