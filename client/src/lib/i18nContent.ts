import revisions from "@content/i18n/source-revisions.json";
import { contentRevision } from "@/content/contentRevision";
import { knowledgeCatalog } from "@/content/knowledge";
import type {
  EducationEntry,
  PortfolioContent,
  ProfileContact,
  ProfileContent,
  ProjectEntry,
  ResearchEntry,
  SkillGroup,
  SiteContent,
  StarredRepo,
  TimelineLink,
} from "@/content";

export type Locale = "ko" | "en";

type EnglishProfileTranslations = Partial<Pick<ProfileContent, "name" | "status" | "headline" | "summaryLead" | "summary">> & {
  contacts?: Record<string, Partial<Pick<ProfileContact, "label">>>;
};

type EnglishSiteTranslations = Partial<Pick<SiteContent, "title" | "description">>;
type EnglishTimelineTranslations = Partial<Pick<EducationEntry, "degree" | "school" | "period" | "note" | "bullets">> & {
  links?: Array<Partial<Pick<TimelineLink, "label">>>;
};

export interface EnglishTranslations {
  locale: "en";
  site?: EnglishSiteTranslations;
  ui?: {
    nav?: Record<string, string>;
    labels?: Record<string, string>;
  };
  profile?: EnglishProfileTranslations;
  education?: EnglishTimelineTranslations[];
  research?: Record<string, Partial<Pick<ResearchEntry, "title" | "desc" | "body">>>;
  projects?: Record<string, Partial<Pick<ProjectEntry, "name" | "period" | "desc" | "metric" | "tags" | "metrics" | "evaluation" | "body">>>;
  skills?: Record<string, Partial<Pick<SkillGroup, "label" | "items">>>;
  starred?: Record<string, Partial<Pick<StarredRepo, "desc">>>;
  sourceHashes?: Record<string, string>;
}

export function createEnglishTranslations(): EnglishTranslations {
  return { locale: "en", ui: { nav: {}, labels: {} }, sourceHashes: {} };
}

function mergeArray<T>(base: T[], translated?: T[]): T[] {
  if (!translated) return base;
  return base.map((item, index) => translated[index] ?? item);
}

export function uiText(translations: EnglishTranslations, key: string, fallback: string): string {
  return translations.ui?.labels?.[key] || fallback;
}

export function localizePortfolioContent(content: PortfolioContent, translations: EnglishTranslations, locale: Locale, verifiedRevisions: Record<string,string> = revisions): PortfolioContent {
  if (locale === "ko") return content;
  const profileTranslations = translations.profile ?? {};
  const { contacts: translatedContacts, summary: translatedSummary, ...profileTextTranslations } = profileTranslations;

  return {
    ...content,
    site: {
      ...content.site,
      ...translations.site,
      navigation: content.site.navigation.map((item) => ({
        ...item,
        label: translations.ui?.nav?.[item.id] || item.label,
      })),
    },
    profile: {
      ...content.profile,
      ...profileTextTranslations,
      summary: mergeArray(content.profile.summary, translatedSummary),
      contacts: content.profile.contacts.map((contact) => ({ ...contact, ...(translatedContacts?.[contact.id] ?? {}) })),
    },
    education: content.education.map((item, index) => {
      if (verifiedRevisions[item.id ?? `education:${index}`] !== contentRevision(item)) return item;
      const translated = translations.education?.[index];
      if (!translated) return item;
      const { bullets, links, ...textFields } = translated;
      return {
        ...item,
        ...textFields,
        bullets: mergeArray(item.bullets, bullets),
        links: item.links.map((link, linkIndex) => ({ ...link, ...(links?.[linkIndex] ?? {}) })),
      };
    }),
    research: content.research.map((item) => verifiedRevisions[`research:${item.slug}`] === contentRevision(item) ? ({ ...item, ...(translations.research?.[item.slug] ?? {}) }) : item),
    projects: content.projects.map((item) => {
      if (verifiedRevisions[`project:${item.slug}`] !== contentRevision(item)) return item;
      const translated = translations.projects?.[item.slug];
      if (!translated) return item;
      const { tags, metrics, evaluation, ...textFields } = translated;
      return {
        ...item,
        ...textFields,
        tags: mergeArray(item.tags, tags),
        metrics: mergeArray(item.metrics, metrics),
        evaluation: evaluation ? { ...item.evaluation, ...evaluation } : item.evaluation,
      };
    }),
    skills: content.skills.map((item) => {
      const domain = knowledgeCatalog.domains.find(d => d.title.ko === item.label);
      if (domain) return { label: domain.title.en, items: item.items.map(name => knowledgeCatalog.nodes.find(n => (n.stack ?? n.label.ko) === name)?.label.en ?? name) };
      const translated = translations.skills?.[item.label];
      return translated ? { ...item, ...translated, items: mergeArray(item.items, translated.items) } : item;
    }),
    starred: content.starred.map((item) => ({ ...item, ...(translations.starred?.[item.name] ?? {}) })),
  };
}
