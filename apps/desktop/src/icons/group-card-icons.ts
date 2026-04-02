import downloadIcon from "../assets/GroupCardIcons/group-metadata-download.svg";
import githubIcon from "../assets/GroupCardIcons/group-metadata-github.svg";
import localFileIcon from "../assets/GroupCardIcons/group-metadata-local-file.svg";
import skillsIcon from "../assets/GroupCardIcons/group-metadata-skills.svg";
import starIcon from "../assets/GroupCardIcons/group-metadata-star.svg";

export type GroupCardIconId = "download" | "github" | "local-file" | "skills" | "star";

const iconMap: Record<GroupCardIconId, string> = {
  download: downloadIcon,
  github: githubIcon,
  "local-file": localFileIcon,
  skills: skillsIcon,
  star: starIcon,
};

export function resolveGroupCardIcon(iconId: GroupCardIconId): string {
  return iconMap[iconId];
}
