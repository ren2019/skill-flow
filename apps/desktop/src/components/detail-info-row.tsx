import type { CSSProperties } from "react";
import versionInfoIcon from "../assets/DetailIcons/detail-info-version.svg";
import wordCountInfoIcon from "../assets/DetailIcons/detail-info-word-count.svg";

type DetailInfoRowProps = {
  version?: string | undefined;
  documentContent?: string | undefined;
  fontSize?: number;
  emptyFallback?: boolean;
};

type DetailInfoItem = {
  id: "version" | "word-count";
  icon: string;
  text: string;
};

export function DetailInfoRow({
  version,
  documentContent,
  fontSize = 12,
  emptyFallback = true,
}: DetailInfoRowProps) {
  const items = detailInfoItems({ version, documentContent });

  if (items.length === 0 && !emptyFallback) {
    return null;
  }

  return (
    <span data-view="detail-info-row" style={infoRowStyle(fontSize)}>
      {items.length > 0 ? (
        items.map((item) => (
          <span key={item.id} data-detail-info-item={item.id} style={infoItemStyle}>
            <img src={item.icon} alt="" aria-hidden="true" style={infoIconStyle(fontSize)} />
            <span>{item.text}</span>
          </span>
        ))
      ) : (
        <span style={emptyInfoStyle}> </span>
      )}
    </span>
  );
}

export function detailInfoItems({
  version,
  documentContent,
}: {
  version?: string | undefined;
  documentContent?: string | undefined;
}): DetailInfoItem[] {
  const items: DetailInfoItem[] = [];
  const versionText = normalizedVersionText(version);
  if (versionText) {
    items.push({ id: "version", icon: versionInfoIcon, text: versionText });
  }
  const words = wordCount(documentContent);
  if (words !== undefined) {
    items.push({ id: "word-count", icon: wordCountInfoIcon, text: String(words) });
  }
  return items;
}

function normalizedVersionText(version: string | undefined): string | undefined {
  if (!version) {
    return undefined;
  }
  return version.toLowerCase().startsWith("v") ? version : `v${version}`;
}

function wordCount(content: string | undefined): number | undefined {
  const words = content?.trim().split(/\s+/).filter(Boolean) ?? [];
  return words.length > 0 ? words.length : undefined;
}

const infoRowStyle = (fontSize: number): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  minHeight: `${fontSize + 4}px`,
  minWidth: 0,
  color: "#64748b",
  fontSize: `${fontSize}px`,
  fontWeight: 500,
});

const infoItemStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  minWidth: 0,
};

const infoIconStyle = (fontSize: number): CSSProperties => ({
  width: `${Math.max(10, fontSize)}px`,
  height: `${Math.max(10, fontSize)}px`,
  opacity: 0.68,
});

const emptyInfoStyle: CSSProperties = {
  color: "transparent",
};
