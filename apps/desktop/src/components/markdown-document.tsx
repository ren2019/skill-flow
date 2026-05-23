import type { CSSProperties, ReactNode } from "react";

type MarkdownDocumentProps = {
  title?: string;
  source: string;
  path?: string | undefined;
  metadata?: Array<{ id: string; key: string; value: string }>;
  onOpenUrl?: (url: string) => void | Promise<void>;
  onOpenPath?: (path: string) => void | Promise<void>;
};

type MarkdownBlock =
  | { kind: "heading"; level: MarkdownHeadingLevel; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "ordered-list"; items: string[] }
  | { kind: "blockquote"; text: string }
  | { kind: "image"; alt: string; url: string }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "divider" }
  | { kind: "code"; text: string };

type MarkdownHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export function MarkdownDocument({
  source,
  path,
  metadata = [],
  onOpenUrl,
  onOpenPath,
}: MarkdownDocumentProps) {
  const blocks = parseMarkdownBlocks(source);
  const context: MarkdownRenderContext = {
    basePath: documentBasePath(path),
    onOpenUrl,
    onOpenPath,
  };

  return (
    <article data-testid="markdown-document" style={documentStyle}>
      {metadata.length > 0 ? <MetadataTable metadata={metadata} /> : null}
      <div data-view="markdown-rendered-content" style={contentStyle}>
        {blocks.map((block, index) => renderMarkdownBlock(block, index, context))}
      </div>
    </article>
  );
}

type MarkdownRenderContext = {
  basePath: string | undefined;
  onOpenUrl: ((url: string) => void | Promise<void>) | undefined;
  onOpenPath: ((path: string) => void | Promise<void>) | undefined;
};

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

