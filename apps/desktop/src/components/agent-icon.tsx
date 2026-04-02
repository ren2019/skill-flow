type AgentIconProps = {
  targetId: string;
  shortLabel?: string;
  title?: string;
};

export function AgentIcon({ targetId, shortLabel, title }: AgentIconProps) {
  return (
    <span aria-label={title ?? targetId} data-target-id={targetId}>
      {shortLabel ?? targetId.slice(0, 2).toUpperCase()}
    </span>
  );
}
