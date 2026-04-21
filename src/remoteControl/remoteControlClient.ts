import { get } from 'svelte/store';
import { remoteSessionId, remoteConnectionStatus } from './remoteSessionStore';
import { commandTable, collectResult, resultTypeLabel, argTypeLabel } from '../commandline/commandDefinitions';
import type { InboundMessage, CommandMessage, QueryCommandsMessage, ClientUpdateMessage, CommandCatalogMessage } from './types';

const WORKER_URL_PROD = 'https://frameplanner-remote-control.naoyuki-hirayama.workers.dev';
const WORKER_URL_DEV_DEFAULT = 'http://localhost:8686';

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const RECONNECT_INTERVAL_MS = 5000;

export function getWorkerUrl(): string {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === 'frameplanner.example.local' || host === 'example.local') {
    // ?rcPort=8686 のようにURLパラメータでポートを指定可能
    const params = new URLSearchParams(window.location.search);
    const port = params.get('rcPort');
    if (port) {
      return `http://localhost:${port}`;
    }
    return WORKER_URL_DEV_DEFAULT;
  }
  return WORKER_URL_PROD;
}

function getWsUrl(sessionId: string): string {
  const base = getWorkerUrl();
  const wsBase = base.replace(/^http/, 'ws');
  return `${wsBase}/api/ws/${encodeURIComponent(sessionId)}`;
}

function sendMessage(msg: ClientUpdateMessage | CommandCatalogMessage): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function payloadToArgs(command: string, payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;

  // 明示的に args 配列を渡すパス(任意のコマンドで使える)
  if (Array.isArray(p.args)) {
    return (p.args as unknown[]).map(v => v == null ? '' : String(v));
  }

  // コマンド別マッピング
  if (command === 'fs-list') {
    return [String(p.path ?? ''), String(p.since ?? '')];
  }
  if (command === 'fs-mkdir') {
    return [String(p.path ?? '')];
  }
  if (command === 'open-book') {
    return [String(p.id ?? p.fileId ?? '')];
  }
  if (command === 'fs-move') {
    return [String(p.id ?? p.fileId ?? ''), String(p.dst ?? p.dstPath ?? '')];
  }
  if (command === 'delete-page') {
    return [String(p.index ?? '')];
  }
  if (command === 'delete-empty-pages') {
    return [String(p.threshold ?? '')];
  }
  if (command === 'merge-folder') {
    return [String(p.path ?? '')];
  }
  if (command === 'flatten-and-upscale') {
    return [String(p.threshold ?? '')];
  }

  // genai-theme, genai-plot, genai-scenario: { text: "..." }
  if ('text' in p && typeof p.text === 'string') {
    return [p.text];
  }

  // genai-characters-blank: { name: "..." }
  if ('name' in p && typeof p.name === 'string') {
    return [p.name];
  }

  // new-page: { template: "..." }
  if ('template' in p && typeof p.template === 'string') {
    return [p.template];
  }

  return [];
}

function buildCommandCatalog(): CommandCatalogMessage['commands'] {
  const entries: CommandCatalogMessage['commands'] = [];
  for (const def of commandTable) {
    // 即時版
    entries.push({
      name: def.name,
      description: def.description,
      args: def.args.map(a => ({ label: argTypeLabel(a.type), required: a.required })),
      result: resultTypeLabel(def.result),
    });
    // -async版があるコマンド: resultがNone以外かつ引数にFreeTextがあるもの
    // (テキスト設定とAI生成の両方を持つコマンド)、またはgenai-characters系
    if (def.result.tag !== 'None') {
      entries.push({
        name: `${def.name}-async`,
        description: `${def.description} (AI生成/長時間)`,
        args: [],
        result: resultTypeLabel(def.result),
      });
    }
  }
  return entries;
}

function handleQueryCommands(msg: QueryCommandsMessage): void {
  console.log('[RemoteControl] handleQueryCommands');
  sendMessage({
    kind: 'command-catalog',
    requestId: msg.requestId,
    commands: buildCommandCatalog(),
  });
}

