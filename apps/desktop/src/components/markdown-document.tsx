type MarkdownDocumentProps = {
  title?: string;
  source: string;
};

export function MarkdownDocument({ title = "README", source }: MarkdownDocumentProps) {
  return (
    <article data-testid="markdown-document">
      <h3>{title}</h3>
      <p>{source}</p>
    </article>
  );
}
