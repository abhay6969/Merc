/**
 * System / user prompts for the editor suggestions API (Gemini).
 * Placeholders: `{name}` replaced by {@link fillPromptTemplate}.
 */

export const SUGGESTION_PROMPT = `You are a code suggestion assistant.

<context>
<file_name>{fileName}</file_name>
<previous_lines>
{previousLines}
</previous_lines>
<current_line number="{lineNumber}">{currentLine}</current_line>
<before_cursor>{textBeforeCursor}</before_cursor>
<after_cursor>{textAfterCursor}</after_cursor>
<next_lines>
{nextLines}
</next_lines>
<full_code>
{code}
</full_code>
</context>

<instructions>
Follow these steps IN ORDER:

1. First, look at next_lines. If next_lines contains ANY code, check if it continues from where the cursor is. If it does, return empty string immediately - the code is already written.

2. Check if before_cursor ends with a complete statement (;, }, )). If yes, return empty string.

3. Only if steps 1 and 2 don't apply: suggest what should be typed at the cursor position, using context from full_code.

Your suggestion is inserted immediately after the cursor, so never suggest code that's already in the file.
</instructions>

<output_format>
Return ONLY the raw text to insert at the cursor (no markdown fences, no quotes, no labels, no XML). If you return nothing, use an empty response.
</output_format>`;

export const QUICK_EDIT_PROMPT = `You are a code editing assistant. Edit the selected code based on the user's instruction.

<context>
<selected_code>
{selectedCode}
</selected_code>
<full_code_context>
{fullCode}
</full_code_context>
</context>

{documentation}

<instruction>
{instruction}
</instruction>

<instructions>
Return ONLY the edited version of the selected code.
Maintain the same indentation level as the original.
Do not include any explanations or comments unless requested.
If the instruction is unclear or cannot be applied, return the original code unchanged.
</instructions>`;

const MAX_FULL_CODE_CHARS = 16_000;
const MAX_SURROUND_LINES = 60;

export type CursorContext = {
  lineNumber: number;
  currentLine: string;
  textBeforeCursor: string;
  textAfterCursor: string;
  previousLines: string;
  nextLines: string;
  code: string;
};

/** Cursor position in UTF-16 code units (same as JS string index / CodeMirror). */
export function buildCursorContext(document: string, cursorPosition: number): CursorContext {
  const pos = Math.min(Math.max(0, cursorPosition), document.length);

  let lineStart = 0;
  let lineNumber = 1;
  for (let i = 0; i < pos; i++) {
    if (document[i] === "\n") {
      lineStart = i + 1;
      lineNumber++;
    }
  }

  let lineEnd = document.length;
  for (let i = pos; i < document.length; i++) {
    if (document[i] === "\n") {
      lineEnd = i;
      break;
    }
  }

  const currentLine = document.slice(lineStart, lineEnd);
  const col = pos - lineStart;
  const textBeforeCursor = currentLine.slice(0, col);
  const textAfterCursor = currentLine.slice(col);

  const allLines = document.split(/\r?\n/);
  const lineIdx = lineNumber - 1;
  const prevStart = Math.max(0, lineIdx - MAX_SURROUND_LINES);
  const previousLines = allLines.slice(prevStart, lineIdx).join("\n");
  const nextLines = allLines
    .slice(lineIdx + 1, lineIdx + 1 + MAX_SURROUND_LINES)
    .join("\n");

  const code =
    document.length > MAX_FULL_CODE_CHARS
      ? `${document.slice(0, MAX_FULL_CODE_CHARS)}\n/* …truncated … */`
      : document;

  return {
    lineNumber,
    currentLine,
    textBeforeCursor,
    textAfterCursor,
    previousLines,
    nextLines,
    code,
  };
}

export function fillPromptTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

export function buildSuggestionUserPrompt(
  fileName: string,
  document: string,
  cursorPosition: number,
): string {
  const ctx = buildCursorContext(document, cursorPosition);
  return fillPromptTemplate(SUGGESTION_PROMPT, {
    fileName,
    lineNumber: String(ctx.lineNumber),
    currentLine: ctx.currentLine,
    textBeforeCursor: ctx.textBeforeCursor,
    textAfterCursor: ctx.textAfterCursor,
    previousLines: ctx.previousLines,
    nextLines: ctx.nextLines,
    code: ctx.code,
  });
}

export type QuickEditPromptInput = {
  selectedCode: string;
  fullCode: string;
  documentation: string;
  instruction: string;
};

export function buildQuickEditUserPrompt(input: QuickEditPromptInput): string {
  return fillPromptTemplate(QUICK_EDIT_PROMPT, {
    selectedCode: input.selectedCode,
    fullCode: input.fullCode,
    documentation: input.documentation,
    instruction: input.instruction,
  });
}
