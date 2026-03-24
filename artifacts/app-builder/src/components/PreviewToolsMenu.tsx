import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface PreviewToolsMenuProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  showToolsMenu: boolean;
  setShowToolsMenu: React.Dispatch<React.SetStateAction<boolean>>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setTerminalEverOpened: React.Dispatch<React.SetStateAction<boolean>>;
}

export function PreviewToolsMenu({
  menuRef,
  showToolsMenu,
  setShowToolsMenu,
  activeTab,
  setActiveTab,
  setTerminalEverOpened,
}: PreviewToolsMenuProps) {
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowToolsMenu((v) => !v)}
        title="כלי פיתוח"
        className={cn(
          "p-1.5 rounded-md transition-all",
          showToolsMenu
            ? "text-slate-200 bg-white/[0.07]"
            : "text-slate-600 hover:text-slate-300 hover:bg-white/[0.04]",
        )}
      >
        <Settings className="w-3.5 h-3.5" />
      </button>

      {showToolsMenu && (
        <div
          className="absolute left-0 top-full mt-1.5 w-52 bg-[#13131e] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50"
          dir="rtl"
        >
          <div className="p-1.5">
            <p className="text-[10px] text-slate-600 font-medium px-2 py-1 uppercase tracking-wider">
              פיתוח
            </p>
            {[
              {
                tab: "terminal",
                emoji: "⬛",
                label: "טרמינל",
                onClick: () => {
                  setActiveTab("terminal");
                  setTerminalEverOpened(true);
                  setShowToolsMenu(false);
                },
              },
              {
                tab: "secrets",
                emoji: "🔒",
                label: "סודות",
                onClick: () => {
                  setActiveTab("secrets");
                  setShowToolsMenu(false);
                },
              },
              {
                tab: "database",
                emoji: "🗄️",
                label: "מסד נתונים",
                onClick: () => {
                  setActiveTab("database");
                  setShowToolsMenu(false);
                },
              },
              {
                tab: "storage",
                emoji: "📦",
                label: "אחסון",
                onClick: () => {
                  setActiveTab("storage");
                  setShowToolsMenu(false);
                },
              },
            ].map(({ tab, emoji, label, onClick }) => (
              <button
                key={tab}
                onClick={onClick}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-all text-right",
                  activeTab === tab
                    ? "bg-white/[0.06] text-slate-100"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
                )}
                style={{ fontFamily: HE }}
              >
                <span className="text-sm w-4 shrink-0">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
          <div className="p-1.5 border-t border-white/[0.05]">
            <p className="text-[10px] text-slate-600 font-medium px-2 py-1 uppercase tracking-wider">
              ניטור
            </p>
            {[
              {
                tab: "errors",
                emoji: "🐛",
                label: "שגיאות",
                onClick: () => {
                  setActiveTab("errors");
                  setShowToolsMenu(false);
                },
              },
              {
                tab: "performance",
                emoji: "⚡",
                label: "ביצועים",
                onClick: () => {
                  setActiveTab("performance");
                  setShowToolsMenu(false);
                },
              },
              {
                tab: "usage",
                emoji: "📊",
                label: "שימוש",
                onClick: () => {
                  setActiveTab("usage");
                  setShowToolsMenu(false);
                },
              },
            ].map(({ tab, emoji, label, onClick }) => (
              <button
                key={tab}
                onClick={onClick}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-all text-right",
                  activeTab === tab
                    ? "bg-white/[0.06] text-slate-100"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
                )}
                style={{ fontFamily: HE }}
              >
                <span className="text-sm w-4 shrink-0">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
          <div className="p-1.5 border-t border-white/[0.05]">
            <p className="text-[10px] text-slate-600 font-medium px-2 py-1 uppercase tracking-wider">
              AI ויכולות מתקדמות
            </p>
            {[
              {
                tab: "teams",
                emoji: "👥",
                label: "צוות",
                onClick: () => {
                  setActiveTab("teams");
                  setShowToolsMenu(false);
                },
              },
              {
                tab: "whatsapp",
                emoji: "💬",
                label: "WhatsApp",
                onClick: () => {
                  setActiveTab("whatsapp");
                  setShowToolsMenu(false);
                },
              },
              {
                tab: "planner",
                emoji: "✨",
                label: "Planner",
                onClick: () => {
                  setActiveTab("planner");
                  setShowToolsMenu(false);
                },
              },
              {
                tab: "orchestrate",
                emoji: "🤖",
                label: "Orchestrator",
                onClick: () => {
                  setActiveTab("orchestrate");
                  setShowToolsMenu(false);
                },
              },
              {
                tab: "deploy-brain",
                emoji: "🧠",
                label: "Brain",
                onClick: () => {
                  setActiveTab("deploy-brain");
                  setShowToolsMenu(false);
                },
              },
              {
                tab: "qa",
                emoji: "🛡️",
                label: "QA",
                onClick: () => {
                  setActiveTab("qa");
                  setShowToolsMenu(false);
                },
              },
              {
                tab: "cost",
                emoji: "💰",
                label: "עלויות",
                onClick: () => {
                  setActiveTab("cost");
                  setShowToolsMenu(false);
                },
              },
              {
                tab: "runtime",
                emoji: "⚙️",
                label: "Runtime",
                onClick: () => {
                  setActiveTab("runtime");
                  setShowToolsMenu(false);
                },
              },
              {
                tab: "jobs",
                emoji: "📋",
                label: "Jobs",
                onClick: () => {
                  setActiveTab("jobs");
                  setShowToolsMenu(false);
                },
              },
              {
                tab: "saas",
                emoji: "🚀",
                label: "SaaS Gen",
                onClick: () => {
                  setActiveTab("saas");
                  setShowToolsMenu(false);
                },
              },
            ].map(({ tab, emoji, label, onClick }) => (
              <button
                key={tab}
                onClick={onClick}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-all text-right",
                  activeTab === tab
                    ? "bg-white/[0.06] text-slate-100"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
                )}
                style={{ fontFamily: HE }}
              >
                <span className="text-sm w-4 shrink-0">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
