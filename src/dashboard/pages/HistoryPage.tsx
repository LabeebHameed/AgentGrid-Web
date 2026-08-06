import { useMemo, useState } from "react";

// Ticking "now" hook — replaces Date.now() during render so the
// react-hooks/purity rule stays happy. Renders first read from a
// useState initializer, then an interval updates it.


import { Search, Download } from "lucide-react";
import { useStore, verdictTone, timeAgo } from "../data";
import { Chip, EmptyState, PageHeader, SegmentedControl } from "../ui";

// Premium UI Component imports from the installed blocks
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";



// Stagger wrapper for cards



export function HistoryPage() {
  const { ledger, toast, activeAgentId, agents } = useStore();
  const [q, setQ] = useState("");
  const [vf, setVf] = useState<"all" | "ALLOW" | "STEP_UP" | "DENY">("all");
  const rows = useMemo(() => {
    const activeAgent = agents.find((a) => a.id === activeAgentId);
    return [...ledger].reverse().filter((e) => {
      const matchQ = !q || (e.action + " " + e.agent).toLowerCase().includes(q.toLowerCase());
      const matchV = vf === "all" || e.verdict === vf;
      const matchAgent = !activeAgent || e.agent === activeAgent.name;
      return matchQ && matchV && matchAgent;
    });
  }, [ledger, q, vf, activeAgentId, agents]);

  return (
    <>
      <PageHeader
        title="History"
        subtitle="Every decision, hash-chained and independently verifiable."
        actions={
          <>
            <div className="flex items-center bg-muted border border-border rounded-md px-2.5 py-1 w-64 h-8 gap-1.5">
              <Search size={14} className="text-muted-foreground" />
              <input 
                placeholder="Search actions, agents…" 
                value={q} 
                onChange={(e) => setQ(e.target.value)} 
                className="bg-transparent border-none outline-none text-xs text-card-foreground flex-1 placeholder:text-muted-foreground"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => toast(`Exported ${rows.length} records`, "ok")}>
              <Download size={14} /> Export
            </Button>
          </>
        }
      />
      <div className="ad-scroll overflow-y-auto flex-1 p-6 flex flex-col gap-4">
        <div className="self-start">
          <SegmentedControl
            value={vf}
            onChange={setVf}
            options={[
              { value: "all" as const, label: "All verdicts" },
              { value: "ALLOW" as const, label: "Allow" },
              { value: "STEP_UP" as const, label: "Step-up" },
              { value: "DENY" as const, label: "Deny" },
            ]}
            layoutId="active-seg-history"
            size="sm"
            ariaLabel="Verdicts filter"
          />
        </div>

        <Card className="bg-card text-card-foreground border-border shadow-none overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState icon={<Search size={22} />} title="No matching records">Try a different search or verdict filter.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] p-3 text-xs font-semibold">Seq</TableHead>
                  <TableHead className="w-[80px] p-3 text-xs font-semibold">Event</TableHead>
                  <TableHead className="p-3 text-xs font-semibold">Action</TableHead>
                  <TableHead className="w-[120px] p-3 text-xs font-semibold">Agent</TableHead>
                  <TableHead className="w-[100px] p-3 text-xs font-semibold">Verdict</TableHead>
                  <TableHead className="w-[100px] p-3 text-xs font-semibold">When</TableHead>
                  <TableHead className="w-[90px] p-3 text-xs font-semibold text-right">Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e, index) => (
                  <TableRow 
                    key={e.seq}
                    className={` ${index % 2 === 0 ? "bg-transparent" : "bg-muted/10"}`}
                  >
                    <TableCell className="p-3 text-muted-foreground mono text-xs">{e.seq}</TableCell>
                    <TableCell className="p-3">
                      <span className="inline-flex items-center text-[10px] font-semibold text-muted-foreground border border-border rounded px-1.5 py-0.5 bg-muted/30">{e.eventType}</span>
                    </TableCell>
                    <TableCell className="p-3 font-medium max-w-[240px] truncate text-xs mono">{e.action}</TableCell>
                    <TableCell className="p-3 text-muted-foreground text-xs">{e.agent}</TableCell>
                    <TableCell className="p-3">
                      <Chip tone={verdictTone(e.verdict)} dot>{e.verdict}</Chip>
                    </TableCell>
                    <TableCell className="p-3 text-muted-foreground text-xs mono whitespace-nowrap">{timeAgo(e.ts)}</TableCell>
                    <TableCell 
                      className="p-3 text-right text-xs text-muted-foreground mono cursor-pointer "
                      onClick={() => {
                        navigator.clipboard.writeText(e.hash);
                        toast("Hash copied to clipboard", "ok");
                      }}
                      title="Click to copy full hash"
                    >
                      {e.hash.length > 10 ? e.hash.slice(0, 8) + "…" : e.hash}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}