function resolveCommand(command: string): { def: (typeof commandTable)[number]; args: string[] } | null {
  // -async suffix: ベースコマンドを引数なしで呼ぶ
  if (command.endsWith('-async')) {
    const baseName = command.slice(0, -'-async'.length);
    const def = commandTable.find(c => c.name === baseName);
    if (def) return { def, args: [] };
  }

  const def = commandTable.find(c => c.name === command);
  return def ? { def, args: [] } : null;
}

async function handleCommand(msg: CommandMessage): Promise<void> {
  console.log('[RemoteControl] handleCommand:', msg.command, 'payload:', msg.payload);

  const resolved = resolveCommand(msg.command);
  if (!resolved) {
    console.warn('[RemoteControl] unknown command:', msg.command);
    sendMessage({
      kind: 'job-update',
      requestId: msg.requestId,
      jobId: msg.jobId,
      status: 'error',
      error: `Unknown command: ${msg.command}`,
    });
    return;
  }

  const { def } = resolved;
  // -async版は引数なし（AI生成モード）、通常版はpayloadから引数を組み立て
  const args = msg.command.endsWith('-async') ? [] : payloadToArgs(msg.command, msg.payload);
  console.log('[RemoteControl] resolved args:', args);

  // started を送信
  sendMessage({
    kind: 'job-update',
    requestId: msg.requestId,
    jobId: msg.jobId,
    status: 'started',
  });

  try {
    console.log('[RemoteControl] executing action for:', msg.command);
    const actionResult = await def.action(args);
    const result = actionResult !== undefined ? actionResult : collectResult(def.result);
    console.log('[RemoteControl] action completed for:', msg.command, 'result:', result);
    sendMessage({
      kind: 'job-update',
      requestId: msg.requestId,
      jobId: msg.jobId,
      status: 'done',
      result,
    });
  } catch (e) {
    console.error('[RemoteControl] action error for:', msg.command, e);
    sendMessage({
      kind: 'job-update',
      requestId: msg.requestId,
      jobId: msg.jobId,
      status: 'error',
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    const sessionId = get(remoteSessionId);
    if (sessionId) {
      connect(sessionId);
    }
  }, RECONNECT_INTERVAL_MS);
}

export function connect(sessionId: string): void {
  disconnect();
  remoteSessionId.set(sessionId);
  remoteConnectionStatus.set('connecting');

  const url = getWsUrl(sessionId);
  ws = new WebSocket(url);

  ws.addEventListener('open', () => {
    console.log('[RemoteControl] WebSocket connected');
    remoteConnectionStatus.set('connected');
  });

  ws.addEventListener('message', (event) => {
    console.log('[RemoteControl] raw message:', event.data);
    if (typeof event.data !== 'string') return;
    let msg: InboundMessage;
    try {
      msg = JSON.parse(event.data);
    } catch (e) {
      console.warn('[RemoteControl] JSON parse failed:', e);
      return;
    }
    console.log('[RemoteControl] parsed message:', msg);
    switch (msg.kind) {
      case 'command':
        handleCommand(msg);
        break;
      case 'query-commands':
        handleQueryCommands(msg);
        break;
      default:
        console.log('[RemoteControl] ignoring unknown kind:', (msg as { kind: string }).kind);
    }
  });

  ws.addEventListener('close', () => {
    console.log('[RemoteControl] WebSocket closed');
    ws = null;
    const currentId = get(remoteSessionId);
    if (currentId) {
      remoteConnectionStatus.set('disconnected');
      scheduleReconnect();
    }
  });

  ws.addEventListener('error', (e) => {
    console.error('[RemoteControl] WebSocket error', e);
    remoteConnectionStatus.set('error');
  });
}

export function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  remoteConnectionStatus.set('disconnected');
}

const SESSION_STORAGE_KEY = 'remoteSessionId';

export function initRemoteControl(): void {
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  connect(sessionId);
}

export function destroyRemoteControl(): void {
  disconnect();
  remoteSessionId.set(null);
}
