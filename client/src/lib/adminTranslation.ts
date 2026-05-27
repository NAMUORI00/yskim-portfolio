import type { EducationEntry, NoteEntry, ProfileContent, ProjectEntry, ResearchEntry, SkillGroup, SiteContent, StarredRepo } from "@/content";
import { createEnglishTranslations, type EnglishTranslations } from "./i18nContent";

export type TranslationSource =
  | { kind: "site"; value: SiteContent }
  | { kind: "profile"; value: ProfileContent }
  | { kind: "education"; value: EducationEntry[] }
  | { kind: "project"; value: ProjectEntry }
  | { kind: "research"; value: ResearchEntry }
  | { kind: "skills"; value: SkillGroup[] }
  | { kind: "starred"; value: StarredRepo[] }
  | { kind: "note"; value: NoteEntry };

export interface TranslationEntry {
  key: string;
  label: string;
  text: string;
}

export interface TranslationStats {
  total: number;
  translated: number;
  stale: number;
}

export function sourceHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function entry(key: string, label: string, text: string): TranslationEntry[] {
  const clean = text.trim();
  return clean ? [{ key, label, text }] : [];
}

function encodeKeySegment(value: string): string {
  return encodeURIComponent(value).replace(/\./g, "%2E");
}

function decodeKeySegment(value: string): string {
  return decodeURIComponent(value);
}

export function buildTranslationEntries(source: TranslationSource): TranslationEntry[] {
  if (source.kind === "site") {
    return [
      ...entry("site.title", "Site title", source.value.title),
      ...entry("site.description", "Site description", source.value.description),
      ...source.value.navigation.flatMap((item) => entry(`site.navigation.${encodeKeySegment(item.id)}.label`, `Navigation: ${item.label}`, item.label)),
    ];
  }

  if (source.kind === "profile") {
    return [
      ...entry("profile.name", "Profile name", source.value.name),
      ...entry("profile.status", "Profile status", source.value.status),
      ...entry("profile.headline", "Profile headline", source.value.headline),
      ...entry("profile.summaryLead", "Profile lead", source.value.summaryLead),
      ...source.value.summary.flatMap((paragraph, index) => entry(`profile.summary.${index}`, `Profile paragraph ${index + 1}`, paragraph)),
      ...source.value.contacts.flatMap((contact) =>
        entry(`profile.contacts.${encodeKeySegment(contact.id)}.label`, `Contact label: ${contact.label}`, contact.label),
      ),
    ];
  }

  if (source.kind === "education") {
    return source.value.flatMap((item, index) => [
      ...entry(`education.${index}.degree`, `Timeline ${index + 1} degree`, item.degree),
      ...entry(`education.${index}.school`, `Timeline ${index + 1} school`, item.school),
      ...entry(`education.${index}.period`, `Timeline ${index + 1} period`, item.period),
      ...entry(`education.${index}.note`, `Timeline ${index + 1} note`, item.note),
      ...item.bullets.flatMap((bullet, bulletIndex) => entry(`education.${index}.bullets.${bulletIndex}`, `Timeline ${index + 1} bullet ${bulletIndex + 1}`, bullet)),
      ...item.links.flatMap((link, linkIndex) => entry(`education.${index}.links.${linkIndex}.label`, `Timeline ${index + 1} link ${linkIndex + 1}`, link.label)),
    ]);
  }

  if (source.kind === "project") {
    const slug = source.value.slug;
    return [
      ...entry(`projects.${slug}.name`, "Project name", source.value.name),
      ...entry(`projects.${slug}.period`, "Project period", source.value.period),
      ...entry(`projects.${slug}.desc`, "Project description", source.value.desc),
      ...entry(`projects.${slug}.metric`, "Project metric", source.value.metric),
      ...source.value.tags.flatMap((tag, index) => entry(`projects.${slug}.tags.${index}`, `Project tag ${index + 1}`, tag)),
      ...entry(`projects.${slug}.body`, "Project body", source.value.body),
    ];
  }

  if (source.kind === "research") {
    const slug = source.value.slug;
    return [
      ...entry(`research.${slug}.title`, "Research title", source.value.title),
      ...entry(`research.${slug}.desc`, "Research description", source.value.desc),
      ...entry(`research.${slug}.body`, "Research body", source.value.body),
    ];
  }

  if (source.kind === "skills") {
    return source.value.flatMap((group) => {
      const groupKey = encodeKeySegment(group.label);
      return [
        ...entry(`skills.${groupKey}.label`, `Skill group: ${group.label}`, group.label),
        ...group.items.flatMap((item, index) => entry(`skills.${groupKey}.items.${index}`, `${group.label} skill ${index + 1}`, item)),
      ];
    });
  }

  if (source.kind === "starred") {
    return source.value.flatMap((repo) =>
      entry(`starred.${encodeKeySegment(repo.name)}.desc`, `Starred repository: ${repo.name}`, repo.desc),
    );
  }

  const slug = source.value.slug;
  return [
    ...entry(`notes.${slug}.title`, "Note title", source.value.title),
    ...entry(`notes.${slug}.date`, "Note date", source.value.date),
    ...entry(`notes.${slug}.summary`, "Note summary", source.value.summary),
    ...source.value.tags.flatMap((tag, index) => entry(`notes.${slug}.tags.${index}`, `Note tag ${index + 1}`, tag)),
    ...entry(`notes.${slug}.body`, "Note body", source.value.body),
  ];
}

