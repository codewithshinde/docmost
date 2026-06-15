import React from "react";

const MENTION_REGEX = /@\[([^\]]+)\]\(([0-9a-fA-F-]+)\)/g;

export function renderMessageContent(
  content: string | null | undefined,
  mentionClassName: string,
): React.ReactNode {
  if (!content) return null;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  MENTION_REGEX.lastIndex = 0;
  while ((match = MENTION_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(content.slice(lastIndex, match.index));
    }
    nodes.push(
      <span key={`mention-${key++}`} className={mentionClassName}>
        @{match[1]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }

  return nodes;
}

export function extractMentionUserIds(content: string): string[] {
  const ids = new Set<string>();
  let match: RegExpExecArray | null;
  MENTION_REGEX.lastIndex = 0;
  while ((match = MENTION_REGEX.exec(content)) !== null) {
    ids.add(match[2]);
  }
  return Array.from(ids);
}
