import { useState, useEffect } from "react";
import { CreateProjectModal } from "./CreateProjectModal";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => setOnline(false);
    const handleOnline = () => {
      setOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (online && !showReconnected) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-1.5 text-xs font-medium animate-in slide-in-from-top duration-300",
        !online ? "bg-red-500/95 text-white" : "bg-emerald-500/95 text-white",
      )}
    >
      {!online ? (
        <>
          <WifiOff className="w-3 h-3" />
          <span>אין חיבור לאינטרנט</span>
        </>
      ) : (
        <>
          <Wifi className="w-3 h-3" />
          <span>החיבור חזר ✓</span>
        </>
      )}
    </div>
  );
}

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export function ProjectLayout({ children }: ProjectLayoutProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handle = () => setIsModalOpen(true);
    window.addEventListener("builder-new-project", handle);
    return () => window.removeEventListener("builder-new-project", handle);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0a0a0f]">
      <OfflineBanner />
      {children}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
