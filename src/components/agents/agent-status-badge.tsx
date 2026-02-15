import { Badge } from "@/components/ui/badge";

type AgentStatus = "active" | "paused" | "killed";

const statusConfig: Record<AgentStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  killed: { label: "Killed", variant: "danger" },
};

interface AgentStatusBadgeProps {
  status: AgentStatus;
}

export function AgentStatusBadge({ status }: AgentStatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
