type EmptyStateProps = {
  title: string;
  subtitle: string;
};

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <section
      data-view="empty-state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        minHeight: "220px",
        padding: "20px",
        borderRadius: "20px",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        background: "rgba(255, 255, 255, 0.88)",
        textAlign: "center",
      }}
    >
      <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{title}</h2>
      <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>{subtitle}</p>
    </section>
  );
}