function cloneTranslations(translations: EnglishTranslations): EnglishTranslations {
  return {
    ...createEnglishTranslations(),
    ...translations,
    site: translations.site ? { ...translations.site } : undefined,
    ui: { ...translations.ui, nav: { ...translations.ui?.nav }, labels: { ...translations.ui?.labels } },
    profile: translations.profile
      ? {
          ...translations.profile,
          summary: [...(translations.profile.summary ?? [])],
          contacts: Object.fromEntries(Object.entries(translations.profile.contacts ?? {}).map(([key, value]) => [key, { ...value }])),
        }
      : undefined,
    education: translations.education?.map((item) => ({ ...item, bullets: item.bullets ? [...item.bullets] : undefined, links: item.links?.map((link) => ({ ...link })) })),
    research: Object.fromEntries(Object.entries(translations.research ?? {}).map(([key, value]) => [key, { ...value }])),
    projects: Object.fromEntries(Object.entries(translations.projects ?? {}).map(([key, value]) => [key, { ...value, tags: value.tags ? [...value.tags] : undefined }])),
    skills: Object.fromEntries(Object.entries(translations.skills ?? {}).map(([key, value]) => [key, { ...value, items: value.items ? [...value.items] : undefined }])),
    starred: Object.fromEntries(Object.entries(translations.starred ?? {}).map(([key, value]) => [key, { ...value }])),
    notes: Object.fromEntries(Object.entries(translations.notes ?? {}).map(([key, value]) => [key, { ...value, tags: value.tags ? [...value.tags] : undefined }])),
    sourceHashes: { ...translations.sourceHashes },
  };
}

function ensureArrayItem<T>(items: T[] | undefined, index: number, create: () => T): T[] {
  const next = [...(items ?? [])];
  while (next.length <= index) next.push(create());
  return next;
}

export function getTranslationValue(translations: EnglishTranslations, key: string): string {
  const parts = key.split(".");
  if (parts[0] === "site" && parts[1] === "navigation") return translations.ui?.nav?.[decodeKeySegment(parts[2])] ?? "";
  if (parts[0] === "site") return String(translations.site?.[parts[1] as keyof NonNullable<EnglishTranslations["site"]>] ?? "");
  if (parts[0] === "profile" && parts[1] === "contacts") return translations.profile?.contacts?.[decodeKeySegment(parts[2])]?.label ?? "";
  if (parts[0] === "profile" && parts[1] === "summary") return translations.profile?.summary?.[Number(parts[2])] ?? "";
  if (parts[0] === "profile") return String(translations.profile?.[parts[1] as keyof NonNullable<EnglishTranslations["profile"]>] ?? "");
  if (parts[0] === "education" && parts[2] === "bullets") return translations.education?.[Number(parts[1])]?.bullets?.[Number(parts[3])] ?? "";
  if (parts[0] === "education" && parts[2] === "links") return translations.education?.[Number(parts[1])]?.links?.[Number(parts[3])]?.label ?? "";
  if (parts[0] === "education") return String(translations.education?.[Number(parts[1])]?.[parts[2] as "degree" | "school" | "period" | "note"] ?? "");
  if (parts[0] === "projects" && parts[2] === "tags") return translations.projects?.[parts[1]]?.tags?.[Number(parts[3])] ?? "";
  if (parts[0] === "projects") return String(translations.projects?.[parts[1]]?.[parts[2] as keyof NonNullable<EnglishTranslations["projects"]>[string]] ?? "");
  if (parts[0] === "research") return String(translations.research?.[parts[1]]?.[parts[2] as keyof NonNullable<EnglishTranslations["research"]>[string]] ?? "");
  if (parts[0] === "skills" && parts[2] === "items") return translations.skills?.[decodeKeySegment(parts[1])]?.items?.[Number(parts[3])] ?? "";
  if (parts[0] === "skills") return String(translations.skills?.[decodeKeySegment(parts[1])]?.[parts[2] as keyof NonNullable<EnglishTranslations["skills"]>[string]] ?? "");
  if (parts[0] === "starred") return String(translations.starred?.[decodeKeySegment(parts[1])]?.[parts[2] as keyof NonNullable<EnglishTranslations["starred"]>[string]] ?? "");
  if (parts[0] === "notes" && parts[2] === "tags") return translations.notes?.[parts[1]]?.tags?.[Number(parts[3])] ?? "";
  if (parts[0] === "notes") return String(translations.notes?.[parts[1]]?.[parts[2] as keyof NonNullable<EnglishTranslations["notes"]>[string]] ?? "");
  return "";
}

