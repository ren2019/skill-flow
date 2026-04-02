type MarkdownDocumentProps = {
  title?: string;
  source: string;
};

export function MarkdownDocument({ title = "README", source }: MarkdownDocumentProps) {
  return (
    <article
      data-testid="markdown-document"
      style={{
        display: "grid",
        gap: "12px",
        padding: "18px",
        borderRadius: "18px",
        background: "rgba(255, 255, 255, 0.92)",
        border: "1px solid rgba(148, 163, 184, 0.18)",
      }}
    >
      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{title}</h3>
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          fontSize: "12px",
          lineHeight: 1.6,
          color: "#0f172a",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {source}
      </pre>
    </article>
  );
}
