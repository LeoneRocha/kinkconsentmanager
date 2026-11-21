export const enum Choice {
    Favorite = "favorite",
    Like = "like",
    Maybe = "maybe",
    No = "no",
    NotEntered = "not-entered",
    Okay = "okay",
    WantToTry = "want-to-try"
}

/** @type {[id: Choice, name: string, color: string][]} */
export const choiceOptions: [id: Choice, name: string, color: string][] = [
    [Choice.NotEntered, 'Not Entered', '#FFFFFF'],
    [Choice.Favorite, 'Favorite', '#6DB5FE'],
    [Choice.Like, 'Like', '#23FD22'],
    [Choice.Okay, 'Okay', '#FDFD6B'],
    [Choice.Maybe, 'Maybe', '#DB6C00'],
    [Choice.No, 'No', '#920000'],
    [Choice.WantToTry, 'Want To Try', 'pattern'],
];
export const choiceOptionIndices = Object.fromEntries(choiceOptions.map(([id], i) => [id, i]));
