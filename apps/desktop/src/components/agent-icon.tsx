type AgentIconProps = {
  targetId: string;
  shortLabel?: string;
  title?: string;
};

export function AgentIcon({ targetId, shortLabel, title }: AgentIconProps) {
  return (
    <span
      aria-label={title ?? targetId}
      data-target-id={targetId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "34px",
        height: "34px",
        borderRadius: "12px",
        background: "linear-gradient(135deg, rgba(14, 116, 144, 0.16), rgba(59, 130, 246, 0.12))",
        color: "#0f172a",
        fontSize: "12px",
        fontWeight: 700,
      }}
    >
      {shortLabel ?? targetId.slice(0, 2).toUpperCase()}
    </span>
  );
}
