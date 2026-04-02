import type { ReactNode } from "react";

type GroupCardProps = {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  children?: ReactNode;
};

export function GroupCard({ title, subtitle, meta, children }: GroupCardProps) {
  return (
    <article>
      <header>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
        {meta ? <div>{meta}</div> : null}
      </header>
      {children ? <section>{children}</section> : null}
    </article>
  );
}
