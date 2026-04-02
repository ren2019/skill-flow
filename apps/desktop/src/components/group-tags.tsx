type GroupTagsProps = {
  tags: string[];
};

export function GroupTags({ tags }: GroupTagsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label="Group tags"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        listStyle: "none",
        padding: 0,
        margin: 0,
      }}
    >
      {tags.map((tag) => (
        <li
          key={tag}
          style={{
            padding: "4px 8px",
            borderRadius: "999px",
            background: "rgba(226, 232, 240, 0.8)",
            color: "#334155",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
