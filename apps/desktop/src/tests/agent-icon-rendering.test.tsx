import ReactDOMServer from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentIcon } from "../components/agent-icon";

describe("agent icon rendering", () => {
  it("renders bundled SVG assets for known built-in agents", () => {
    const markup = ReactDOMServer.renderToStaticMarkup(
      <AgentIcon targetId="codex" shortLabel="CX" title="Codex" />,
    );

    expect(markup).toContain("data-target-id=\"codex\"");
    expect(markup).toContain("<img");
    expect(markup).not.toContain(">CX</span>");
  });

  it("falls back to the short label for custom agents", () => {
    const markup = ReactDOMServer.renderToStaticMarkup(
      <AgentIcon targetId="my-agent" shortLabel="MA" title="My Agent" />,
    );

    expect(markup).toContain("data-target-id=\"my-agent\"");
    expect(markup).toContain(">MA</span>");
  });
});
