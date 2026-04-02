import type { PropsWithChildren } from "react";

type DesktopMotionProps = PropsWithChildren<{
  as?: "div" | "section" | "span";
}>;

export function DesktopMotion({ as = "div", children }: DesktopMotionProps) {
  const Component = as;
  return <Component>{children}</Component>;
}
