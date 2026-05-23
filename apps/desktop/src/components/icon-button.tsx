import type { CSSProperties, ReactNode } from "react";
import { resolveActionIcon, type ActionIconId } from "../icons/action-icons";

type IconButtonProps = {
  icon: ActionIconId;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: (() => void) | undefined;
  children?: ReactNode;
  "data-testid"?: string;
};

export function IconButton({
  icon,
  label,
  active = false,
  disabled = false,
  onClick,
  children,
  "data-testid": dataTestId,
}: IconButtonProps) {
  return (
    <button
      data-testid={dataTestId}
      data-action-icon={icon}
      type="button"
      aria-label={label}
      aria-pressed={active || undefined}
      disabled={disabled}
      onClick={onClick}
      style={buttonStyle(active, disabled)}
    >
      <img src={resolveActionIcon(icon)} alt="" aria-hidden="true" style={iconStyle} />
      <span style={srOnlyStyle}>{label}</span>
      {children}
    </button>
  );
}

const iconStyle: CSSProperties = {
  width: "14px",
  height: "14px",
  objectFit: "contain",
};

const srOnlyStyle: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

function buttonStyle(active: boolean, disabled: boolean): CSSProperties {
  return {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    border: "1px solid rgba(0, 0, 0, 0)",
    background: active ? "rgba(255, 255, 255, 0.72)" : "rgba(255, 255, 255, 0.55)",
    boxShadow: "0 6px 14px rgba(0, 0, 0, 0.08)",
    backdropFilter: "blur(8px)",
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "default" : "pointer",
  };
}
