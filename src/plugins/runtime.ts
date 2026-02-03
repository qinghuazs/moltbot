/**
 * 插件运行时模块
 * 管理全局插件注册表的状态，提供插件注册表的访问和设置功能
 */
import type { PluginRegistry } from "./registry.js";

/**
 * 创建空的插件注册表
 * @returns 空注册表对象
 */
const createEmptyRegistry = (): PluginRegistry => ({
  plugins: [],
  tools: [],
  hooks: [],
  typedHooks: [],
  channels: [],
  providers: [],
  gatewayHandlers: {},
  httpHandlers: [],
  httpRoutes: [],
  cliRegistrars: [],
  services: [],
  commands: [],
  diagnostics: [],
});

/** 注册表状态的全局符号键 */
const REGISTRY_STATE = Symbol.for("moltbot.pluginRegistryState");

/** 注册表状态类型 */
type RegistryState = {
  /** 当前注册表 */
  registry: PluginRegistry | null;
  /** 缓存键 */
  key: string | null;
};

/** 全局注册表状态（使用 Symbol 确保跨模块单例） */
const state: RegistryState = (() => {
  const globalState = globalThis as typeof globalThis & {
    [REGISTRY_STATE]?: RegistryState;
  };
  if (!globalState[REGISTRY_STATE]) {
    globalState[REGISTRY_STATE] = {
      registry: createEmptyRegistry(),
      key: null,
    };
  }
  return globalState[REGISTRY_STATE] as RegistryState;
})();

/**
 * 设置活动的插件注册表
 * @param registry - 插件注册表
 * @param cacheKey - 可选的缓存键
 */
export function setActivePluginRegistry(registry: PluginRegistry, cacheKey?: string) {
  state.registry = registry;
  state.key = cacheKey ?? null;
}

/**
 * 获取活动的插件注册表
 * @returns 插件注册表，未设置返回 null
 */
export function getActivePluginRegistry(): PluginRegistry | null {
  return state.registry;
}

/**
 * 获取活动的插件注册表（必需）
 * 如果未设置则创建空注册表
 * @returns 插件注册表
 */
export function requireActivePluginRegistry(): PluginRegistry {
  if (!state.registry) {
    state.registry = createEmptyRegistry();
  }
  return state.registry;
}

/**
 * 获取活动插件注册表的缓存键
 * @returns 缓存键，未设置返回 null
 */
export function getActivePluginRegistryKey(): string | null {
  return state.key;
}
