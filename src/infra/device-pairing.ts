/**
 * 设备配对模块
 *
 * 该模块负责管理设备配对流程，包括：
 * - 配对请求的创建和管理
 * - 设备的批准和拒绝
 * - 已配对设备的存储
 * - 设备认证令牌管理
 *
 * @module infra/device-pairing
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveStateDir } from "../config/paths.js";

/** 待处理的设备配对请求 */
export type DevicePairingPendingRequest = {
  /** 请求 ID */
  requestId: string;
  /** 设备 ID */
  deviceId: string;
  /** 公钥 */
  publicKey: string;
  /** 显示名称 */
  displayName?: string;
  /** 平台 */
  platform?: string;
  /** 客户端 ID */
  clientId?: string;
  /** 客户端模式 */
  clientMode?: string;
  /** 角色 */
  role?: string;
  /** 角色列表 */
  roles?: string[];
  /** 作用域列表 */
  scopes?: string[];
  /** 远程 IP */
  remoteIp?: string;
  /** 是否静默 */
  silent?: boolean;
  /** 是否为修复请求 */
  isRepair?: boolean;
  /** 时间戳 */
  ts: number;
};

/** 设备认证令牌 */
export type DeviceAuthToken = {
  /** 令牌值 */
  token: string;
  /** 角色 */
  role: string;
  /** 作用域列表 */
  scopes: string[];
  /** 创建时间（毫秒） */
  createdAtMs: number;
  /** 轮换时间（毫秒） */
  rotatedAtMs?: number;
  /** 撤销时间（毫秒） */
  revokedAtMs?: number;
  /** 最后使用时间（毫秒） */
  lastUsedAtMs?: number;
};

/** 设备认证令牌摘要 */
export type DeviceAuthTokenSummary = {
  /** 角色 */
  role: string;
  /** 作用域列表 */
  scopes: string[];
  /** 创建时间（毫秒） */
  createdAtMs: number;
  /** 轮换时间（毫秒） */
  rotatedAtMs?: number;
  /** 撤销时间（毫秒） */
  revokedAtMs?: number;
  /** 最后使用时间（毫秒） */
  lastUsedAtMs?: number;
};

/** 已配对设备 */
export type PairedDevice = {
  /** 设备 ID */
  deviceId: string;
  /** 公钥 */
  publicKey: string;
  /** 显示名称 */
  displayName?: string;
  /** 平台 */
  platform?: string;
  /** 客户端 ID */
  clientId?: string;
  /** 客户端模式 */
  clientMode?: string;
  /** 角色 */
  role?: string;
  /** 角色列表 */
  roles?: string[];
  /** 作用域列表 */
  scopes?: string[];
  /** 远程 IP */
  remoteIp?: string;
  /** 认证令牌映射 */
  tokens?: Record<string, DeviceAuthToken>;
  /** 创建时间（毫秒） */
  createdAtMs: number;
  /** 批准时间（毫秒） */
  approvedAtMs: number;
};

/** 设备配对列表 */
export type DevicePairingList = {
  /** 待处理请求列表 */
  pending: DevicePairingPendingRequest[];
  /** 已配对设备列表 */
  paired: PairedDevice[];
};

/** 设备配对状态文件结构 */
type DevicePairingStateFile = {
  /** 按 ID 索引的待处理请求 */
  pendingById: Record<string, DevicePairingPendingRequest>;
  /** 按设备 ID 索引的已配对设备 */
  pairedByDeviceId: Record<string, PairedDevice>;
};

/** 待处理请求的 TTL（5 分钟） */
const PENDING_TTL_MS = 5 * 60 * 1000;

/**
 * 解析配对相关文件路径
 */
function resolvePaths(baseDir?: string) {
  const root = baseDir ?? resolveStateDir();
  const dir = path.join(root, "devices");
  return {
    dir,
    pendingPath: path.join(dir, "pending.json"),
    pairedPath: path.join(dir, "paired.json"),
  };
}

/**
 * 读取 JSON 文件
 */
async function readJSON<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * 原子写入 JSON 文件
 */
async function writeJSONAtomic(filePath: string, value: unknown) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  try {
    await fs.chmod(tmp, 0o600);
  } catch {
    // best-effort
  }
  await fs.rename(tmp, filePath);
  try {
    await fs.chmod(filePath, 0o600);
  } catch {
    // best-effort
  }
}

