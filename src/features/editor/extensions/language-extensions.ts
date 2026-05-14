import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import type { Extension } from "@codemirror/state";

export function getCodeMirrorLanguageExtensions(fileName: string): Extension[] {
  const dot = fileName.lastIndexOf(".");
  const ext = dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";

  switch (ext) {
    case "ts":
      return [javascript({ typescript: true })];
    case "tsx":
      return [javascript({ typescript: true, jsx: true })];
    case "jsx":
      return [javascript({ jsx: true })];
    case "js":
      return [javascript({ jsx: true })];
    case "mjs":
    case "cjs":
      return [javascript()];
    case "json":
      return [json()];
    case "css":
      return [css()];
    case "md":
    case "mdx":
      return [markdown()];
    case "html":
    case "htm":
      return [html()];
    case "xml":
    case "svg":
      return [xml()];
    case "py":
      return [python()];
    case "sql":
      return [sql()];
    default:
      return [];
  }
}
