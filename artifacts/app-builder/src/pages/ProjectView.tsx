import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { ProjectLayout } from "@/components/ProjectLayout";
import { ProjectHeader } from "@/components/ProjectHeader";
import { ChatPanel } from "@/components/ChatPanel";
import { PreviewPanel } from "@/components/PreviewPanel";
import { useGetProject } from "@workspace/api-client-react";
import { Loader2, AlertCircle } from "lucide-react";

export interface SelectedElement {
  tag: string;
  id: string;
  selector: string;
  text: string;
  rect: { x: number; y: number; w: number; h: number };
}

export default function ProjectView() {
  const [, params] = useRoute("/project/:id");
  const projectId = params?.id ? parseInt(params.id, 10) : null;
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);

  const { data: project, isLoading, isError, error, refetch } = useGetProject(projectId as number, {
    query: { enabled: !!projectId } as any,
  });

  // Re-fetch project after a build completes so Files/Code tabs get fresh previewHtml
  useEffect(() => {
    const handle = (e: Event) => {
      const { projectId: pid } = (e as CustomEvent<{ projectId: number }>).detail;
      if (pid === projectId) {
        setTimeout(() => refetch(), 600);
      }
    };
    window.addEventListener("builder-preview-updated", handle);
    return () => window.removeEventListener("builder-preview-updated", handle);
  }, [projectId, refetch]);

  if (!projectId) return null;

  if (isLoading) {
    return (
      <ProjectLayout>
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0f]">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-3" />
          <p className="text-slate-500 text-sm" style={{ fontFamily: "'Rubik', sans-serif" }}>
            טוען סביבת עבודה...
          </p>
        </div>
      </ProjectLayout>
    );
  }

  if (isError || !project) {
    return (
      <ProjectLayout>
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0f] gap-3">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-slate-400 text-sm" style={{ fontFamily: "'Rubik', sans-serif" }}>
            {(error as any)?.message || "הפרויקט לא נמצא"}
          </p>
        </div>
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout>
      {/* Slim project header — GitHub + Publish as primary actions */}
      <ProjectHeader project={project} />

      {/* Main workspace: Chat (left) | Preview (right) */}
      <div className="flex flex-1 min-h-0 bg-[#0a0a0f]">

        {/* Chat — the assistant, the heart of the product */}
        <div className="w-full md:w-[44%] lg:w-[42%] flex-shrink-0 min-w-[340px] max-w-[520px] border-l border-white/[0.06]">
          <ChatPanel
            project={project}
            selectedElement={selectedElement}
            onClearSelection={() => setSelectedElement(null)}
          />
        </div>

        {/* Preview — the live result surface */}
        <div className="hidden md:flex flex-1 flex-col min-w-0">
          <PreviewPanel
            project={project}
            onElementSelected={setSelectedElement}
          />
        </div>
      </div>
    </ProjectLayout>
  );
}
