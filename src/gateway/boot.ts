/**
 * 网关启动模块
 *
 * 提供网关启动时执行 BOOT.md 脚本的功能。
 * BOOT.md 是一个可选的启动脚本，用于在网关启动时执行自定义操作。
 */

import fs from "node:fs/promises";
import path from "node:path";

import { SILENT_REPLY_TOKEN } from "../auto-reply/tokens.js";
import type { CliDeps } from "../cli/deps.js";
import type { MoltbotConfig } from "../config/config.js";
import { resolveMainSessionKey } from "../config/sessions/main-session.js";
import { agentCommand } from "../commands/agent.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { type RuntimeEnv, defaultRuntime } from "../runtime.js";

const log = createSubsystemLogger("gateway/boot");
/** 启动脚本文件名 */
const BOOT_FILENAME = "BOOT.md";

/**
 * 启动脚本执行结果
 */
export type BootRunResult =
  | { status: "skipped"; reason: "missing" | "empty" }
  | { status: "ran" }
  | { status: "failed"; reason: string };

/**
 * 构建启动提示词
 * 将 BOOT.md 内容包装为 agent 可执行的提示
 */
function buildBootPrompt(content: string) {
  return [
    "You are running a boot check. Follow BOOT.md instructions exactly.",
    "",
    "BOOT.md:",
    content,
    "",
    "If BOOT.md asks you to send a message, use the message tool (action=send with channel + target).",
    "Use the `target` field (not `to`) for message tool destinations.",
    `After sending with the message tool, reply with ONLY: ${SILENT_REPLY_TOKEN}.`,
    `If nothing needs attention, reply with ONLY: ${SILENT_REPLY_TOKEN}.`,
  ].join("\n");
}

/**
 * 加载启动脚本文件
 */
async function loadBootFile(
  workspaceDir: string,
): Promise<{ content?: string; status: "ok" | "missing" | "empty" }> {
  const bootPath = path.join(workspaceDir, BOOT_FILENAME);
  try {
    const content = await fs.readFile(bootPath, "utf-8");
    const trimmed = content.trim();
    if (!trimmed) return { status: "empty" };
    return { status: "ok", content: trimmed };
  } catch (err) {
    const anyErr = err as { code?: string };
    if (anyErr.code === "ENOENT") return { status: "missing" };
    throw err;
  }
}

/**
 * 执行启动脚本
 *
 * 读取工作目录下的 BOOT.md 文件，并通过 agent 执行其中的指令。
 *
 * @param params.cfg - 配置对象
 * @param params.deps - CLI 依赖
 * @param params.workspaceDir - 工作目录
 * @returns 执行结果
 */
export async function runBootOnce(params: {
  cfg: MoltbotConfig;
  deps: CliDeps;
  workspaceDir: string;
}): Promise<BootRunResult> {
  const bootRuntime: RuntimeEnv = {
    log: () => {},
    error: (message) => log.error(String(message)),
    exit: defaultRuntime.exit,
  };
  let result: Awaited<ReturnType<typeof loadBootFile>>;
  try {
    result = await loadBootFile(params.workspaceDir);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`boot: failed to read ${BOOT_FILENAME}: ${message}`);
    return { status: "failed", reason: message };
  }

  if (result.status === "missing" || result.status === "empty") {
    return { status: "skipped", reason: result.status };
  }

  const sessionKey = resolveMainSessionKey(params.cfg);
  const message = buildBootPrompt(result.content ?? "");

  try {
    await agentCommand(
      {
        message,
        sessionKey,
        deliver: false,
      },
      bootRuntime,
      params.deps,
    );
    return { status: "ran" };
  } catch (err) {
    const messageText = err instanceof Error ? err.message : String(err);
    log.error(`boot: agent run failed: ${messageText}`);
    return { status: "failed", reason: messageText };
  }
}
