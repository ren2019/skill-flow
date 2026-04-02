type GroupTagsProps = {
  tags: string[];
};

export function GroupTags({ tags }: GroupTagsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul aria-label="Group tags">
      {tags.map((tag) => (
        <li key={tag}>{tag}</li>
      ))}
    </ul>
  );
}
