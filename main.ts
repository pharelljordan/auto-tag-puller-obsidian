import { 
    Plugin, 
    Editor, 
    EditorPosition, 
    EditorSuggest, 
    EditorSuggestTriggerInfo, 
    EditorSuggestContext, 
    TFile,
    MarkdownPostProcessorContext,
    MarkdownRenderer,
    Component
} from 'obsidian';

export default class AutoTagPuller extends Plugin {
    onload() {
        // Register Trigger 1: Dynamic updater (!#)
        this.registerEditorSuggest(new DynamicTagSuggest(this));

        // Register Trigger 2: Static editable text ($#)
        this.registerEditorSuggest(new StaticTagSuggest(this));

        // Register the renderer for the dynamic updater
        this.registerMarkdownCodeBlockProcessor("autotag", this.processAutoTagBlock.bind(this));
    }

    async processAutoTagBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        const tag = source.trim();
        if (!tag) return;

        const files = this.app.vault.getMarkdownFiles();
        const pulledLines: string[] = [];

        for (const file of files) {
            if (file.path === ctx.sourcePath) continue;

            const content = await this.app.vault.cachedRead(file);
            const lines = content.split('\n');

            for (const line of lines) {
                if (line.includes(tag)) {
                    pulledLines.push(`[[${file.basename}]] ${line.trim()}`);
                }
            }
        }

        let markdownOutput = `> [!info] Linked Tags (${tag})\n`;
        
        if (pulledLines.length === 0) {
            markdownOutput += `> No lines found.\n`;
        } else {
            pulledLines.forEach((line, index) => {
                markdownOutput += `> ${index + 1}. ${line}\n`;
            });
        }

        const renderComponent = new Component();
        ctx.addChild(renderComponent);
        MarkdownRenderer.render(this.app, markdownOutput, el, ctx.sourcePath, renderComponent);
    }
}

// --------------------------------------------------------
// TRIGGER 1: Dynamic Block (!#)
// --------------------------------------------------------
class DynamicTagSuggest extends EditorSuggest<string> {
    plugin: AutoTagPuller;

    constructor(plugin: AutoTagPuller) {
        super(plugin.app);
        this.plugin = plugin;
    }

    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line);
        const textBeforeCursor = line.substring(0, cursor.ch);

        const match = textBeforeCursor.match(/!#([^ ]*)$/);
        
        if (match) {
            return {
                start: { line: cursor.line, ch: match.index as number },
                end: cursor,
                query: match[1]
            };
        }
        return null;
    }

    getSuggestions(context: EditorSuggestContext): string[] {
        const query = context.query.toLowerCase();
        const tags = Object.keys(this.plugin.app.metadataCache.getTags());
        return tags.filter(tag => tag.toLowerCase().includes(query));
    }

    renderSuggestion(value: string, el: HTMLElement): void {
        el.setText(value);
    }

    selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
        if (!this.context) return;
        
        const editor = this.context.editor;
        const files = this.plugin.app.vault.getMarkdownFiles();
        const start = this.context.start;
        const end = this.context.end;
        const currentPath = this.context.file.path;

        void (async () => {
            const groupedLines = new Map<string, string[]>();

            for (const file of files) {
                if (file.path === currentPath) continue;

                const content = await this.plugin.app.vault.cachedRead(file);
                const lines = content.split('\n');
                const fileMatches: string[] = [];

                for (const line of lines) {
                    if (line.includes(value)) {
                        fileMatches.push(line.trim());
                    }
                }

                if (fileMatches.length > 0) {
                    groupedLines.set(file.basename, fileMatches);
                }
            }

            let output = `${value}\n`;
            
            if (groupedLines.size === 0) {
                output += `No lines found.\n`;
            } else {
                let fileIndex = 1;
                for (const [basename, lines] of groupedLines.entries()) {
                    output += `${fileIndex}. [[${basename}]]\n`;
                    for (const line of lines) {
                        output += `     - ${line}\n`;
                    }
                    fileIndex++;
                }
            }

            output += `\n`;
            editor.replaceRange(output, start, end);
        })();
    }
}

// --------------------------------------------------------
// TRIGGER 2: Static Block ($#)
// --------------------------------------------------------
class StaticTagSuggest extends EditorSuggest<string> {
    plugin: AutoTagPuller;

    constructor(plugin: AutoTagPuller) {
        super(plugin.app);
        this.plugin = plugin;
    }

    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line);
        const textBeforeCursor = line.substring(0, cursor.ch);

        const match = textBeforeCursor.match(/\$#([^ ]*)$/);
        
        if (match) {
            return {
                start: { line: cursor.line, ch: match.index as number },
                end: cursor,
                query: match[1]
            };
        }
        return null;
    }

    getSuggestions(context: EditorSuggestContext): string[] {
        const query = context.query.toLowerCase();
        const tags = Object.keys(this.plugin.app.metadataCache.getTags());
        return tags.filter(tag => tag.toLowerCase().includes(query));
    }

    renderSuggestion(value: string, el: HTMLElement): void {
        el.setText(value);
    }

    selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
        if (!this.context) return;
        
        const editor = this.context.editor;
        const files = this.plugin.app.vault.getMarkdownFiles();
        const start = this.context.start;
        const end = this.context.end;
        const currentPath = this.context.file.path;

        void (async () => {
            const groupedLines = new Map<string, string[]>();

            for (const file of files) {
                if (file.path === currentPath) continue;

                const content = await this.plugin.app.vault.cachedRead(file);
                const lines = content.split('\n');
                const fileMatches: string[] = [];

                for (const line of lines) {
                    if (line.includes(value)) {
                        fileMatches.push(line.trim());
                    }
                }

                if (fileMatches.length > 0) {
                    groupedLines.set(file.basename, fileMatches);
                }
            }

            let output = `${value}\n`;
            
            if (groupedLines.size === 0) {
                output += `No lines found.\n`;
            } else {
                let fileIndex = 1;
                for (const [basename, lines] of groupedLines.entries()) {
                    output += `${fileIndex}. [[${basename}]]\n`;
                    for (const line of lines) {
                        output += `     - ${line}\n`;
                    }
                    fileIndex++;
                }
            }

            output += `\n`;
            editor.replaceRange(output, start, end);
        })();
    }
}
