import {
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
  lazy,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useProjectFiles,
  useUpdateProjectFile,
  useUpsertProjectFile,
  useDeleteProjectFile,
} from "@/hooks/use-project-files";
import { useLocation } from "wouter";
import {
  RefreshCw,
  MonitorPlay,
  ExternalLink,
  Code2,
  Eye,
  Copy,
  Check,
  Download,
  Share2,
  Sparkles,
  ChevronDown,
  Github,
  Loader2,
  History,
  RotateCcw,
  Link2,
  MousePointerClick,
  Pencil,
  X as XIcon,
  FolderArchive,
  Rocket,
  Layers,
  SquareTerminal,
  Globe,
  Lock,
  Database,
  HardDrive,
  Bug,
  Gauge,
  Settings,
} from "lucide-react";
import { useCollabPresence } from "@/hooks/use-collab-presence";
import { ProjectWithMessages } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { readCapabilities } from "@/hooks/use-integrations";
import type { SelectedElement } from "@/pages/ProjectView";
import { ProjectFilesPanel } from "./ProjectFilesPanel";
const TerminalPanel = lazy(() =>
  import("./TerminalPanel").then((m) => ({ default: m.TerminalPanel })),
);
const SecretsPanel = lazy(() =>
  import("./SecretsPanel").then((m) => ({ default: m.SecretsPanel })),
);
const DatabasePanel = lazy(() =>
  import("./DatabasePanel").then((m) => ({ default: m.DatabasePanel })),
);
const StoragePanel = lazy(() =>
  import("./StoragePanel").then((m) => ({ default: m.StoragePanel })),
);
const DeployPanel = lazy(() =>
  import("./DeployPanel").then((m) => ({ default: m.DeployPanel })),
);
const TeamPanel = lazy(() =>
  import("./TeamPanel").then((m) => ({ default: m.TeamPanel })),
);
const UsagePanel = lazy(() =>
  import("./UsagePanel").then((m) => ({ default: m.UsagePanel })),
);
const ErrorsPanel = lazy(() =>
  import("./ErrorsPanel").then((m) => ({ default: m.ErrorsPanel })),
);
const PerformancePanel = lazy(() =>
  import("./PerformancePanel").then((m) => ({ default: m.PerformancePanel })),
);
const WhatsAppPanel = lazy(() =>
  import("./WhatsAppPanel").then((m) => ({ default: m.WhatsAppPanel })),
);
const PlannerPanel = lazy(() =>
  import("./PlannerPanel").then((m) => ({ default: m.PlannerPanel })),
);
const DeployBrainPanel = lazy(() =>
  import("./DeployBrainPanel").then((m) => ({ default: m.DeployBrainPanel })),
);
const QaPanel = lazy(() =>
  import("./QaPanel").then((m) => ({ default: m.QaPanel })),
);
const CostPanel = lazy(() =>
  import("./CostPanel").then((m) => ({ default: m.CostPanel })),
);
const RuntimePanel = lazy(() =>
  import("./RuntimePanel").then((m) => ({ default: m.RuntimePanel })),
);
const JobsPanel = lazy(() =>
  import("./JobsPanel").then((m) => ({ default: m.JobsPanel })),
);
const SaasGeneratorPanel = lazy(() =>
  import("./SaasGeneratorPanel").then((m) => ({
    default: m.SaasGeneratorPanel,
  })),
);
const OrchestratorPanel = lazy(() =>
  import("./OrchestratorPanel").then((m) => ({
    default: m.OrchestratorPanel,
  })),
);
import { PreviewToolsMenu } from "./PreviewToolsMenu";
import { PreviewExportMenu } from "./PreviewExportMenu";
import { PreviewShareDialog } from "./PreviewShareDialog";
import { PreviewHistoryMenu } from "./PreviewHistoryMenu";
import { DiffViewer } from "./DiffViewer";
import { ErrorBoundary } from "./ErrorBoundary";
import { DeviceSwitcher } from "./preview/DeviceSwitcher";
import { CollabPresenceBadge } from "./preview/CollabPresenceBadge";
import { EditModeBanner } from "./preview/EditModeBanner";
import { SnapshotBanner } from "./preview/SnapshotBanner";
import { PreviewFrame } from "./preview/PreviewFrame";
import { CodeEditorTab } from "./preview/CodeEditorTab";
import { trackPreviewUpdated, trackDeployAttempted } from "@/lib/telemetry";

const HE = "'Rubik', sans-serif";

interface PreviewPanelProps {
  project: ProjectWithMessages;
  onElementSelected?: (el: SelectedElement) => void;
}

interface SnapshotDiffStats {
  linesAdded: number;
  linesRemoved: number;
  changePercent: number;
  generationType: string;
  sectionsChanged: string[];
}

interface Snapshot {
  id: number;
  label: string;
  createdAt: string;
  snapshotType?: string | null;
  diffStats?: SnapshotDiffStats | null;
}

