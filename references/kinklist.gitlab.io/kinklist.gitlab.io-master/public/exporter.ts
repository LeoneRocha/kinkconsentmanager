import { choiceOptions } from "./base";
import type { KinkCategory, Kink } from "./parser";

const IMGUR_CLIENT_ID = '9db53e5936cd02f';

const drawCallHandlers = {
    simpleTitle(context: CanvasRenderingContext2D, pattern: CanvasPattern, drawCall: SimpleTitleDrawCall) {
        context.fillStyle = '#000000';
        context.font = 'bold 18px Arial';
        context.fillText(drawCall.data, drawCall.x, drawCall.y + 5);
    },
    titleSubtitle(context: CanvasRenderingContext2D, pattern: CanvasPattern, drawCall: TitleSubtitleDrawCall) {
        context.fillStyle = '#000000';
        context.font = 'bold 18px Arial';
        context.fillText(drawCall.data.category, drawCall.x, drawCall.y + 5);

        const fieldsString = drawCall.data.fields.join(', ');
        context.font = 'italic 12px Arial';
        context.fillText(fieldsString, drawCall.x, drawCall.y + 20);
    },
    kinkRow(context: CanvasRenderingContext2D, pattern: CanvasPattern, drawCall: KinkRowDrawCall) {
        context.fillStyle = '#000000';
        context.font = '12px Arial';

        let x = drawCall.x + 5 + (drawCall.data.choices.length * 20);
        let y = drawCall.y - 6;
        context.fillText(drawCall.data.text, x, y);
        // Circles
        for (let i = 0; i < drawCall.data.choices.length; i++) {
            const choice = drawCall.data.choices[i];
            const color = choiceOptions.find(e => e[0] == choice)![2];

            x = 10 + drawCall.x + (i * 20);
            y = drawCall.y - 10;

            context.beginPath();
            context.arc(x, y, 8, 0, 2 * Math.PI, false);
            if (color != 'pattern') {
                context.fillStyle = color;
            } else {
                context.fillStyle = pattern;
            }
            context.fill();
            context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            context.lineWidth = 1;
            context.stroke();
        }

    }
};

const patternImg = new Image();
patternImg.src =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc' +
    'xNScgaGVpZ2h0PScxNSc+CiAgPHJlY3Qgd2lkdGg9JzE1JyBoZWlnaHQ9JzE1JyBmaWxsPSd3aGl0ZScvPgogIDxwYXRoIGQ9J00tMSwxI' +
    'GwyLC0yCiAgICAgICAgICAgTTAsNSBsMTUsLTE1CiAgICAgICAgICAgTTAsMTAgbDE1LC0xNQogICAgICAgICAgIE0wLDE1IGwxNSwtMTUK' +
    'ICAgICAgICAgICBNMCwyMCBsMTUsLTE1CiAgICAgICAgICAgTTAsMjUgbDE1LC0xNQogICAgICAgICAgIE0xNCwxNiBsMiwtMicgc3Ryb2t' +
    'lPSdibGFjaycgc3Ryb2tlLXdpZHRoPScxJy8+Cjwvc3ZnPgo=';

/**
 * @param {number} width
 * @param {number} height
 */
function setupCanvas(width: number, height: number) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'mainCanvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d')!;
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = 'bold 24px Arial';
    context.fillStyle = '#000000';
    context.fillText('Kinklist', 5, 25);

    const pattern = context.createPattern(patternImg, 'repeat')!;

    drawLegend(context, pattern);
    return { context, canvas, pattern };
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {CanvasPattern} pattern
 */
function drawLegend(context: CanvasRenderingContext2D, pattern: CanvasPattern) {
    context.font = 'bold 13px Arial';
    context.fillStyle = '#000000';

    const x = context.canvas.width - 15 - (120 * choiceOptions.length);
    for (const [i, option] of choiceOptions.entries()) {
        context.beginPath();
        context.arc(x + (120 * i), 17, 8, 0, 2 * Math.PI, false);
        if (option[2] != 'pattern') {
            context.fillStyle = option[2];
        } else {
            context.fillStyle = pattern;
        }
        context.fill();
        context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        context.lineWidth = 1;
        context.stroke();

        context.fillStyle = '#000000';
        context.fillText(option[1], x + 15 + (i * 120), 22);
    }
}

interface SimpleTitleDrawCall {
    type: 'simpleTitle';
    data: string;
    x: number;
    y: number;
}

