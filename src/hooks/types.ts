/**
 * 钩子类型定义模块
 * 定义钩子系统的所有类型，包括安装规范、元数据、调用策略等
 */

/** 钩子安装规范 */
export type HookInstallSpec = {
  /** 安装 ID */
  id?: string;
  /** 安装类型 */
  kind: "bundled" | "npm" | "git";
  /** 显示标签 */
  label?: string;
  /** npm 包名 */
  package?: string;
  /** Git 仓库地址 */
  repository?: string;
  /** 提供的二进制文件 */
  bins?: string[];
};

/** Moltbot 钩子元数据 */
export type MoltbotHookMetadata = {
  /** 是否始终启用 */
  always?: boolean;
  /** 钩子键名 */
  hookKey?: string;
  /** 表情符号 */
  emoji?: string;
  /** 主页 URL */
  homepage?: string;
  /** 此钩子处理的事件（如 ["command:new", "session:start"]） */
  events: string[];
  /** 可选的导出名称（默认："default"） */
  export?: string;
  /** 支持的操作系统 */
  os?: string[];
  /** 依赖要求 */
  requires?: {
    /** 必需的二进制文件 */
    bins?: string[];
    /** 任一二进制文件（满足其一即可） */
    anyBins?: string[];
    /** 必需的环境变量 */
    env?: string[];
    /** 必需的配置项 */
    config?: string[];
  };
  /** 安装规范列表 */
  install?: HookInstallSpec[];
};

/** 钩子调用策略 */
export type HookInvocationPolicy = {
  /** 是否启用 */
  enabled: boolean;
};

/** 解析后的钩子 frontmatter */
export type ParsedHookFrontmatter = Record<string, string>;

/** 钩子定义 */
export type Hook = {
  /** 钩子名称 */
  name: string;
  /** 钩子描述 */
  description: string;
  /** 来源类型 */
  source: "moltbot-bundled" | "moltbot-managed" | "moltbot-workspace" | "moltbot-plugin";
  /** 插件 ID（如果来自插件） */
  pluginId?: string;
  /** HOOK.md 文件路径 */
  filePath: string;
  /** 包含钩子的目录 */
  baseDir: string;
  /** 处理器模块路径（handler.ts/js） */
  handlerPath: string;
};

/** 钩子来源类型 */
export type HookSource = Hook["source"];

/** 钩子条目 */
export type HookEntry = {
  /** 钩子定义 */
  hook: Hook;
  /** frontmatter 数据 */
  frontmatter: ParsedHookFrontmatter;
  /** 元数据 */
  metadata?: MoltbotHookMetadata;
  /** 调用策略 */
  invocation?: HookInvocationPolicy;
};

/** 钩子资格检查上下文 */
export type HookEligibilityContext = {
  /** 远程环境信息 */
  remote?: {
    /** 支持的平台 */
    platforms: string[];
    /** 检查二进制文件是否存在 */
    hasBin: (bin: string) => boolean;
    /** 检查任一二进制文件是否存在 */
    hasAnyBin: (bins: string[]) => boolean;
    /** 备注 */
    note?: string;
  };
};

/** 钩子快照 */
export type HookSnapshot = {
  /** 钩子列表 */
  hooks: Array<{ name: string; events: string[] }>;
  /** 解析后的钩子 */
  resolvedHooks?: Hook[];
  /** 版本号 */
  version?: number;
};
