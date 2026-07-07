// Renders a TipTap JSON document to React elements. This is the single
// renderer used on student pages and for model answers, guaranteeing the
// student view matches what the admin edited.
import * as React from "react";
import { MermaidDiagram } from "./mermaid-diagram";
import { getYouTubeId } from "@/lib/youtube";

interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TipTapNode {
  type?: string;
  text?: string;
  marks?: TipTapMark[];
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
}

function renderText(node: TipTapNode, key: number): React.ReactNode {
  let el: React.ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        el = <strong>{el}</strong>;
        break;
      case "italic":
        el = <em>{el}</em>;
        break;
      case "strike":
        el = <s>{el}</s>;
        break;
      case "underline":
        el = <u>{el}</u>;
        break;
      case "code":
        el = <code>{el}</code>;
        break;
      case "highlight":
        el = <mark>{el}</mark>;
        break;
      case "link": {
        const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "#";
        const safe = /^(https?:|mailto:|\/)/i.test(href) ? href : "#";
        el = (
          <a href={safe} target="_blank" rel="noopener noreferrer">
            {el}
          </a>
        );
        break;
      }
    }
  }
  return <React.Fragment key={key}>{el}</React.Fragment>;
}

function renderChildren(node: TipTapNode): React.ReactNode {
  return (node.content ?? []).map((child, i) => renderNode(child, i));
}

function renderNode(node: TipTapNode, key: number): React.ReactNode {
  switch (node.type) {
    case "doc":
      return <React.Fragment key={key}>{renderChildren(node)}</React.Fragment>;
    case "paragraph":
      return <p key={key}>{renderChildren(node)}</p>;
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 2)));
      const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
      return <Tag key={key}>{renderChildren(node)}</Tag>;
    }
    case "text":
      return renderText(node, key);
    case "bulletList":
      return <ul key={key}>{renderChildren(node)}</ul>;
    case "orderedList":
      return <ol key={key}>{renderChildren(node)}</ol>;
    case "listItem":
      return <li key={key}>{renderChildren(node)}</li>;
    case "blockquote":
      return <blockquote key={key}>{renderChildren(node)}</blockquote>;
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{renderChildren(node)}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "table":
      return (
        <div key={key} className="table-wrapper">
          <table>
            <tbody>{renderChildren(node)}</tbody>
          </table>
        </div>
      );
    case "tableRow":
      return <tr key={key}>{renderChildren(node)}</tr>;
    case "tableHeader":
      return <th key={key}>{renderChildren(node)}</th>;
    case "tableCell":
      return <td key={key}>{renderChildren(node)}</td>;
    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      const title = typeof node.attrs?.title === "string" ? node.attrs.title : "";
      if (!src) return null;
      const caption = title || alt;
      return (
        <figure key={key}>
          {/* Storage-hosted user content: plain img keeps sizing flexible */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} loading="lazy" />
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      );
    }
    case "youtube": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      const id = getYouTubeId(src);
      if (!id) return null;
      return (
        <div key={key} className="my-4 overflow-hidden rounded-lg border">
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title="Embedded video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
      );
    }
    case "mermaid": {
      const code = typeof node.attrs?.code === "string" ? node.attrs.code : "";
      if (!code.trim()) return null;
      return <MermaidDiagram key={key} code={code} />;
    }
    default:
      // Unknown node: render children so content degrades gracefully.
      return <React.Fragment key={key}>{renderChildren(node)}</React.Fragment>;
  }
}

export function NoteRenderer({
  doc,
  className,
}: {
  doc: unknown;
  className?: string;
}) {
  if (!doc || typeof doc !== "object") return null;
  return (
    <div className={`rich-content ${className ?? ""}`}>
      {renderNode(doc as TipTapNode, 0)}
    </div>
  );
}