interface TitleSubtitleDrawCall {
    type: 'titleSubtitle';
    data: {
        category: string;
        fields: string[];
    };
    x: number;
    y: number;
}

interface KinkRowDrawCall {
    type: 'kinkRow';
    data: {
        choices: string[];
        text: string;
    };
    x: number;
    y: number;
}

type DrawCall = SimpleTitleDrawCall | TitleSubtitleDrawCall | KinkRowDrawCall;

/**
 * @returns {HTMLCanvasElement}
 */
export function exportImage(kinkCategories: KinkCategory[], kinksById: Kink[], getSelectedKinkOrDefault: (kink: Kink, participant: string) => string): HTMLCanvasElement {
    // Constants
    const numberCols = 6;
    const columnWidth = 250;
    const simpleTitleHeight = 35;
    const titleSubtitleHeight = 50;
    const rowHeight = 25;
    const offsets = {
        left: 10,
        right: 10,
        top: 50,
        bottom: 10
    };

    // Find out how many we have of everything
    const numberCats = kinkCategories.length;
    const dualCats = kinkCategories.filter(e => e.participants.length == 2).length;
    const simpleCats = numberCats - dualCats;
    const numberKinks = kinksById.length;

    // Determine the height required for all categories and kinks
    const totalHeight = (
        (numberKinks * rowHeight) +
        (dualCats * titleSubtitleHeight) +
        (simpleCats * simpleTitleHeight)
    );

    // Initialize columns and drawStacks
    /** @type {Array<{ height: number, drawStack: DrawCall[] }>} */
    const columns: Array<{ height: number; drawStack: DrawCall[]; }> = [];
    for (let i = 0; i < numberCols; i++) {
        columns.push({ height: 0, drawStack: [] });
    }

    // Create drawcalls and place them in the drawStack
    // for the appropriate column
    const avgColHeight = totalHeight / numberCols;
    let columnIndex = 0;
    for (const category of kinkCategories) {
        const catName = category.name;
        const fields = category.participants;
        const catKinks = category.kinks;

        let catHeight = 0;
        catHeight += (fields.length === 1) ? simpleTitleHeight : titleSubtitleHeight;
        catHeight += (catKinks.length * rowHeight);

        // Determine which column to place this category in
        if ((columns[columnIndex].height + (catHeight / 2)) > avgColHeight) columnIndex++;
        while (columnIndex >= numberCols) columnIndex--;
        const column = columns[columnIndex];

        // Drawcall for title
        if (fields.length < 2) {
            /** @type {SimpleTitleDrawCall} */
            const drawCall: SimpleTitleDrawCall = { x: NaN, y: column.height, type: 'simpleTitle', data: catName };
            column.drawStack.push(drawCall);
            column.height += simpleTitleHeight;
        } else {
            /** @type {TitleSubtitleDrawCall} */
            const drawCall: TitleSubtitleDrawCall = { x: NaN, y: column.height, type: 'titleSubtitle', data: { category: catName, fields: fields } };
            column.drawStack.push(drawCall);
            column.height += titleSubtitleHeight;
        }

        // Drawcalls for kinks
        for (const kink of category.kinks) {
            /** @type {KinkRowDrawCall} */
            const drawCall: KinkRowDrawCall = {
                x: NaN,
                y: column.height,
                type: 'kinkRow',
                data: {
                    choices: [],
                    text: kink.name
                }
            };
            column.drawStack.push(drawCall);
            column.height += rowHeight;

            for (const participant of category.participants) {
                drawCall.data.choices.push(getSelectedKinkOrDefault(kink, participant));
            }
        }
    }

    let tallestColumnHeight = 0;
    for (const column of columns) {
        if (tallestColumnHeight < column.height) {
            tallestColumnHeight = column.height;
        }
    }

    const canvasWidth = offsets.left + offsets.right + (columnWidth * numberCols);
    const canvasHeight = offsets.top + offsets.bottom + tallestColumnHeight;
    const {context, canvas, pattern} = setupCanvas(canvasWidth, canvasHeight);

    for (const [i, column] of columns.entries()) {
        const drawStack = column.drawStack;

        const drawX = offsets.left + (columnWidth * i);
        for (const drawCall of drawStack) {
            drawCall.x = drawX;
            drawCall.y += offsets.top;
            // @ts-expect-error - TS doesn't understand that the type of drawCall is determined by the type property
            drawCallHandlers[drawCall.type](context, pattern, drawCall);
        }
    }

    return canvas;
}
