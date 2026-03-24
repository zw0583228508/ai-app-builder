import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export interface ProjectFile {
  id: number;
  projectId: number;
  path: string;
  content: string;
  language: string;
  isEntrypoint: boolean;
  createdAt: string;
  updatedAt: string;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export function useProjectFiles(projectId: number | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    const handler = (e: Event) => {
      const { projectId: pid } = (e as CustomEvent<{ projectId: number }>).detail;
      if (pid === projectId) {
        qc.invalidateQueries({ queryKey: ["project-files", projectId] });
      }
    };
    window.addEventListener("builder-files-updated", handler);
    return () => window.removeEventListener("builder-files-updated", handler);
  }, [projectId, qc]);

  return useQuery({
    queryKey: ["project-files", projectId],
    queryFn: () => apiFetch<{ files: ProjectFile[] }>(`/api/projects/${projectId}/files`).then(r => r.files),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useUpsertProjectFile(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { path: string; content: string; language?: string; isEntrypoint?: boolean }) =>
      apiFetch<{ file: ProjectFile }>(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: JSON.stringify(vars),
      }).then(r => r.file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-files", projectId] }),
  });
}

export function useUpdateProjectFile(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { fileId: number; content: string; language?: string }) =>
      apiFetch<{ file: ProjectFile }>(`/api/projects/${projectId}/files/${vars.fileId}`, {
        method: "PUT",
        body: JSON.stringify({ content: vars.content, language: vars.language }),
      }).then(r => r.file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-files", projectId] }),
  });
}

export function useDeleteProjectFile(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: number) =>
      apiFetch<{ ok: boolean }>(`/api/projects/${projectId}/files/${fileId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-files", projectId] }),
  });
}