export function PreviewPanel({
  project,
  onElementSelected,
}: PreviewPanelProps) {
  const [, navigate] = useLocation();
  const isReactStack = project.stack === "react" || project.stack === "nextjs";
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    | "preview"
    | "code"
    | "files"
    | "terminal"
    | "secrets"
    | "database"
    | "storage"
    | "deploy"
    | "teams"
    | "usage"
    | "errors"
    | "performance"
    | "whatsapp"
    | "planner"
    | "orchestrate"
    | "deploy-brain"
    | "qa"
    | "cost"
    | "runtime"
    | "jobs"
    | "saas"
  >("preview");
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [gistLoading, setGistLoading] = useState(false);
  const [forkLoading, setForkLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Live streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveHtml, setLiveHtml] = useState<string | null>(null);
  const [liveLines, setLiveLines] = useState(0);

  // Tracks when a build just finished but project data hasn't re-fetched yet
  // Prevents "No preview yet" from flashing before the refetch completes
  const [pendingRefresh, setPendingRefresh] = useState(false);
  const pendingRefreshRef = useRef(false);

  // Brief "just updated" glow flash on the preview frame after a successful build
  const [justUpdated, setJustUpdated] = useState(false);
  const justUpdatedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // First-build "ready to share" celebration banner
  const [showReadyCelebration, setShowReadyCelebration] = useState(false);
  const celebrationShownRef = useRef(false);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Visual editing
  const [selectedEl, setSelectedEl] = useState<SelectedElement | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Responsive device preview
  type DeviceSize = "desktop" | "tablet" | "mobile";
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loadingSnaps, setLoadingSnaps] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [previewingSnap, setPreviewingSnap] = useState<number | null>(null);
  const [diffSnap, setDiffSnap] = useState<{
    id: number;
    label: string;
  } | null>(null);

  // Share
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [customSlug, setCustomSlug] = useState<string>(
    project.customSlug ?? "",
  );
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugSuccess, setSlugSuccess] = useState(false);

  // Real-time collaboration presence
  const { viewerCount, connected: collabConnected } = useCollabPresence(
    project.id,
  );

  // Netlify API deploy
  const [netlifyDeploying, setNetlifyDeploying] = useState(false);

  // Keep terminal mounted once opened
  const [terminalEverOpened, setTerminalEverOpened] = useState(false);

  // AI Error Fixer
  const [previewErrors, setPreviewErrors] = useState<
    {
      message: string;
      errorType: string;
      line?: number;
      dismissed?: boolean;
      autoFix?: {
        fix_description?: string;
        code_patch?: string;
        confidence?: string;
      };
    }[]
  >([]);

  // Monaco code editor — tracks live edits to the HTML
  const [editedHtml, setEditedHtml] = useState(project.previewHtml ?? "");
  const [codeSaving, setCodeSaving] = useState(false);
  const [codeSaved, setCodeSaved] = useState(false);
  useEffect(() => {
    setEditedHtml(project.previewHtml ?? "");
  }, [project.previewHtml]);

  // File tree & multi-file editor
  const { data: projectFiles = [] } = useProjectFiles(project.id);
  const updateFileMutation = useUpdateProjectFile(project.id);
  const upsertFileMutation = useUpsertProjectFile(project.id);
  const deleteFileMutation = useDeleteProjectFile(project.id);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [editedFileContent, setEditedFileContent] = useState("");
  const [fileSaved, setFileSaved] = useState(false);
  const selectedFile =
    projectFiles.find((f) => f.id === selectedFileId) ?? null;
  useEffect(() => {
    if (selectedFile) setEditedFileContent(selectedFile.content);
  }, [selectedFile?.id]);
  // Auto-select entrypoint when files load
  useEffect(() => {
    if (projectFiles.length > 0 && !selectedFileId) {
      const entry = projectFiles.find((f) => f.isEntrypoint) ?? projectFiles[0];
      setSelectedFileId(entry.id);
    }
  }, [projectFiles, selectedFileId]);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");

  // Tools dropdown menu
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const liveIframeRef = useRef<HTMLIFrameElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const liveUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHtmlRef = useRef<string>("");

  const showCodeTab =
    project.userMode === "builder" || project.userMode === "developer";

  const saveHtmlCode = useCallback(
    async (html: string) => {
      setCodeSaving(true);
      try {
        await fetch(`/api/projects/${project.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ previewHtml: html }),
        });
        setCodeSaved(true);
        setTimeout(() => setCodeSaved(false), 2000);
        setRefreshKey((k) => k + 1);
      } finally {
        setCodeSaving(false);
      }
    },
    [project.id],
  );

  const saveSelectedFile = useCallback(
    async (content: string) => {
      if (!selectedFile) return;
      await updateFileMutation.mutateAsync({
        fileId: selectedFile.id,
        content,
      });
      // If it's index.html / entrypoint, also sync to previewHtml
      if (selectedFile.isEntrypoint || selectedFile.path === "index.html") {
        await fetch(`/api/projects/${project.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ previewHtml: content }),
        });
        setRefreshKey((k) => k + 1);
      }
      setFileSaved(true);
      setTimeout(() => setFileSaved(false), 2000);
    },
    [selectedFile, updateFileMutation, project.id],
  );

  const createNewFile = useCallback(
    async (path: string) => {
      if (!path.trim()) return;
      const ext = path.split(".").pop()?.toLowerCase() ?? "txt";
      const language =
        {
          html: "html",
          css: "css",
          js: "javascript",
          jsx: "javascript",
          ts: "typescript",
          tsx: "typescript",
          json: "json",
          md: "markdown",
        }[ext] ?? "plaintext";
      const file = await upsertFileMutation.mutateAsync({
        path: path.trim(),
        content: "",
        language,
      });
      setSelectedFileId(file.id);
      setEditedFileContent("");
      setShowNewFileDialog(false);
      setNewFilePath("");
    },
    [upsertFileMutation],
  );

  // ── Close menus on outside click ──────────────────────────
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      )
        setShowExportMenu(false);
      if (historyRef.current && !historyRef.current.contains(e.target as Node))
        setShowHistory(false);
      if (
        toolsMenuRef.current &&
        !toolsMenuRef.current.contains(e.target as Node)
      )
        setShowToolsMenu(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── Listen for live streaming HTML ────────────────────────
  useEffect(() => {
    const handleStreaming = (e: Event) => {
      const { projectId, html } = (
        e as CustomEvent<{ projectId: number; html: string }>
      ).detail;
      if (projectId !== project.id) return;
      setIsStreaming(true);
      setActiveTab("preview");
      setSelectedEl(null);
      setEditMode(false);
      if (isReactStack) return; // React uses esbuild — no live HTML streaming
      latestHtmlRef.current = html;
      setLiveLines(html.split("\n").length);
      if (!liveUpdateTimer.current) {
        liveUpdateTimer.current = setTimeout(() => {
          setLiveHtml(latestHtmlRef.current);
          liveUpdateTimer.current = null;
        }, 300);
      }
    };
    const clearStreaming = (withRefresh: boolean) => {
      if (liveUpdateTimer.current) {
        clearTimeout(liveUpdateTimer.current);
        liveUpdateTimer.current = null;
      }
      const t = setTimeout(() => {
        setIsStreaming(false);
        setLiveHtml(null);
        setLiveLines(0);
        latestHtmlRef.current = "";
        if (withRefresh) {
          pendingRefreshRef.current = true;
          setPendingRefresh(true);
          setIsLoading(true);
          setRefreshKey((k) => k + 1);
        }
      }, 300);
      liveUpdateTimer.current = t;
    };

    const handleFinished = (e: Event) => {
      const { projectId } = (e as CustomEvent<{ projectId: number }>).detail;
      if (projectId !== project.id) return;
      setLiveHtml(latestHtmlRef.current);
      clearStreaming(true);
      // Flash the "just updated" glow ring on the preview frame
      if (justUpdatedTimerRef.current)
        clearTimeout(justUpdatedTimerRef.current);
      setJustUpdated(true);
      justUpdatedTimerRef.current = setTimeout(
        () => setJustUpdated(false),
        2000,
      );
      // First-build celebration: show once per project session
      if (!celebrationShownRef.current) {
        celebrationShownRef.current = true;
        setShowReadyCelebration(true);
        if (celebrationTimerRef.current)
          clearTimeout(celebrationTimerRef.current);
        celebrationTimerRef.current = setTimeout(
          () => setShowReadyCelebration(false),
          7000,
        );
      }
      // Track preview update for product quality observability
      trackPreviewUpdated(project.id);
    };

    const handleBuildEnded = (e: Event) => {
      const { projectId } = (e as CustomEvent<{ projectId: number }>).detail;
      if (projectId !== project.id) return;
      // Fallback: always clear streaming when the stream connection ends
      clearStreaming(false);
    };

    window.addEventListener("builder-preview-streaming", handleStreaming);
    window.addEventListener("builder-preview-updated", handleFinished);
    window.addEventListener("builder-build-ended", handleBuildEnded);
    return () => {
      window.removeEventListener("builder-preview-streaming", handleStreaming);
      window.removeEventListener("builder-preview-updated", handleFinished);
      window.removeEventListener("builder-build-ended", handleBuildEnded);
      if (liveUpdateTimer.current) clearTimeout(liveUpdateTimer.current);
    };
  }, [project.id]);

  // ── Listen for preview errors from iframe (Issue 23: auto-fix) ──
  const autoFixCooldownRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const handle = (e: MessageEvent) => {
      if (e.data?.type !== "builder-preview-error") return;
      const msg: string = e.data.message || "Unknown error";
      if (msg.includes("ResizeObserver") || msg.includes("Script error"))
        return;
      setPreviewErrors((prev) => {
        if (prev.some((p) => p.message === msg)) return prev;
        return [
          ...prev.slice(-4),
          {
            message: msg,
            errorType: e.data.errorType || "error",
            line: e.data.line,
          },
        ];
      });
      // Issue 23: Auto-trigger background fix (debounced per unique message)
      if (!autoFixCooldownRef.current.has(msg)) {
        autoFixCooldownRef.current.add(msg);
        fetch(`/api/projects/${project.id}/errors/auto-fix`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            errorMessage: msg,
            errorStack: e.data.stack ?? "",
            errorLine: e.data.line,
          }),
        })
          .then((r) => r.json())
          .then(
            (data: {
              fix?: {
                fix_description?: string;
                code_patch?: string;
                confidence?: string;
              };
            }) => {
              if (data.fix?.fix_description) {
                setPreviewErrors((prev) =>
                  prev.map((p) =>
                    p.message === msg ? { ...p, autoFix: data.fix } : p,
                  ),
                );
              }
            },
          )
          .catch(() => {})
          .finally(() => {
            setTimeout(() => autoFixCooldownRef.current.delete(msg), 30_000);
          });
      }
    };
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [project.id]);

  // Clear errors on refresh
  useEffect(() => {
    setPreviewErrors([]);
  }, [refreshKey, project.id]);

  // When project.previewHtml updates after a build, clear pending state
  useEffect(() => {
    if (pendingRefreshRef.current && project.previewHtml) {
      pendingRefreshRef.current = false;
      setPendingRefresh(false);
    }
  }, [project.previewHtml]);

  // Safety timeout — clear pendingRefresh after 8s in case refetch never arrives
  useEffect(() => {
    if (!pendingRefresh) return;
    const t = setTimeout(() => {
      pendingRefreshRef.current = false;
      setPendingRefresh(false);
    }, 8000);
    return () => clearTimeout(t);
  }, [pendingRefresh]);

  // ── Listen for postMessage from iframe (visual editing) ───
  useEffect(() => {
    if (!editMode) return;
    const handle = (e: MessageEvent) => {
      if (e.data?.type === "builder-element-selected") {
        const el: SelectedElement = {
          tag: e.data.tag,
          id: e.data.id,
          selector: e.data.selector,
          text: e.data.text,
          rect: e.data.rect,
        };
        setSelectedEl(el);
        onElementSelected?.(el);
      } else if (e.data?.type === "builder-element-deselected") {
        setSelectedEl(null);
        onElementSelected?.({
          tag: "",
          id: "",
          selector: "",
          text: "",
          rect: { x: 0, y: 0, w: 0, h: 0 },
        });
      }
    };
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [editMode, onElementSelected]);

  // Send enable/disable-edit to iframe when editMode toggled
  const toggleEditMode = () => {
    const next = !editMode;
    setEditMode(next);
    if (next) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "builder-enable-edit" },
        "*",
      );
    } else {
      setSelectedEl(null);
      iframeRef.current?.contentWindow?.postMessage(
        { type: "builder-disable-edit" },
        "*",
      );
    }
  };

  // ── Load snapshots ─────────────────────────────────────────
  const loadSnapshots = useCallback(async () => {
    setLoadingSnaps(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/snapshots`);
      const data = await res.json();
      setSnapshots(data);
    } catch {
      // ignore
    } finally {
      setLoadingSnaps(false);
    }
  }, [project.id]);

  const handleShowHistory = () => {
    setShowHistory((v) => !v);
    if (!showHistory) loadSnapshots();
  };

  const handleRestoreSnapshot = async (snapshotId: number) => {
    setRestoringId(snapshotId);
    try {
      await fetch(
        `/api/projects/${project.id}/snapshots/restore/${snapshotId}`,
        { method: "POST" },
      );
      setIsLoading(true);
      setRefreshKey((k) => k + 1);
      setShowHistory(false);
      setPreviewingSnap(null);
    } finally {
      setRestoringId(null);
    }
  };

  // ── Share ──────────────────────────────────────────────────
  const handleShare = async () => {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/share`, {
        method: "POST",
      });
      const { shareToken, customSlug: slug } = await res.json();
      const base =
        window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
      const token = slug || shareToken;
      const url = `${base}/s/${token}`;
      setShareUrl(url);
      setCustomSlug(slug ?? "");
      setShowShareDialog(true);
    } catch {
      // ignore
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  const handleSaveSlug = async () => {
    if (!customSlug.trim() || customSlug.length < 3) {
      setSlugError("חייב להכיל לפחות 3 תווים");
      return;
    }
    setSlugSaving(true);
    setSlugError(null);
    setSlugSuccess(false);
    try {
      const res = await fetch(`/api/projects/${project.id}/custom-slug`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: customSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSlugError(data.error || "שגיאה בשמירה");
      } else {
        const base =
          window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
        const url = `${base}/s/${data.customSlug}`;
        setShareUrl(url);
        setCustomSlug(data.customSlug);
        setSlugSuccess(true);
        setTimeout(() => setSlugSuccess(false), 2000);
      }
    } catch {
      setSlugError("שגיאת רשת");
    } finally {
      setSlugSaving(false);
    }
  };

  // Listen for collab project-updated events and refresh data
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (String(detail?.projectId) === String(project.id)) {
        setRefreshKey((k) => k + 1);
      }
    };
    window.addEventListener("collab-project-updated", handler);
    return () => window.removeEventListener("collab-project-updated", handler);
  }, [project.id]);

  // ── Export helpers ─────────────────────────────────────────
  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
    setPreviewingSnap(null);
  };

  const handleCopyCode = async () => {
    if (!project.previewHtml) return;
    await navigator.clipboard.writeText(project.previewHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!project.previewHtml) return;
    const blob = new Blob([project.previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project.title || "project").replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    setExportSuccess("הורד בהצלחה!");
    setTimeout(() => setExportSuccess(null), 2500);
  };

  const handleOpenCodePen = () => {
    if (!project.previewHtml) return;
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://codepen.io/pen/define";
    form.target = "_blank";
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "data";
    input.value = JSON.stringify({
      title: project.title || "My Project",
      html: project.previewHtml,
    });
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    setShowExportMenu(false);
    setExportSuccess("נפתח ב-CodePen!");
    setTimeout(() => setExportSuccess(null), 2500);
  };

  const handleOpenStackBlitz = () => {
    if (!project.previewHtml) return;
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://stackblitz.com/fork/html";
    form.target = "_blank";
    const addField = (name: string, value: string) => {
      const f = document.createElement("input");
      f.type = "hidden";
      f.name = name;
      f.value = value;
      form.appendChild(f);
    };
    addField("project[files][index.html]", project.previewHtml);
    addField("project[title]", project.title || "My Project");
    addField("project[description]", "Generated by Builder AI");
    addField("project[template]", "html");
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    setShowExportMenu(false);
    setExportSuccess("נפתח ב-StackBlitz!");
    setTimeout(() => setExportSuccess(null), 2500);
  };

  const handleNetlifyDrop = () => {
    handleDownload();
    setTimeout(
      () => window.open("https://app.netlify.com/drop", "_blank"),
      500,
    );
    setExportSuccess("הורד — גרור ל-Netlify!");
    setTimeout(() => setExportSuccess(null), 3000);
  };

  const handleDownloadZip = async () => {
    if (!project.previewHtml) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("index.html", project.previewHtml);
    zip.file(
      "README.md",
      `# ${project.title || "My Project"}\n\nGenerated by Builder AI.\n\n## Usage\n\nOpen \`index.html\` in a browser.\n`,
    );
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project.title || "project").replace(/\s+/g, "-").toLowerCase()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    setExportSuccess("הורד כ-ZIP!");
    setTimeout(() => setExportSuccess(null), 2500);
  };

  const handleNetlifyApiDeploy = async () => {
    if (!project.previewHtml) return;
    if (!readCapabilities().netlify) {
      setShowExportMenu(false);
      navigate("/integrations");
      return;
    }
    setNetlifyDeploying(true);
    setShowExportMenu(false);
    trackDeployAttempted(project.userMode ?? "entrepreneur");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      zip.file("index.html", project.previewHtml);
      const zipBlob = await zip.generateAsync({ type: "base64" });
      const res = await fetch(`/api/projects/${project.id}/netlify-deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zipBase64: zipBlob }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.open(data.url, "_blank");
        setExportSuccess("✓ פורסם ל-Netlify!");
      } else {
        setExportSuccess(`שגיאה: ${data.error || "לא ידוע"}`);
      }
    } catch {
      setExportSuccess("שגיאת רשת");
    } finally {
      setNetlifyDeploying(false);
      setTimeout(() => setExportSuccess(null), 4000);
    }
  };

  const handleGitHubGist = async () => {
    if (!project.previewHtml) return;
    if (!readCapabilities().github) {
      setShowExportMenu(false);
      navigate("/integrations");
      return;
    }
    setGistLoading(true);
    setShowExportMenu(false);
    try {
      const res = await fetch(`/api/projects/${project.id}/github-gist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: project.title || "Builder AI — Generated App",
          html: project.previewHtml,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setExportSuccess(
          res.status === 401
            ? "טוקן GitHub לא תקין"
            : `שגיאה: ${(err as { error?: string }).error || res.status}`,
        );
      } else {
        const gist = await res.json();
        window.open(gist.html_url, "_blank");
        setExportSuccess("✓ הגיסט נוצר ב-GitHub!");
      }
    } catch {
      setExportSuccess("שגיאת רשת");
    } finally {
      setGistLoading(false);
      setTimeout(() => setExportSuccess(null), 3000);
    }
  };

  const handleFork = async () => {
    setForkLoading(true);
    setShowExportMenu(false);
    try {
      const res = await fetch(`/api/projects/${project.id}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("fork failed");
      const { project: forked } = (await res.json()) as {
        project: { id: number };
      };
      setExportSuccess("✓ פרויקט פוצל בהצלחה!");
      setTimeout(() => {
        setExportSuccess(null);
        navigate(`/project/${forked.id}`);
      }, 1200);
    } catch {
      setExportSuccess("שגיאה בפיצול הפרויקט");
    } finally {
      setForkLoading(false);
      setTimeout(() => setExportSuccess(null), 3000);
    }
  };

  const handleSaveTemplate = async () => {
    const titleInput = window.prompt(
      "שם התבנית:",
      project.title ?? "תבנית חדשה",
    );
    if (!titleInput) return;
    setTemplateLoading(true);
    setShowExportMenu(false);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: titleInput,
          isPublic: false,
        }),
      });
      if (!res.ok) throw new Error("template failed");
      setExportSuccess("✓ נשמר כתבנית!");
    } catch {
      setExportSuccess("שגיאה בשמירת התבנית");
    } finally {
      setTemplateLoading(false);
      setTimeout(() => setExportSuccess(null), 3000);
    }
  };

  const previewUrl = previewingSnap
    ? `/api/projects/${project.id}/snapshots/${previewingSnap}`
    : isReactStack
      ? `/api/projects/${project.id}/bundle?t=${refreshKey}`
      : `/api/projects/${project.id}/preview`;
  const modeEmoji =
    project.userMode === "developer"
      ? "💻"
      : project.userMode === "builder"
        ? "🔧"
        : "🏢";
  const hasCode =
    !!project.previewHtml || (isReactStack && projectFiles.length > 0);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] relative overflow-hidden">
      {/* ── Toolbar — minimal result surface bar ──────────────── */}
      <div className="h-[40px] border-b border-white/[0.06] bg-[#0d0d14] flex items-center justify-between px-3 shrink-0 gap-2 relative z-20">
        {/* Left: primary tabs — Preview · Files · Code */}
        <div className="flex items-center gap-0.5">
          {[
            { tab: "preview" as const, Icon: Eye, label: "תצוגה" },
            { tab: "files" as const, Icon: Layers, label: "קבצים" },
            ...(showCodeTab
              ? [{ tab: "code" as const, Icon: Code2, label: "קוד" }]
              : []),
          ].map(({ tab, Icon, label }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                activeTab === tab
                  ? "bg-white/[0.07] text-slate-100"
                  : "text-slate-600 hover:text-slate-300 hover:bg-white/[0.03]",
              )}
              style={{ fontFamily: HE }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}

          {/* Device toggle — only in preview tab, only when not streaming */}
          {activeTab === "preview" && !isStreaming && (
            <DeviceSwitcher
              deviceSize={deviceSize}
              onDeviceChange={setDeviceSize}
            />
          )}

          {/* Streaming status indicator */}
          {isStreaming && (
            <div className="flex items-center gap-1.5 mr-1 px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20">
              <div className="flex gap-0.5">
                <span
                  className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
              <span
                className="text-[10px] text-indigo-400 font-medium"
                style={{ fontFamily: HE }}
              >
                כותב {liveLines.toLocaleString("he-IL")} שורות...
              </span>
            </div>
          )}
        </div>

        {/* Right: actions + single tools icon */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Copy code button */}
          {activeTab === "code" && project.previewHtml && (
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
              title="העתק קוד"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Edit mode toggle */}
          {hasCode && activeTab === "preview" && !isStreaming && (
            <button
              onClick={toggleEditMode}
              title={editMode ? "צא ממצב עריכה" : "ערוך אלמנטים ויזואלית"}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                editMode
                  ? "bg-primary/20 border-primary/50 text-primary animate-pulse"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10",
              )}
              style={{ fontFamily: HE }}
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {editMode ? "עריכה" : "בחר"}
              </span>
            </button>
          )}

          {/* History */}
          <PreviewHistoryMenu
            menuRef={historyRef}
            hasCode={hasCode}
            showHistory={showHistory}
            handleShowHistory={handleShowHistory}
            previewingSnap={previewingSnap}
            loadingSnaps={loadingSnaps}
            snapshots={snapshots}
            restoringId={restoringId}
            setPreviewingSnap={setPreviewingSnap}
            setIsLoading={setIsLoading}
            setRefreshKey={setRefreshKey}
            setShowHistory={setShowHistory}
            handleRestoreSnapshot={handleRestoreSnapshot}
            formatTime={formatTime}
            onDiff={(id, label) => setDiffSnap({ id, label })}
          />

          {/* Viewer count badge */}
          <CollabPresenceBadge viewerCount={viewerCount} />

          {/* Share button */}
          {hasCode && (
            <button
              onClick={handleShare}
              disabled={shareLoading}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                showShareDialog
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10",
              )}
              style={{ fontFamily: HE }}
              title="שתף פרויקט"
            >
              {shareLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Link2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">שתף</span>
            </button>
          )}

          {/* Export button with dropdown */}
          <PreviewExportMenu
            menuRef={exportMenuRef}
            hasCode={hasCode}
            showExportMenu={showExportMenu}
            setShowExportMenu={setShowExportMenu}
            netlifyDeploying={netlifyDeploying}
            exportSuccess={exportSuccess}
            gistLoading={gistLoading}
            forkLoading={forkLoading}
            templateLoading={templateLoading}
            handleGitHubGist={handleGitHubGist}
            handleDownload={handleDownload}
            handleDownloadZip={handleDownloadZip}
            handleOpenCodePen={handleOpenCodePen}
            handleOpenStackBlitz={handleOpenStackBlitz}
            handleNetlifyDrop={handleNetlifyDrop}
            handleNetlifyApiDeploy={handleNetlifyApiDeploy}
            handleFork={handleFork}
            handleSaveTemplate={handleSaveTemplate}
          />

          {/* Single ⚙ tools icon — all advanced tools hidden here */}
          <PreviewToolsMenu
            menuRef={toolsMenuRef}
            showToolsMenu={showToolsMenu}
            setShowToolsMenu={setShowToolsMenu}
            activeTab={activeTab}
            setActiveTab={(tab) =>
              setActiveTab(tab as Parameters<typeof setActiveTab>[0])
            }
            setTerminalEverOpened={setTerminalEverOpened}
          />

          <div className="w-px h-4 bg-white/[0.06] mx-0.5" />

          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition-all group"
            title="רענן תצוגה"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading && !isStreaming && activeTab === "preview" ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}
            />
          </button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition-all"
            title="פתח בלשונית חדשה"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* ── Edit mode banner ─────────────────────────────────── */}
      {editMode && (
        <EditModeBanner selectedEl={selectedEl} onClose={toggleEditMode} />
      )}

      {/* ── Snapshot preview banner ──────────────────────────── */}
      <SnapshotBanner
        previewingSnap={previewingSnap}
        restoringId={restoringId}
        onRestore={handleRestoreSnapshot}
        onBack={() => {
          setPreviewingSnap(null);
          setIsLoading(true);
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* ── Content Area ─────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Preview Tab */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col",
            activeTab === "preview" ? "flex" : "hidden",
          )}
        >
          <PreviewFrame
            projectId={project.id}
            isStreaming={isStreaming}
            isLoading={isLoading}
            liveHtml={liveHtml}
            liveLines={liveLines}
            hasCode={hasCode}
            isReactStack={isReactStack}
            deviceSize={deviceSize}
            pendingRefresh={pendingRefresh}
            previewUrl={previewUrl}
            refreshKey={refreshKey}
            previewingSnap={previewingSnap}
            previewErrors={previewErrors}
            setPreviewErrors={setPreviewErrors}
            setIsLoading={setIsLoading}
            iframeRef={iframeRef}
            liveIframeRef={liveIframeRef}
            justUpdated={justUpdated}
          />

          {/* First-build "ready to share" celebration banner */}
          <AnimatePresence>
            {showReadyCelebration && (
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-xs w-[calc(100%-2.5rem)] pointer-events-auto"
              >
                <div
                  className="relative overflow-hidden bg-[#0e0e1b]/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl px-4 py-3.5 shadow-2xl shadow-indigo-900/60"
                  dir="rtl"
                  style={{ fontFamily: HE }}
                >
                  {/* Ambient glow */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/8 to-violet-600/5 pointer-events-none" />

                  <div className="relative flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white leading-tight">
                        הפרויקט מוכן! 🎉
                      </p>
                      <p className="text-[11px] text-white/45 mt-0.5 truncate">
                        {project.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setShowReadyCelebration(false);
                          handleShare();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-[11px] font-bold transition-colors shrink-0"
                      >
                        <Share2 className="w-3 h-3" />
                        שתף
                      </button>
                      <button
                        onClick={() => setShowReadyCelebration(false)}
                        className="p-1.5 text-white/25 hover:text-white/60 transition-colors rounded-lg hover:bg-white/5"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Auto-dismiss progress bar */}
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 7, ease: "linear" as const }}
                    className="absolute bottom-0 right-0 h-[2px] bg-indigo-500/40 rounded-full"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Architecture / Files Tab */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "files" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <ProjectFilesPanel
              html={project.previewHtml || ""}
              projectId={project.id}
            />
          </ErrorBoundary>
          {isStreaming && (
            <div className="absolute inset-0 bg-[#0d0d14]/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p
                className="text-slate-400 text-sm font-medium"
                style={{ fontFamily: HE }}
              >
                בונה את הפרויקט...
              </p>
              <p className="text-slate-600 text-xs" style={{ fontFamily: HE }}>
                הקבצים יוצגו בסיום הבנייה
              </p>
            </div>
          )}
        </div>

        {/* Terminal Tab — keep mounted once opened so session persists */}
        {terminalEverOpened && (
          <div
            className={cn(
              "absolute inset-0 overflow-hidden",
              activeTab === "terminal" ? "block" : "hidden",
            )}
          >
            <ErrorBoundary>
              <TerminalPanel />
            </ErrorBoundary>
          </div>
        )}

        {/* Secrets Tab */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "secrets" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <SecretsPanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        {/* Database Tab */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "database" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <DatabasePanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        {/* Storage Tab */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "storage" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <StoragePanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        {/* Deploy Tab */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "deploy" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <DeployPanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        {/* Teams Tab */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "teams" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <TeamPanel />
          </ErrorBoundary>
        </div>

        {/* Usage Tab */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "usage" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <UsagePanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "errors" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <ErrorsPanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "performance" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <PerformancePanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "whatsapp" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <WhatsAppPanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        {/* ── Advanced AI Systems ── */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "planner" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <PlannerPanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "orchestrate" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <OrchestratorPanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "deploy-brain" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <DeployBrainPanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "qa" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <QaPanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "cost" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <CostPanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "runtime" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <RuntimePanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "jobs" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <JobsPanel projectId={project.id} />
          </ErrorBoundary>
        </div>

        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            activeTab === "saas" ? "block" : "hidden",
          )}
        >
          <ErrorBoundary>
            <SaasGeneratorPanel
              projectId={project.id}
              onCodeGenerated={() => setRefreshKey((k) => k + 1)}
            />
          </ErrorBoundary>
        </div>

        {/* Code Tab — File Tree + Monaco Editor */}
        {showCodeTab && (
          <div
            className={cn(
              "absolute inset-0",
              activeTab === "code" ? "flex" : "hidden",
            )}
          >
            <CodeEditorTab
              isStreaming={isStreaming}
              liveLines={liveLines}
              projectFiles={projectFiles}
              selectedFileId={selectedFileId}
              setSelectedFileId={setSelectedFileId}
              deleteFileMutation={deleteFileMutation}
              showNewFileDialog={showNewFileDialog}
              setShowNewFileDialog={setShowNewFileDialog}
              newFilePath={newFilePath}
              setNewFilePath={setNewFilePath}
              createNewFile={createNewFile}
              selectedFile={selectedFile}
              editedFileContent={editedFileContent}
              setEditedFileContent={setEditedFileContent}
              saveSelectedFile={saveSelectedFile}
              updateFileMutation={updateFileMutation}
              fileSaved={fileSaved}
              editedHtml={editedHtml}
              setEditedHtml={setEditedHtml}
              previewHtml={project.previewHtml}
              userMode={project.userMode ?? undefined}
              saveHtmlCode={saveHtmlCode}
              codeSaving={codeSaving}
              codeSaved={codeSaved}
            />
          </div>
        )}
      </div>

      {/* ── Share dialog ──────────────────────────────────────── */}
      {showShareDialog && (
        <PreviewShareDialog
          shareUrl={shareUrl}
          customSlug={customSlug}
          shareCopied={shareCopied}
          slugSaving={slugSaving}
          slugError={slugError}
          slugSuccess={slugSuccess}
          viewerCount={viewerCount}
          collabConnected={collabConnected}
          setShowShareDialog={setShowShareDialog}
          setCustomSlug={setCustomSlug}
          setSlugError={setSlugError}
          setSlugSuccess={setSlugSuccess}
          handleCopyShareUrl={handleCopyShareUrl}
          handleSaveSlug={handleSaveSlug}
        />
      )}

      {/* ── Element selected floating bar ────────────────────── */}
      {editMode && selectedEl && (
        <div
          className="absolute bottom-4 right-4 left-4 z-30 bg-[#1a1a2e]/95 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 p-3 flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200"
          dir="rtl"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-mono text-[11px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{`<${selectedEl.tag}>`}</span>
              {selectedEl.selector &&
                selectedEl.selector !== selectedEl.tag && (
                  <span className="text-[10px] text-muted-foreground/70 font-mono truncate">
                    {selectedEl.selector}
                  </span>
                )}
            </div>
            {selectedEl.text && (
              <p className="text-[11px] text-muted-foreground truncate">
                {selectedEl.text}
              </p>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => {
                const msg = `ערוך את האלמנט הבא בדף:\n- תגית: <${selectedEl.tag}>\n- סלקטור: ${selectedEl.selector}\n${selectedEl.text ? `- טקסט נוכחי: "${selectedEl.text}"\n` : ""}בקשה: `;
                window.dispatchEvent(
                  new CustomEvent("builder-prefill-message", {
                    detail: { text: msg },
                  }),
                );
                toggleEditMode();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors"
              style={{ fontFamily: HE }}
            >
              <Pencil className="w-3.5 h-3.5" />
              ערוך עם AI
            </button>
            <button
              onClick={() => {
                setSelectedEl(null);
                iframeRef.current?.contentWindow?.postMessage(
                  { type: "builder-clear-selection" },
                  "*",
                );
              }}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Diff Viewer Modal */}
      {diffSnap && (
        <DiffViewer
          projectId={project.id}
          snapshotId={diffSnap.id}
          snapshotLabel={diffSnap.label}
          currentHtml={project.previewHtml ?? ""}
          onClose={() => setDiffSnap(null)}
        />
      )}
    </div>
  );
}
