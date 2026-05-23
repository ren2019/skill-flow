import type { CSSProperties, ReactNode } from "react";

type MarkdownDocumentProps = {
  title?: string;
  source: string;
  metadata?: Array<{ id: string; key: string; value: string }>;
};

type MarkdownBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "code"; text: string };

export function MarkdownDocument({ title = "README", source, metadata = [] }: MarkdownDocumentProps) {
  const blocks = parseMarkdownBlocks(source);

  return (
    <article data-testid="markdown-document" style={documentStyle}>
      <h3 style={titleStyle}>{title}</h3>
      {metadata.length > 0 ? <MetadataTable metadata={metadata} /> : null}
      <div data-view="markdown-rendered-content" style={contentStyle}>
        {blocks.map((block, index) => renderMarkdownBlock(block, index))}
      </div>
    </article>
  );
}

function MetadataTable({ metadata }: { metadata: Array<{ id: string; key: string; value: string }> }) {
  return (
    <dl data-view="markdown-metadata-table" style={metadataTableStyle}>
      {metadata.map((entry, index) => (
        <div key={entry.id} style={metadataRowStyle(index < metadata.length - 1)}>
          <dt style={metadataKeyStyle}>{entry.key}</dt>
          <dd style={metadataValueStyle}>{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function renderMarkdownBlock(block: MarkdownBlock, index: number): ReactNode {
  if (block.kind === "heading") {
    const HeadingTag = `h${Math.min(block.level + 1, 4)}` as "h2" | "h3" | "h4";
    return (
      <HeadingTag key={index} style={headingStyle(block.level)}>
        {block.text}
      </HeadingTag>
    );
  }

  if (block.kind === "list") {
    return (
      <ul key={index} style={listStyle}>
        {block.items.map((item, itemIndex) => (
          <li key={`${index}:${itemIndex}`}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.kind === "code") {
    return (
      <pre key={index} style={codeBlockStyle}>
        <code>{block.text}</code>
      </pre>
    );
  }

  return (
    <p key={index} style={paragraphStyle}>
      {block.text}
    </p>
  );
}

export function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let isCodeBlock = false;

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }
    blocks.push({ kind: "paragraph", text: paragraph.join(" ").trim() });
    paragraph = [];
  };
  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }
    blocks.push({ kind: "list", items: listItems });
    listItems = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (isCodeBlock) {
        blocks.push({ kind: "code", text: codeLines.join("\n") });
        codeLines = [];
        isCodeBlock = false;
        continue;
      }
      flushParagraph();
      flushList();
      isCodeBlock = true;
      continue;
    }

    if (isCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading?.[1] && heading[2]) {
      flushParagraph();
      flushList();
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      continue;
    }

    const listItem = /^[-*]\s+(.+)$/.exec(trimmed);
    if (listItem?.[1]) {
      flushParagraph();
      listItems.push(listItem[1]);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  if (isCodeBlock) {
    blocks.push({ kind: "code", text: codeLines.join("\n") });
  }
  flushParagraph();
  flushList();

  return blocks.length > 0 ? blocks : [{ kind: "paragraph", text: " " }];
}

const documentStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "18px",
  borderRadius: "10px",
  background: "rgba(255, 255, 255, 0.92)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "16px",
  fontWeight: 700,
  color: "#0f172a",
};

const contentStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  color: "#0f172a",
  fontSize: "13px",
  lineHeight: 1.6,
};

const metadataTableStyle: CSSProperties = {
  display: "grid",
  margin: 0,
  borderRadius: "10px",
  overflow: "hidden",
  background: "rgba(248, 250, 252, 0.92)",
};

function metadataRowStyle(hasDivider: boolean): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "120px minmax(0, 1fr)",
    gap: "12px",
    padding: "10px 12px",
    boxShadow: hasDivider ? "inset 0 -1px 0 rgba(148, 163, 184, 0.22)" : undefined,
  };
}

const metadataKeyStyle: CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: "11px",
  fontWeight: 700,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

const metadataValueStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: "11px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  whiteSpace: "pre-wrap",
};

const paragraphStyle: CSSProperties = {
  margin: 0,
};

const listStyle: CSSProperties = {
  margin: 0,
  paddingLeft: "18px",
};

const codeBlockStyle: CSSProperties = {
  margin: 0,
  padding: "12px",
  borderRadius: "8px",
  overflowX: "auto",
  background: "rgba(241, 245, 249, 0.92)",
  fontSize: "12px",
  lineHeight: 1.55,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

function headingStyle(level: 1 | 2 | 3): CSSProperties {
  return {
    margin: 0,
    fontSize: level === 1 ? "20px" : level === 2 ? "16px" : "14px",
    fontWeight: 700,
    lineHeight: 1.35,
  };
}