function renderMarkdownBlock(
  block: MarkdownBlock,
  index: number,
  context: MarkdownRenderContext,
): ReactNode {
  if (block.kind === "heading") {
    const HeadingTag = `h${Math.min(block.level + 1, 4)}` as "h2" | "h3" | "h4";
    return (
      <HeadingTag key={index} style={headingStyle(block.level)}>
        {renderInlineMarkdown(block.text, `heading:${index}`, context)}
      </HeadingTag>
    );
  }

  if (block.kind === "list") {
    return (
      <ul key={index} style={listStyle}>
        {block.items.map((item, itemIndex) => (
          <li key={`${index}:${itemIndex}`} style={listItemStyle}>
            {renderListItemContent(item, `list:${index}:${itemIndex}`, context)}
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "ordered-list") {
    return (
      <ol key={index} style={listStyle}>
        {block.items.map((item, itemIndex) => (
          <li key={`${index}:${itemIndex}`}>
            {renderInlineMarkdown(item, `ordered:${index}:${itemIndex}`, context)}
          </li>
        ))}
      </ol>
    );
  }

  if (block.kind === "blockquote") {
    return (
      <blockquote key={index} style={blockquoteStyle}>
        {renderInlineMarkdown(block.text, `quote:${index}`, context)}
      </blockquote>
    );
  }

  if (block.kind === "image") {
    return (
      <figure key={index} style={imageFigureStyle}>
        <img src={resolveMarkdownImageSrc(block.url, context.basePath)} alt={block.alt} style={imageStyle} />
        {block.alt ? <figcaption style={imageCaptionStyle}>{block.alt}</figcaption> : null}
      </figure>
    );
  }

  if (block.kind === "table") {
    return (
      <div key={index} style={tableScrollStyle}>
        <table data-view="markdown-table" style={tableStyle}>
          <thead>
            <tr>
              {block.headers.map((header, headerIndex) => (
                <th key={`${index}:header:${headerIndex}`} style={tableHeaderCellStyle}>
                  {renderInlineMarkdown(header, `table:${index}:header:${headerIndex}`, context)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`${index}:row:${rowIndex}`}>
                {block.headers.map((_, cellIndex) => (
                  <td key={`${index}:cell:${rowIndex}:${cellIndex}`} style={tableCellStyle}>
                    {renderInlineMarkdown(row[cellIndex] ?? "", `table:${index}:cell:${rowIndex}:${cellIndex}`, context)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.kind === "divider") {
    return <hr key={index} style={dividerStyle} />;
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
      {renderInlineMarkdown(block.text, `paragraph:${index}`, context)}
    </p>
  );
}

export function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let orderedListItems: string[] = [];
  let blockquote: string[] = [];
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
  const flushOrderedList = () => {
    if (orderedListItems.length === 0) {
      return;
    }
    blocks.push({ kind: "ordered-list", items: orderedListItems });
    orderedListItems = [];
  };
  const flushBlockquote = () => {
    if (blockquote.length === 0) {
      return;
    }
    blocks.push({ kind: "blockquote", text: blockquote.join(" ").trim() });
    blockquote = [];
  };
  const flushTextBlocks = () => {
    flushParagraph();
    flushList();
    flushOrderedList();
    flushBlockquote();
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    if (line.trim().startsWith("```")) {
      if (isCodeBlock) {
        blocks.push({ kind: "code", text: codeLines.join("\n") });
        codeLines = [];
        isCodeBlock = false;
        continue;
      }
      flushTextBlocks();
      isCodeBlock = true;
      continue;
    }

    if (isCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushTextBlocks();
      continue;
    }

    const table = parseMarkdownTable(lines, lineIndex);
    if (table) {
      flushTextBlocks();
      blocks.push({ kind: "table", headers: table.headers, rows: table.rows });
      lineIndex = table.nextIndex - 1;
      continue;
    }

    if (/^([-*_])(?:\s*\1){2,}$/.test(trimmed)) {
      flushTextBlocks();
      blocks.push({ kind: "divider" });
      continue;
    }

    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(trimmed);
    if (image?.[2]) {
      flushTextBlocks();
      blocks.push({ kind: "image", alt: image[1] ?? "", url: image[2] });
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading?.[1] && heading[2]) {
      flushTextBlocks();
      blocks.push({
        kind: "heading",
        level: heading[1].length as MarkdownHeadingLevel,
        text: heading[2].replace(/\s+#+$/, "").trim(),
      });
      continue;
    }

    const listItem = /^[-*]\s+(.+)$/.exec(trimmed);
    if (listItem?.[1]) {
      flushParagraph();
      flushOrderedList();
      flushBlockquote();
      listItems.push(listItem[1]);
      continue;
    }

    const orderedListItem = /^\d+[.)]\s+(.+)$/.exec(trimmed);
    if (orderedListItem?.[1]) {
      flushParagraph();
      flushList();
      flushBlockquote();
      orderedListItems.push(orderedListItem[1]);
      continue;
    }

    const quote = /^>\s?(.+)$/.exec(trimmed);
    if (quote?.[1]) {
      flushParagraph();
      flushList();
      flushOrderedList();
      blockquote.push(quote[1]);
      continue;
    }

    flushList();
    flushOrderedList();
    flushBlockquote();
    paragraph.push(trimmed);
  }

  if (isCodeBlock) {
    blocks.push({ kind: "code", text: codeLines.join("\n") });
  }
  flushTextBlocks();

  return blocks.length > 0 ? blocks : [{ kind: "paragraph", text: " " }];
}

function renderInlineMarkdown(
  text: string,
  keyPrefix: string,
  context: MarkdownRenderContext,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|~~[^~]+~~|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}:${match.index}`;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
    if (link?.[1] && link[2]) {
      const target = resolveMarkdownLinkTarget(link[2], context.basePath);
      nodes.push(
        <a
          key={key}
          href={target.href}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => {
            if (target.kind === "invalid") {
              return;
            }
            event.preventDefault();
            if (target.kind === "path") {
              void context.onOpenPath?.(target.value);
            } else {
              void context.onOpenUrl?.(target.value);
            }
          }}
          style={linkStyle}
        >
          {link[1]}
        </a>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key} style={inlineCodeStyle}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("~~")) {
      nodes.push(<del key={key}>{token.slice(2, -2)}</del>);
    } else if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

function renderListItemContent(
  item: string,
  keyPrefix: string,
  context: MarkdownRenderContext,
): ReactNode {
  const task = /^\[( |x|X)\]\s+(.+)$/.exec(item);
  if (!task?.[2]) {
    return renderInlineMarkdown(item, keyPrefix, context);
  }
  return (
    <span data-view="markdown-task-item" style={taskItemStyle}>
      <input
        type="checkbox"
        checked={task[1]?.toLowerCase() === "x"}
        readOnly
        tabIndex={-1}
        style={taskCheckboxStyle}
      />
      <span>{renderInlineMarkdown(task[2], `${keyPrefix}:task`, context)}</span>
    </span>
  );
}

function sanitizeMarkdownUrl(url: string): string {
  const trimmed = url.trim();
  if (/^javascript:/i.test(trimmed)) {
    return "#";
  }
  return trimmed || "#";
}

type MarkdownLinkTarget =
  | { kind: "url"; value: string; href: string }
  | { kind: "path"; value: string; href: string }
  | { kind: "invalid"; value: string; href: string };

function resolveMarkdownLinkTarget(target: string, basePath: string | undefined): MarkdownLinkTarget {
  const sanitized = sanitizeMarkdownUrl(target);
  if (sanitized === "#") {
    return { kind: "invalid", value: sanitized, href: sanitized };
  }
  if (isExternalMarkdownUrl(sanitized)) {
    return { kind: "url", value: sanitized, href: sanitized };
  }
  const resolvedPath = resolveLocalMarkdownPath(sanitized, basePath);
  if (resolvedPath) {
    return { kind: "path", value: resolvedPath, href: toLocalAssetUrl(resolvedPath) };
  }
  return { kind: "url", value: sanitized, href: sanitized };
}

function resolveMarkdownImageSrc(target: string, basePath: string | undefined): string {
  const sanitized = sanitizeMarkdownUrl(target);
  if (sanitized === "#" || isExternalMarkdownUrl(sanitized)) {
    return sanitized;
  }
  const resolvedPath = resolveLocalMarkdownPath(sanitized, basePath);
  return resolvedPath ? toLocalAssetUrl(resolvedPath) : sanitized;
}

function resolveLocalMarkdownPath(target: string, basePath: string | undefined): string | undefined {
  if (isAbsoluteLocalPath(target)) {
    return normalizeLocalPath(target);
  }
  if (!basePath || isExternalMarkdownUrl(target)) {
    return undefined;
  }
  return joinLocalPath(basePath, target);
}

function documentBasePath(documentPath: string | undefined): string | undefined {
  const normalizedPath = documentPath?.trim();
  if (!normalizedPath || isExternalMarkdownUrl(normalizedPath)) {
    return undefined;
  }
  const pathWithoutQuery = normalizedPath.split(/[?#]/)[0] ?? normalizedPath;
  if (pathWithoutQuery.endsWith("/") || pathWithoutQuery.endsWith("\\")) {
    return pathWithoutQuery.replace(/[\\/]+$/, "");
  }
  const separatorIndex = Math.max(pathWithoutQuery.lastIndexOf("/"), pathWithoutQuery.lastIndexOf("\\"));
  if (separatorIndex <= 0) {
    return undefined;
  }
  return pathWithoutQuery.slice(0, separatorIndex);
}

function isExternalMarkdownUrl(target: string): boolean {
  return /^(https?:|mailto:|data:image\/|blob:)/i.test(target);
}

function isAbsoluteLocalPath(target: string): boolean {
  return target.startsWith("/") || /^[A-Za-z]:[\\/]/.test(target) || target.startsWith("\\\\");
}

function joinLocalPath(basePath: string, target: string): string {
  const separator = basePath.includes("\\") && !basePath.includes("/") ? "\\" : "/";
  const combined = `${basePath.replace(/[\\/]+$/, "")}${separator}${target}`;
  return normalizeLocalPath(combined);
}

function normalizeLocalPath(target: string): string {
  const usesBackslash = target.includes("\\") && !target.includes("/");
  const separator = usesBackslash ? "\\" : "/";
  const normalized = target.replace(/\\/g, "/");
  const root = normalized.startsWith("/")
    ? "/"
    : /^[A-Za-z]:\//.test(normalized)
    ? normalized.slice(0, 3)
    : "";
  const rest = root ? normalized.slice(root.length) : normalized;
  const parts: string[] = [];
  for (const part of rest.split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  const joined = `${root}${parts.join("/")}`;
  return usesBackslash ? joined.replace(/\//g, separator) : joined;
}

function toLocalAssetUrl(filePath: string): string {
  const internals = (
    globalThis as {
      window?: { __TAURI_INTERNALS__?: { convertFileSrc?: (path: string, protocol?: string) => string } };
      __TAURI_INTERNALS__?: { convertFileSrc?: (path: string, protocol?: string) => string };
    }
  ).window?.__TAURI_INTERNALS__ ?? (
    globalThis as { __TAURI_INTERNALS__?: { convertFileSrc?: (path: string, protocol?: string) => string } }
  ).__TAURI_INTERNALS__;

  if (typeof internals?.convertFileSrc === "function") {
    return internals.convertFileSrc(filePath);
  }

  const normalizedPath = filePath.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(normalizedPath)) {
    return `file:///${encodeURI(normalizedPath)}`;
  }
  if (normalizedPath.startsWith("/")) {
    return `file://${encodeURI(normalizedPath)}`;
  }
  return normalizedPath;
}

function parseMarkdownTable(
  lines: string[],
  startIndex: number,
): { headers: string[]; rows: string[][]; nextIndex: number } | undefined {
  const headerLine = lines[startIndex]?.trim();
  const separatorLine = lines[startIndex + 1]?.trim();
  if (!headerLine || !separatorLine || !isTableRow(headerLine) || !isTableSeparator(separatorLine)) {
    return undefined;
  }

  const headers = splitTableRow(headerLine);
  if (headers.length === 0) {
    return undefined;
  }

  const rows: string[][] = [];
  let nextIndex = startIndex + 2;
  while (nextIndex < lines.length) {
    const line = lines[nextIndex]?.trim() ?? "";
    if (!isTableRow(line) || isTableSeparator(line)) {
      break;
    }
    rows.push(splitTableRow(line));
    nextIndex += 1;
  }

  return { headers, rows, nextIndex };
}

function isTableRow(line: string): boolean {
  return line.includes("|") && splitTableRow(line).length > 1;
}

function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

const documentStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "18px",
  borderRadius: "10px",
  background: "rgba(255, 255, 255, 0.92)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
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

const listItemStyle: CSSProperties = {
  paddingLeft: "2px",
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

const inlineCodeStyle: CSSProperties = {
  padding: "1px 4px",
  borderRadius: "5px",
  background: "rgba(226, 232, 240, 0.78)",
  fontSize: "0.92em",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

const blockquoteStyle: CSSProperties = {
  margin: 0,
  padding: "2px 0 2px 12px",
  boxShadow: "inset 3px 0 0 rgba(148, 163, 184, 0.45)",
  color: "#475569",
};

const dividerStyle: CSSProperties = {
  width: "100%",
  height: "1px",
  margin: "2px 0",
  border: 0,
  background: "rgba(148, 163, 184, 0.28)",
};

const linkStyle: CSSProperties = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 600,
};

const taskItemStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: "7px",
};

const taskCheckboxStyle: CSSProperties = {
  width: "13px",
  height: "13px",
  margin: 0,
  transform: "translateY(2px)",
};

const imageFigureStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  margin: 0,
};

const imageStyle: CSSProperties = {
  maxWidth: "100%",
  borderRadius: "8px",
  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.12)",
};

const imageCaptionStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "11px",
};

const tableScrollStyle: CSSProperties = {
  overflowX: "auto",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "12px",
};

const tableHeaderCellStyle: CSSProperties = {
  padding: "8px 10px",
  textAlign: "left",
  color: "#0f172a",
  fontWeight: 700,
  background: "rgba(241, 245, 249, 0.92)",
  boxShadow: "inset 0 -1px 0 rgba(148, 163, 184, 0.28)",
};

const tableCellStyle: CSSProperties = {
  padding: "8px 10px",
  color: "#334155",
  boxShadow: "inset 0 -1px 0 rgba(148, 163, 184, 0.2)",
};

function headingStyle(level: MarkdownHeadingLevel): CSSProperties {
  return {
    margin: 0,
    fontSize: level === 1 ? "20px" : level === 2 ? "16px" : level === 3 ? "14px" : "13px",
    fontWeight: 700,
    lineHeight: 1.35,
  };
}
