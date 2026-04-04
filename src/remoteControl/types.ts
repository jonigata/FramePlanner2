// MCP -> Durable Object -> FramePlanner
export type CommandMessage = {
  kind: "command";
  requestId: string;
  jobId?: string;
  command: string;
  payload?: unknown;
  expectLongRunning?: boolean;
};

export type QueryCommandsMessage = {
  kind: "query-commands";
  requestId: string;
};

export type InboundMessage = CommandMessage | QueryCommandsMessage;

// FramePlanner -> Durable Object -> MCP
export type ClientUpdateMessage = {
  kind: "job-update";
  requestId?: string;
  jobId?: string;
  status: "started" | "running" | "done" | "error";
  progress?: number;
  message?: string;
  result?: unknown;
  error?: string;
};

export type CommandCatalogMessage = {
  kind: "command-catalog";
  requestId: string;
  commands: {
    name: string;
    description: string;
    args: { label: string; required: boolean }[];
    result: string;
  }[];
};
