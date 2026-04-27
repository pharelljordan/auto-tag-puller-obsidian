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
  onload() {
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
    const renderComponent = new import_obsidian.Component();
    ctx.addChild(renderComponent);
    import_obsidian.MarkdownRenderer.render(this.app, markdownOutput, el, ctx.sourcePath, renderComponent);
  }
};
var DynamicTagSuggest = class extends import_obsidian.EditorSuggest {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
  }
  onTrigger(cursor, editor, file) {
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
    const query = context.query.toLowerCase();
    const tags = Object.keys(this.plugin.app.metadataCache.getTags());
    return tags.filter((tag) => tag.toLowerCase().includes(query));
  }
  renderSuggestion(value, el) {
    el.setText(value);
  }
  selectSuggestion(value, evt) {
    if (!this.context)
      return;
    const editor = this.context.editor;
    const files = this.plugin.app.vault.getMarkdownFiles();
    const start = this.context.start;
    const end = this.context.end;
    const currentPath = this.context.file.path;
    void (async () => {
      let groupedLines = /* @__PURE__ */ new Map();
      for (const file of files) {
        if (file.path === currentPath)
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
      editor.replaceRange(output, start, end);
    })();
  }
};
