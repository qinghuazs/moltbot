/**
 * 二进制文件检查模块
 * 提供必需 CLI 工具的存在性检查
 */
import { runExec } from "../process/exec.js";
import { defaultRuntime, type RuntimeEnv } from "../runtime.js";

/**
 * 确保必需的二进制文件存在
 * 如果缺失则输出错误并退出
 * @param name - 二进制文件名
 * @param exec - 执行函数（用于测试注入）
 * @param runtime - 运行时环境
 */
export async function ensureBinary(
  name: string,
  exec: typeof runExec = runExec,
  runtime: RuntimeEnv = defaultRuntime,
): Promise<void> {
  // 如果必需的 CLI 工具缺失则提前中止
  await exec("which", [name]).catch(() => {
    runtime.error(`Missing required binary: ${name}. Please install it.`);
    runtime.exit(1);
  });
}
