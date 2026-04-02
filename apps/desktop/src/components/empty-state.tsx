type EmptyStateProps = {
  title: string;
  subtitle: string;
};

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <section data-view="empty-state">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </section>
  );
}