function pruneExpiredPending(
  pendingById: Record<string, DevicePairingPendingRequest>,
  nowMs: number,
) {
  for (const [id, req] of Object.entries(pendingById)) {
    if (nowMs - req.ts > PENDING_TTL_MS) {
      delete pendingById[id];
    }
  }
}

let lock: Promise<void> = Promise.resolve();
async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = lock;
  let release: (() => void) | undefined;
  lock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    return await fn();
  } finally {
    release?.();
  }
}

async function loadState(baseDir?: string): Promise<DevicePairingStateFile> {
  const { pendingPath, pairedPath } = resolvePaths(baseDir);
  const [pending, paired] = await Promise.all([
    readJSON<Record<string, DevicePairingPendingRequest>>(pendingPath),
    readJSON<Record<string, PairedDevice>>(pairedPath),
  ]);
  const state: DevicePairingStateFile = {
    pendingById: pending ?? {},
    pairedByDeviceId: paired ?? {},
  };
  pruneExpiredPending(state.pendingById, Date.now());
  return state;
}

async function persistState(state: DevicePairingStateFile, baseDir?: string) {
  const { pendingPath, pairedPath } = resolvePaths(baseDir);
  await Promise.all([
    writeJSONAtomic(pendingPath, state.pendingById),
    writeJSONAtomic(pairedPath, state.pairedByDeviceId),
  ]);
}

function normalizeDeviceId(deviceId: string) {
  return deviceId.trim();
}

function normalizeRole(role: string | undefined): string | null {
  const trimmed = role?.trim();
  return trimmed ? trimmed : null;
}

function mergeRoles(...items: Array<string | string[] | undefined>): string[] | undefined {
  const roles = new Set<string>();
  for (const item of items) {
    if (!item) continue;
    if (Array.isArray(item)) {
      for (const role of item) {
        const trimmed = role.trim();
        if (trimmed) roles.add(trimmed);
      }
    } else {
      const trimmed = item.trim();
      if (trimmed) roles.add(trimmed);
    }
  }
  if (roles.size === 0) return undefined;
  return [...roles];
}

function mergeScopes(...items: Array<string[] | undefined>): string[] | undefined {
  const scopes = new Set<string>();
  for (const item of items) {
    if (!item) continue;
    for (const scope of item) {
      const trimmed = scope.trim();
      if (trimmed) scopes.add(trimmed);
    }
  }
  if (scopes.size === 0) return undefined;
  return [...scopes];
}

function normalizeScopes(scopes: string[] | undefined): string[] {
  if (!Array.isArray(scopes)) return [];
  const out = new Set<string>();
  for (const scope of scopes) {
    const trimmed = scope.trim();
    if (trimmed) out.add(trimmed);
  }
  return [...out].sort();
}

function scopesAllow(requested: string[], allowed: string[]): boolean {
  if (requested.length === 0) return true;
  if (allowed.length === 0) return false;
  const allowedSet = new Set(allowed);
  return requested.every((scope) => allowedSet.has(scope));
}

function newToken() {
  return randomUUID().replaceAll("-", "");
}

export async function listDevicePairing(baseDir?: string): Promise<DevicePairingList> {
  const state = await loadState(baseDir);
  const pending = Object.values(state.pendingById).sort((a, b) => b.ts - a.ts);
  const paired = Object.values(state.pairedByDeviceId).sort(
    (a, b) => b.approvedAtMs - a.approvedAtMs,
  );
  return { pending, paired };
}

export async function getPairedDevice(
  deviceId: string,
  baseDir?: string,
): Promise<PairedDevice | null> {
  const state = await loadState(baseDir);
  return state.pairedByDeviceId[normalizeDeviceId(deviceId)] ?? null;
}

export async function requestDevicePairing(
  req: Omit<DevicePairingPendingRequest, "requestId" | "ts" | "isRepair">,
  baseDir?: string,
): Promise<{
  status: "pending";
  request: DevicePairingPendingRequest;
  created: boolean;
}> {
  return await withLock(async () => {
    const state = await loadState(baseDir);
    const deviceId = normalizeDeviceId(req.deviceId);
    if (!deviceId) {
      throw new Error("deviceId required");
    }
    const existing = Object.values(state.pendingById).find((p) => p.deviceId === deviceId);
    if (existing) {
      return { status: "pending", request: existing, created: false };
    }
    const isRepair = Boolean(state.pairedByDeviceId[deviceId]);
    const request: DevicePairingPendingRequest = {
      requestId: randomUUID(),
      deviceId,
      publicKey: req.publicKey,
      displayName: req.displayName,
      platform: req.platform,
      clientId: req.clientId,
      clientMode: req.clientMode,
      role: req.role,
      roles: req.role ? [req.role] : undefined,
      scopes: req.scopes,
      remoteIp: req.remoteIp,
      silent: req.silent,
      isRepair,
      ts: Date.now(),
    };
    state.pendingById[request.requestId] = request;
    await persistState(state, baseDir);
    return { status: "pending", request, created: true };
  });
}

