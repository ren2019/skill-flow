import ampIcon from "../assets/AgentIcons/amp.svg";
import claudeCodeIcon from "../assets/AgentIcons/claude-code.svg";
import clawdbotIcon from "../assets/AgentIcons/clawdbot.svg";
import clineIcon from "../assets/AgentIcons/cline.svg";
import codexIcon from "../assets/AgentIcons/codex.svg";
import copilotIcon from "../assets/AgentIcons/copilot.svg";
import cursorIcon from "../assets/AgentIcons/cursor.svg";
import geminiIcon from "../assets/AgentIcons/gemini.svg";
import kiroCliIcon from "../assets/AgentIcons/kiro-cli.svg";
import opencodeIcon from "../assets/AgentIcons/opencode.svg";
import rooIcon from "../assets/AgentIcons/roo.svg";
import windsurfIcon from "../assets/AgentIcons/windsurf.svg";

type AgentIconProps = {
  targetId: string;
  shortLabel?: string | undefined;
  title?: string | undefined;
  size?: number;
  imageSize?: number;
  borderRadius?: number | string;
  background?: string;
};

const agentIconByTargetId: Record<string, string> = {
  amp: ampIcon,
  "claude-code": claudeCodeIcon,
  cline: clineIcon,
  codex: codexIcon,
  cursor: cursorIcon,
  "gemini-cli": geminiIcon,
  "github-copilot": copilotIcon,
  kiro: kiroCliIcon,
  opencode: opencodeIcon,
  openclaw: clawdbotIcon,
  "roo-code": rooIcon,
  windsurf: windsurfIcon,
};

export function AgentIcon({
  targetId,
  shortLabel,
  title,
  size = 34,
  imageSize = 22,
  borderRadius = "12px",
  background = "linear-gradient(135deg, rgba(14, 116, 144, 0.16), rgba(59, 130, 246, 0.12))",
}: AgentIconProps) {
  const icon = agentIconByTargetId[targetId];
  return (
    <span
      aria-label={title ?? targetId}
      data-target-id={targetId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius,
        background,
        color: "#0f172a",
        fontSize: size <= 20 ? "11px" : "12px",
        fontWeight: 700,
      }}
    >
      {icon ? (
        <img
          alt=""
          aria-hidden="true"
          src={icon}
          style={{
            display: "block",
            width: `${imageSize}px`,
            height: `${imageSize}px`,
            objectFit: "contain",
          }}
        />
      ) : (
        shortLabel ?? targetId.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}