function setTranslationValue(translations: EnglishTranslations, key: string, value: string) {
  const parts = key.split(".");
  if (parts[0] === "site") {
    if (parts[1] === "navigation") {
      translations.ui = translations.ui ?? {};
      translations.ui.nav = translations.ui.nav ?? {};
      translations.ui.nav[decodeKeySegment(parts[2])] = value;
    } else {
      translations.site = translations.site ?? {};
      translations.site[parts[1] as "title" | "description"] = value;
    }
  }
  if (parts[0] === "profile") {
    translations.profile = translations.profile ?? {};
    if (parts[1] === "contacts") {
      translations.profile.contacts = translations.profile.contacts ?? {};
      const contactId = decodeKeySegment(parts[2]);
      translations.profile.contacts[contactId] = translations.profile.contacts[contactId] ?? {};
      translations.profile.contacts[contactId].label = value;
    } else if (parts[1] === "summary") {
      translations.profile.summary = ensureArrayItem(translations.profile.summary, Number(parts[2]), () => "");
      translations.profile.summary[Number(parts[2])] = value;
    } else {
      translations.profile[parts[1] as "name" | "status" | "headline" | "summaryLead"] = value;
    }
  }
  if (parts[0] === "education") {
    translations.education = ensureArrayItem(translations.education, Number(parts[1]), () => ({}));
    const timeline = translations.education[Number(parts[1])];
    if (parts[2] === "bullets") {
      timeline.bullets = ensureArrayItem(timeline.bullets, Number(parts[3]), () => "");
      timeline.bullets[Number(parts[3])] = value;
    } else if (parts[2] === "links") {
      timeline.links = ensureArrayItem(timeline.links, Number(parts[3]), () => ({}));
      timeline.links[Number(parts[3])].label = value;
    } else {
      timeline[parts[2] as "degree" | "school" | "period" | "note"] = value;
    }
  }
  if (parts[0] === "projects") {
    translations.projects = translations.projects ?? {};
    const project = (translations.projects[parts[1]] = translations.projects[parts[1]] ?? {});
    if (parts[2] === "tags") {
      project.tags = ensureArrayItem(project.tags, Number(parts[3]), () => "");
      project.tags[Number(parts[3])] = value;
    } else {
      project[parts[2] as "name" | "period" | "desc" | "metric" | "body"] = value;
    }
  }
  if (parts[0] === "research") {
    translations.research = translations.research ?? {};
    translations.research[parts[1]] = translations.research[parts[1]] ?? {};
    translations.research[parts[1]][parts[2] as "title" | "desc" | "body"] = value;
  }
  if (parts[0] === "skills") {
    translations.skills = translations.skills ?? {};
    const groupKey = decodeKeySegment(parts[1]);
    const group = (translations.skills[groupKey] = translations.skills[groupKey] ?? {});
    if (parts[2] === "items") {
      group.items = ensureArrayItem(group.items, Number(parts[3]), () => "");
      group.items[Number(parts[3])] = value;
    } else {
      group.label = value;
    }
  }
  if (parts[0] === "starred") {
    translations.starred = translations.starred ?? {};
    const repo = (translations.starred[decodeKeySegment(parts[1])] = translations.starred[decodeKeySegment(parts[1])] ?? {});
    repo.desc = value;
  }
  if (parts[0] === "notes") {
    translations.notes = translations.notes ?? {};
    const note = (translations.notes[parts[1]] = translations.notes[parts[1]] ?? {});
    if (parts[2] === "tags") {
      note.tags = ensureArrayItem(note.tags, Number(parts[3]), () => "");
      note.tags[Number(parts[3])] = value;
    } else {
      note[parts[2] as "title" | "date" | "summary" | "body"] = value;
    }
  }
}

export function applyTranslationValues(
  translations: EnglishTranslations,
  entries: TranslationEntry[],
  values: Record<string, string>,
): EnglishTranslations {
  const next = cloneTranslations(translations);
  next.sourceHashes = next.sourceHashes ?? {};
  for (const item of entries) {
    if (!Object.prototype.hasOwnProperty.call(values, item.key)) continue;
    const value = values[item.key]?.trim() ?? "";
    setTranslationValue(next, item.key, value);
    if (value) {
      next.sourceHashes[item.key] = sourceHash(item.text);
    } else {
      delete next.sourceHashes[item.key];
    }
  }
  next.generatedAt = new Date().toISOString();
  return next;
}

export function translationStats(translations: EnglishTranslations, source: TranslationSource): TranslationStats {
  const entries = buildTranslationEntries(source);
  return entries.reduce<TranslationStats>(
    (stats, item) => {
      const translated = getTranslationValue(translations, item.key).trim();
      const stale = translated && translations.sourceHashes?.[item.key] && translations.sourceHashes[item.key] !== sourceHash(item.text);
      return {
        total: stats.total + 1,
        translated: stats.translated + (translated ? 1 : 0),
        stale: stats.stale + (stale ? 1 : 0),
      };
    },
    { total: 0, translated: 0, stale: 0 },
  );
}
