import stackLayout from "@content/skills.json";
import catalog from "@content/knowledge/catalog.json";
import supplemental from "@content/knowledge/supplemental.json";
import type { PortfolioContent, KnowledgeRecord } from "./types";
import type { DomainDef, KnowledgeNodeDef, KnowledgeEdgeDef, EvidenceSourceDef } from "./knowledgeTypes";

export const knowledgeCatalog = catalog as unknown as { domains: DomainDef[]; nodes: Omit<KnowledgeNodeDef,"claims">[]; sources: EvidenceSourceDef[] };

export function knowledgeRecords(content: PortfolioContent, publicOnly = true): Record<string, KnowledgeRecord> {
  const records: Record<string, KnowledgeRecord> = {};
  for (const [id, record] of Object.entries(supplemental)) {
    const def = knowledgeCatalog.sources.find(s => s.id === id);
    const path = def?.href?.match(/^\/(projects|research)\/([^/#]+)/);
    if (publicOnly && path) {
      const entries = path[1] === "projects" ? content.projects : content.research;
      if (!entries.some(e => e.slug === path[2] && e.status === "published")) continue;
    }
    records[id] = record as KnowledgeRecord;
  }
  for (const [prefix, entries] of [["project", content.projects], ["research", content.research]] as const) {
    for (const entry of entries) if (entry.knowledge && (!publicOnly || entry.status === "published")) records[`${prefix}:${entry.slug}`] = entry.knowledge;
  }
  for (const entry of content.education) if (entry.id && entry.knowledge && (!publicOnly || entry.status === "published")) records[entry.id] = entry.knowledge;
  return records;
}

export function materializeKnowledge(content: PortfolioContent) {
  const records = knowledgeRecords(content);
  const nodes: KnowledgeNodeDef[] = knowledgeCatalog.nodes.map(def => ({...def, claims: Object.entries(records).flatMap(([source, r]) => r.claims.filter(c=>c.node===def.id).map(({node,...claim})=>({...claim,source})))}));
  const edges: KnowledgeEdgeDef[] = Object.entries(records).flatMap(([source,r])=>r.relations.map(e=>({...e,source})));
  return { nodes, edges };
}

/** Technical stack is a view of the same recorded knowledge, not a second editable inventory. */
export function knowledgeSkills(content: PortfolioContent) {
  const {nodes} = materializeKnowledge(content);
  const active = nodes.filter(n => (n.stack || n.kind === "tech") && n.claims.length);
  const names = new Set(active.map(n => n.stack ?? n.label.ko));
  const groups = stackLayout.map(g => ({label:g.label,items:g.label === "아이디어 구체화와 팀 개발 진행" ? [...g.items] : g.items.filter(name=>names.has(name))}));
  const placed = new Set(groups.flatMap(g=>g.items));
  const groupFor = {ml:0,retrieval:0,media:0,backend:1,frontend:1,data:2,device:3,infra:4};
  for(const node of active) { const name=node.stack ?? node.label.ko; if(!placed.has(name)) {groups[groupFor[node.domain]].items.push(name);placed.add(name);} }
  return groups.filter(g=>g.items.length);
}
