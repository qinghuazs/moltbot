/**
 * 剪贴板操作模块
 * 提供跨平台的剪贴板复制功能
 */
import { runCommandWithTimeout } from "../process/exec.js";

/**
 * 复制内容到系统剪贴板
 * 支持 macOS (pbcopy)、Linux (xclip/wl-copy)、Windows (clip.exe/PowerShell)
 * @param value - 要复制的内容
 * @returns 是否成功
 */
export async function copyToClipboard(value: string): Promise<boolean> {
  // 按优先级尝试不同的剪贴板命令
  const attempts: Array<{ argv: string[] }> = [
    { argv: ["pbcopy"] }, // macOS
    { argv: ["xclip", "-selection", "clipboard"] }, // Linux X11
    { argv: ["wl-copy"] }, // Linux Wayland
    { argv: ["clip.exe"] }, // WSL / Windows
    { argv: ["powershell", "-NoProfile", "-Command", "Set-Clipboard"] }, // Windows PowerShell
  ];

  for (const attempt of attempts) {
    try {
      const result = await runCommandWithTimeout(attempt.argv, {
        timeoutMs: 3_000,
        input: value,
      });
      if (result.code === 0 && !result.killed) return true;
    } catch {
      // 继续尝试下一个回退方案
    }
  }
  return false;
}
