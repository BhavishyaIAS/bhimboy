import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MermaidNodeView } from "./mermaid-node-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaid: {
      insertMermaid: (code?: string) => ReturnType;
    };
  }
}

const DEFAULT_CODE = `flowchart TD
  A[Main concept] --> B[Sub-point 1]
  A --> C[Sub-point 2]`;

// Block-level atom that stores Mermaid source in a "code" attribute and
// renders an editable preview via a React node view.
export const MermaidNode = Node.create({
  name: "mermaid",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      code: { default: DEFAULT_CODE },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-mermaid]",
        getAttrs: (el) => ({
          code: (el as HTMLElement).getAttribute("data-mermaid") ?? DEFAULT_CODE,
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return ["div", mergeAttributes({ "data-mermaid": node.attrs.code as string })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView);
  },

  addCommands() {
    return {
      insertMermaid:
        (code) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: code ? { code } : {},
          }),
    };
  },
});
