import { useEffect } from "react";
import { renderGraph3D } from "@/components/knowledgeGraph3d/renderGraph3D";
import { HomeView } from "@/pages/Home";
export { renderGraph3D } from "@/components/knowledgeGraph3d/renderGraph3D";

export default function KnowledgeGraph3DPreview() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    meta.setAttribute("data-design-preview", "true");
    document.head.appendChild(meta);
    const url = new URL(window.location.href);
    url.searchParams.delete("graph");
    window.history.replaceState(null, "", url);
    return () => meta.remove();
  }, []);
  return <HomeView renderKnowledgeGraph={renderGraph3D} />;
}