export async function approveDevicePairing(
  requestId: string,
  baseDir?: string,
): Promise<{ requestId: string; device: PairedDevice } | null> {
  return await withLock(async () => {
    const state = await loadState(baseDir);
    const pending = state.pendingById[requestId];
    if (!pending) return null;
    const now = Date.now();
    const existing = state.pairedByDeviceId[pending.deviceId];
    const roles = mergeRoles(existing?.roles, existing?.role, pending.roles, pending.role);
    const scopes = mergeScopes(existing?.scopes, pending.scopes);
    const tokens = existing?.tokens ? { ...existing.tokens } : {};
    const roleForToken = normalizeRole(pending.role);
    if (roleForToken) {
      const nextScopes = normalizeScopes(pending.scopes);
      const existingToken = tokens[roleForToken];
      const now = Date.now();
      tokens[roleForToken] = {
        token: newToken(),
        role: roleForToken,
        scopes: nextScopes,
        createdAtMs: existingToken?.createdAtMs ?? now,
        rotatedAtMs: existingToken ? now : undefined,
        revokedAtMs: undefined,
        lastUsedAtMs: existingToken?.lastUsedAtMs,
      };
    }
    const device: PairedDevice = {
      deviceId: pending.deviceId,
      publicKey: pending.publicKey,
      displayName: pending.displayName,
      platform: pending.platform,
      clientId: pending.clientId,
      clientMode: pending.clientMode,
      role: pending.role,
      roles,
      scopes,
      remoteIp: pending.remoteIp,
      tokens,
      createdAtMs: existing?.createdAtMs ?? now,
      approvedAtMs: now,
    };
    delete state.pendingById[requestId];
    state.pairedByDeviceId[device.deviceId] = device;
    await persistState(state, baseDir);
    return { requestId, device };
  });
}

export async function rejectDevicePairing(
  requestId: string,
  baseDir?: string,
): Promise<{ requestId: string; deviceId: string } | null> {
  return await withLock(async () => {
    const state = await loadState(baseDir);
    const pending = state.pendingById[requestId];
    if (!pending) return null;
    delete state.pendingById[requestId];
    await persistState(state, baseDir);
    return { requestId, deviceId: pending.deviceId };
  });
}

export async function updatePairedDeviceMetadata(
  deviceId: string,
  patch: Partial<Omit<PairedDevice, "deviceId" | "createdAtMs" | "approvedAtMs">>,
  baseDir?: string,
): Promise<void> {
  return await withLock(async () => {
    const state = await loadState(baseDir);
    const existing = state.pairedByDeviceId[normalizeDeviceId(deviceId)];
    if (!existing) return;
    const roles = mergeRoles(existing.roles, existing.role, patch.role);
    const scopes = mergeScopes(existing.scopes, patch.scopes);
    state.pairedByDeviceId[deviceId] = {
      ...existing,
      ...patch,
      deviceId: existing.deviceId,
      createdAtMs: existing.createdAtMs,
      approvedAtMs: existing.approvedAtMs,
      role: patch.role ?? existing.role,
      roles,
      scopes,
    };
    await persistState(state, baseDir);
  });
}

export function summarizeDeviceTokens(
  tokens: Record<string, DeviceAuthToken> | undefined,
): DeviceAuthTokenSummary[] | undefined {
  if (!tokens) return undefined;
  const summaries = Object.values(tokens)
    .map((token) => ({
      role: token.role,
      scopes: token.scopes,
      createdAtMs: token.createdAtMs,
      rotatedAtMs: token.rotatedAtMs,
      revokedAtMs: token.revokedAtMs,
      lastUsedAtMs: token.lastUsedAtMs,
    }))
    .sort((a, b) => a.role.localeCompare(b.role));
  return summaries.length > 0 ? summaries : undefined;
}

