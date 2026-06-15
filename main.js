"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => AutoTagPuller
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var AutoTagPuller = class extends import_obsidian.Plugin {
  async onload() {
    this.registerEditorSuggest(new DynamicTagSuggest(this));
    this.registerEditorSuggest(new StaticTagSuggest(this));
    this.registerMarkdownCodeBlockProcessor("autotag", this.processAutoTagBlock.bind(this));
  }
  async processAutoTagBlock(source, el, ctx) {
    const tag = source.trim();
    if (!tag)
      return;
    const files = this.app.vault.getMarkdownFiles();
    let pulledLines = [];
    for (const file of files) {
      if (file.path === ctx.sourcePath)
        continue;
      const content = await this.app.vault.cachedRead(file);
      const lines = content.split("\n");
      for (const line of lines) {
        if (line.includes(tag)) {
          pulledLines.push(`[[${file.basename}]] ${line.trim()}`);
        }
      }
    }
    let markdownOutput = `> [!info] Linked Tags (${tag})
`;
    if (pulledLines.length === 0) {
      markdownOutput += `> No lines found.
`;
    } else {
      pulledLines.forEach((line, index) => {
        markdownOutput += `> ${index + 1}. ${line}
`;
      });
    }
    await import_obsidian.MarkdownRenderer.render(this.app, markdownOutput, el, ctx.sourcePath, ctx);
  }
};
var DynamicTagSuggest = class extends import_obsidian.EditorSuggest {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
  }
  onTrigger(cursor, editor, _file) {
    const line = editor.getLine(cursor.line);
    const textBeforeCursor = line.substring(0, cursor.ch);
    const match = textBeforeCursor.match(/!#([^ ]*)$/);
    if (match) {
      return {
        start: { line: cursor.line, ch: match.index },
        end: cursor,
        query: match[1]
      };
    }
    return null;
  }
  getSuggestions(context) {
    var _a;
    const query = context.query.toLowerCase();
    const cachedTags = (_a = this.plugin.app.metadataCache.getTags()) != null ? _a : {};
    const tags = Object.keys(cachedTags);
    return tags.filter((tag) => tag.toLowerCase().includes(query));
  }
  renderSuggestion(value, el) {
    el.setText(value);
  }
  selectSuggestion(value, _evt) {
    if (!this.context)
      return;
    const output = `\`\`\`autotag
${value}
\`\`\`
`;
    this.context.editor.replaceRange(output, this.context.start, this.context.end);
  }
};
var StaticTagSuggest = class extends import_obsidian.EditorSuggest {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
  }
  onTrigger(cursor, editor, _file) {
    const line = editor.getLine(cursor.line);
    const textBeforeCursor = line.substring(0, cursor.ch);
    const match = textBeforeCursor.match(/\$#([^ ]*)$/);
    if (match) {
      return {
        start: { line: cursor.line, ch: match.index },
        end: cursor,
        query: match[1]
      };
    }
    return null;
  }
  getSuggestions(context) {
    var _a;
    const query = context.query.toLowerCase();
    const cachedTags = (_a = this.plugin.app.metadataCache.getTags()) != null ? _a : {};
    const tags = Object.keys(cachedTags);
    return tags.filter((tag) => tag.toLowerCase().includes(query));
  }
  renderSuggestion(value, el) {
    el.setText(value);
  }
  selectSuggestion(value, _evt) {
    if (!this.context)
      return;
    const editor = this.context.editor;
    const fileContext = this.context.file;
    const startPos = this.context.start;
    const endPos = this.context.end;
    void (async () => {
      const files = this.plugin.app.vault.getMarkdownFiles();
      let groupedLines = /* @__PURE__ */ new Map();
      for (const file of files) {
        if (file.path === fileContext.path)
          continue;
        const content = await this.plugin.app.vault.cachedRead(file);
        const lines = content.split("\n");
        let fileMatches = [];
        for (const line of lines) {
          if (line.includes(value)) {
            fileMatches.push(line.trim());
          }
        }
        if (fileMatches.length > 0) {
          groupedLines.set(file.basename, fileMatches);
        }
      }
      let output = `${value}
`;
      if (groupedLines.size === 0) {
        output += `No lines found.
`;
      } else {
        let fileIndex = 1;
        for (const [basename, lines] of groupedLines.entries()) {
          output += `${fileIndex}. [[${basename}]]
`;
          for (const line of lines) {
            output += `     - ${line}
`;
          }
          fileIndex++;
        }
      }
      output += `
`;
      editor.replaceRange(output, startPos, endPos);
    })();
  }
};
