interface ScrollTargetInput {
  containerTop: number;
  elementTop: number;
  scrollTop: number;
  offset: number;
}

interface SectionAnchor {
  id: string;
  top: number;
}

export function scrollTopForElement({ containerTop, elementTop, scrollTop, offset }: ScrollTargetInput): number {
  return Math.max(0, scrollTop + elementTop - containerTop - offset);
}

export function activeSectionForAnchor(sections: SectionAnchor[], anchorTop: number): string | undefined {
  let active = sections[0]?.id;
  for (const section of sections) {
    if (section.top > anchorTop) break;
    active = section.id;
  }
  return active;
}
