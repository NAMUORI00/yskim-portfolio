import type { PortfolioContent } from './types';
import { knowledgeCatalog, knowledgeRecords } from './knowledge';
import { RELATIONS } from './knowledgeTypes';

export function validateKnowledge(content: PortfolioContent, read: (path:string)=>string): string[] {
 const errors:string[]=[];
 const nodes=new Map(knowledgeCatalog.nodes.map(n=>[n.id,n]));
 if(nodes.size!==knowledgeCatalog.nodes.length) errors.push('Duplicate knowledge id');
 const names=new Set<string>();
 for(const n of Array.from(nodes.values())) {
  if(!knowledgeCatalog.domains.some(d=>d.id===n.domain)) errors.push(`Unknown domain: ${n.id}`);
  const name=(n.stack??n.label.ko).trim().toLowerCase();
  if(names.has(name)) errors.push(`Duplicate canonical name: ${name}`); names.add(name);
 }
 const records=knowledgeRecords(content,false);
 const timelineIds=content.education.flatMap(e=>e.id?[e.id]:[]);
 if(new Set(timelineIds).size!==timelineIds.length) errors.push('Duplicate timeline id');
 const textFor=(id:string):string=> {
  if(id.startsWith('project:')||id.startsWith('research:')) {
   const [kind,slug]=id.split(':'); const e=(kind==='project'?content.projects:content.research).find(e=>e.slug===slug);
   if(!e){errors.push(`Missing source: ${id}`);return '';}
   const {knowledge,...rest}=e;
   return read(`content/${kind==='project'?'projects':'research'}/${slug}.mdx`).replace(/^knowledge:.*$/m,'');
  }
  const entry=content.education.find(e=>e.id===id);
  if(entry){const {knowledge,...rest}=entry;return Object.values(rest).flat().filter(v=>typeof v==='string').join('\n');}
  const def=knowledgeCatalog.sources.find(s=>s.id===id);
  if(!def){errors.push(`Unknown evidence: ${id}`);return '';}
  return def.files.map(path=>{try{return read(path);}catch{errors.push(`Missing file: ${path}`);return '';}}).join('\n');
 };
 const seenEdges=new Set<string>();
 for(const [source,record] of Object.entries(records)) {
  const text=textFor(source).replace(/\r\n/g,'\n');
  const claimed=new Set(record.claims.map(c=>c.node));
  for(const c of record.claims) {
   if(!['built','studied','interest','listed'].includes(c.mode)) errors.push(`${source}: invalid claim mode`);
   if(!nodes.has(c.node)) errors.push(`${source}: unknown node ${c.node}`);
   if(!text.includes(c.quote)) errors.push(`${source}/${c.node}: stale quote ${c.quote}`);
  }
  for(const e of record.relations) {
   if(!RELATIONS.includes(e.relation)) errors.push(`${source}: invalid relation type`);
   if(e.relation==='uses' && nodes.get(e.to)?.kind!=='tech') errors.push(`${source}: uses must target technology`);
   if(e.relation==='implements' && (nodes.get(e.from)?.kind!=='method'||nodes.get(e.to)?.kind!=='concept')) errors.push(`${source}: implements must connect method to concept`);
   if(!nodes.has(e.from)||!nodes.has(e.to)||e.from===e.to) errors.push(`${source}: invalid edge ${e.from}/${e.to}`);
   if(!claimed.has(e.from)&&!claimed.has(e.to)) errors.push(`${source}: edge has no source claim`);
   if(!text.includes(e.quote)) errors.push(`${source}: stale relation quote ${e.from}/${e.to}`);
   const key=[e.from,e.to].sort().join(':'); if(seenEdges.has(key)) errors.push(`Duplicate relation: ${key}`);seenEdges.add(key);
  }
 }
 for(const entry of [...content.projects,...content.research]) if(entry.status==='published'&&!entry.knowledge?.claims.length) errors.push(`Published entry lacks knowledge: ${entry.slug}`);
 return errors;
}
