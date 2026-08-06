import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Agent } from "./data";
import { useStore } from "./data";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

/**
 * Bottom-left sidebar agent switcher.
 * Trigger = the existing Agenttag Agent card (now a button).
 * Popover opens UP from the trigger (sidebar is at the viewport edge),
 * or RIGHT when the sidebar is collapsed to icon-only mode.
 */
export function AgentSwapper({ agents }: { agents: Agent[] }) {
  const { activeAgentId, setActiveAgent } = useStore();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = activeAgentId
    ? (agents.find((a) => a.id === activeAgentId) ?? agents[0])
    : null;

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  // Real agents only ever land on "active" | "killed" | "connecting" now — "paused"
  // and "revoked" are kept in the type for forward-compat but unused by the live
  // Store, so they still get a sensible tone rather than falling through blindly.
  const statusTone = (s: Agent["status"] | "all") =>
    s === "all" ? "bg-zinc-400" :
    s === "active" ? "bg-emerald-500" :
    s === "paused" ? "bg-amber-500" :
    s === "connecting" ? "bg-blue-500 animate-pulse" :
    s === "killed" ? "bg-red-500" :
    s === "revoked" ? "bg-red-500" :
    "bg-zinc-400";

  const currentName = current ? current.name : "All Agents";
  const currentDid = current ? current.did : "did:key:all_agents";
  const currentStatus = current ? current.status : "all";

  const { state, isMobile } = useSidebar();

  const triggerButton = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={`Switch agent. Current: ${currentName}`}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg ad-agent-card p-2.5 shadow-xs text-left transition-colors",
        "group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:justify-center",
        "active:scale-[0.98]"
      )}
    >
      <span className="relative flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
        <Cpu className="size-3.5" />
        <span className={cn("absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-card", statusTone(currentStatus))} />
      </span>
      <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <div className="text-xs font-semibold leading-tight truncate">{currentName}</div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">{currentDid}</div>
      </div>
      <ChevronsUpDown className="size-3.5 text-zinc-500 shrink-0 group-data-[collapsible=icon]:hidden" />
    </button>
  );

  return (
    <div ref={containerRef} className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          {triggerButton}
        </TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          hidden={state !== "collapsed" || isMobile}
        >
          Switch Agent (Current: {currentName})
        </TooltipContent>
      </Tooltip>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            role="listbox"
            aria-label="Switch agent"
            className={cn(
              "absolute z-50",
              "bottom-full left-0 mb-2 w-72",
              "group-data-[collapsible=icon]:bottom-0 group-data-[collapsible=icon]:left-full group-data-[collapsible=icon]:mb-0 group-data-[collapsible=icon]:ml-2",
              "rounded-xl border border-border bg-popover text-popover-foreground shadow-lg p-1.5"
            )}
          >
            <div className="px-2 pt-1.5 pb-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Switch agent · {agents.length + 1}
            </div>
            <div id="agent-swapper-list" className="max-h-72 overflow-y-auto -mx-1 px-1" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              <style>{`#agent-swapper-list::-webkit-scrollbar { display: none !important; width: 0 !important; }`}</style>
              {/* Option: All Agents */}
              <button
                type="button"
                role="option"
                aria-selected={activeAgentId === null}
                onClick={() => {
                  setActiveAgent(null);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                  "hover:bg-muted/60 active:scale-[0.99]",
                  activeAgentId === null && "bg-muted/40"
                )}
              >
                <span className="relative flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/50 mt-0.5">
                  <Cpu className="size-3.5 text-muted-foreground" />
                  <span className={cn("absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-popover", statusTone("all"))} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="text-xs font-semibold truncate">All Agents</div>
                    <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">global view</span>
                  </div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">did:key:all_agents</div>
                </div>
                {activeAgentId === null && <Check className="size-3.5 text-emerald-500 shrink-0 mt-1" />}
              </button>

              {agents.map((a) => {
                const isCurrent = a.id === activeAgentId;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    onClick={() => {
                      setActiveAgent(a.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                      "hover:bg-muted/60 active:scale-[0.99]",
                      isCurrent && "bg-muted/40"
                    )}
                  >
                    <span className="relative flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/50 mt-0.5">
                      <Cpu className="size-3.5 text-muted-foreground" />
                      <span className={cn("absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-popover", statusTone(a.status))} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="text-xs font-semibold truncate">{a.name}</div>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">{a.status}</span>
                      </div>
                      <div className="truncate font-mono text-[10px] text-muted-foreground">{a.did}</div>
                    </div>
                    {isCurrent && <Check className="size-3.5 text-emerald-500 shrink-0 mt-1" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