export async function verifyDeviceToken(params: {
  deviceId: string;
  token: string;
  role: string;
  scopes: string[];
  baseDir?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  return await withLock(async () => {
    const state = await loadState(params.baseDir);
    const device = state.pairedByDeviceId[normalizeDeviceId(params.deviceId)];
    if (!device) return { ok: false, reason: "device-not-paired" };
    const role = normalizeRole(params.role);
    if (!role) return { ok: false, reason: "role-missing" };
    const entry = device.tokens?.[role];
    if (!entry) return { ok: false, reason: "token-missing" };
    if (entry.revokedAtMs) return { ok: false, reason: "token-revoked" };
    if (entry.token !== params.token) return { ok: false, reason: "token-mismatch" };
    const requestedScopes = normalizeScopes(params.scopes);
    if (!scopesAllow(requestedScopes, entry.scopes)) {
      return { ok: false, reason: "scope-mismatch" };
    }
    entry.lastUsedAtMs = Date.now();
    device.tokens ??= {};
    device.tokens[role] = entry;
    state.pairedByDeviceId[device.deviceId] = device;
    await persistState(state, params.baseDir);
    return { ok: true };
  });
}

export async function ensureDeviceToken(params: {
  deviceId: string;
  role: string;
  scopes: string[];
  baseDir?: string;
}): Promise<DeviceAuthToken | null> {
  return await withLock(async () => {
    const state = await loadState(params.baseDir);
    const device = state.pairedByDeviceId[normalizeDeviceId(params.deviceId)];
    if (!device) return null;
    const role = normalizeRole(params.role);
    if (!role) return null;
    const requestedScopes = normalizeScopes(params.scopes);
    const tokens = device.tokens ? { ...device.tokens } : {};
    const existing = tokens[role];
    if (existing && !existing.revokedAtMs) {
      if (scopesAllow(requestedScopes, existing.scopes)) {
        return existing;
      }
    }
    const now = Date.now();
    const next: DeviceAuthToken = {
      token: newToken(),
      role,
      scopes: requestedScopes,
      createdAtMs: existing?.createdAtMs ?? now,
      rotatedAtMs: existing ? now : undefined,
      revokedAtMs: undefined,
      lastUsedAtMs: existing?.lastUsedAtMs,
    };
    tokens[role] = next;
    device.tokens = tokens;
    state.pairedByDeviceId[device.deviceId] = device;
    await persistState(state, params.baseDir);
    return next;
  });
}

export async function rotateDeviceToken(params: {
  deviceId: string;
  role: string;
  scopes?: string[];
  baseDir?: string;
}): Promise<DeviceAuthToken | null> {
  return await withLock(async () => {
    const state = await loadState(params.baseDir);
    const device = state.pairedByDeviceId[normalizeDeviceId(params.deviceId)];
    if (!device) return null;
    const role = normalizeRole(params.role);
    if (!role) return null;
    const tokens = device.tokens ? { ...device.tokens } : {};
    const existing = tokens[role];
    const requestedScopes = normalizeScopes(params.scopes ?? existing?.scopes ?? device.scopes);
    const now = Date.now();
    const next: DeviceAuthToken = {
      token: newToken(),
      role,
      scopes: requestedScopes,
      createdAtMs: existing?.createdAtMs ?? now,
      rotatedAtMs: now,
      revokedAtMs: undefined,
      lastUsedAtMs: existing?.lastUsedAtMs,
    };
    tokens[role] = next;
    device.tokens = tokens;
    if (params.scopes !== undefined) {
      device.scopes = requestedScopes;
    }
    state.pairedByDeviceId[device.deviceId] = device;
    await persistState(state, params.baseDir);
    return next;
  });
}

export async function revokeDeviceToken(params: {
  deviceId: string;
  role: string;
  baseDir?: string;
}): Promise<DeviceAuthToken | null> {
  return await withLock(async () => {
    const state = await loadState(params.baseDir);
    const device = state.pairedByDeviceId[normalizeDeviceId(params.deviceId)];
    if (!device) return null;
    const role = normalizeRole(params.role);
    if (!role) return null;
    if (!device.tokens?.[role]) return null;
    const tokens = { ...device.tokens };
    const entry = { ...tokens[role], revokedAtMs: Date.now() };
    tokens[role] = entry;
    device.tokens = tokens;
    state.pairedByDeviceId[device.deviceId] = device;
    await persistState(state, params.baseDir);
    return entry;
  });
}
