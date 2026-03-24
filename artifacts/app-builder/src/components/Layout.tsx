import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { CreateProjectModal } from "./CreateProjectModal";
import { WifiOff, Wifi, Menu, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

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
        "fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 text-xs font-medium transition-all animate-in slide-in-from-top duration-300 shadow-lg",
        !online ? "bg-[#ef4444] text-white" : "bg-[#10b981] text-white",
      )}
      style={{ fontFamily: HE }}
    >
      {!online ? (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>
            אין חיבור לאינטרנט — ההודעות שלך ישמרו ויישלחו כשהחיבור יחזור
          </span>
        </>
      ) : (
        <>
          <Wifi className="w-3.5 h-3.5" />
          <span>החיבור חזר ✓</span>
        </>
      )}
    </div>
  );
}

export function Layout({
  children,
  hideSidebar = false,
}: {
  children: React.ReactNode;
  hideSidebar?: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  // Close mobile nav on escape
  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [mobileNavOpen]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0f] text-slate-300 font-sans">
      <OfflineBanner />

      {/* ── Desktop sidebar (always visible on md+, unless hideSidebar) ── */}
      {!hideSidebar && (
        <div className="hidden md:flex h-full flex-shrink-0">
          <Sidebar onNewProject={() => setIsModalOpen(true)} />
        </div>
      )}

      {/* ── Mobile sidebar overlay ── */}
      {!hideSidebar && mobileNavOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          onClick={() => setMobileNavOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          {/* Sidebar drawer */}
          <div
            className="relative z-10 h-full flex-shrink-0 animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              onNewProject={() => {
                setIsModalOpen(true);
                setMobileNavOpen(false);
              }}
            />
            <button
              onClick={() => setMobileNavOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 relative min-w-0 h-full flex flex-col overflow-hidden">
        {/* Mobile top bar — only when sidebar is active */}
        {!hideSidebar && (
          <div className="md:hidden flex items-center justify-between px-4 h-12 shrink-0 bg-[#0a0a0f] border-b border-white/[0.05]">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span
              className="text-sm font-bold text-white"
              style={{ fontFamily: HE }}
            >
              Lexovo
            </span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 -mr-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
              aria-label="New project"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Page content */}
        <div className="flex-1 min-h-0 relative">{children}</div>
      </main>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
