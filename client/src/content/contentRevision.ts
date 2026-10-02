/** Stable, non-security hash used only to detect stale translations. */
export function contentRevision(entry: unknown): string {
 const {knowledge,...text}=entry as Record<string,unknown>;
 const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
   : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])) : value;
 const value=JSON.stringify(canonical(text));
 let hash=2166136261;
 for(let i=0;i<value.length;i++) hash=Math.imul(hash^value.charCodeAt(i),16777619);
 return (hash>>>0).toString(16);
}
