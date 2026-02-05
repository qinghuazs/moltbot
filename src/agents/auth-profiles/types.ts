/**
 * 认证配置类型定义模块
 *
 * 该模块定义了认证配置系统使用的所有类型，包括：
 * - API 密钥凭证类型
 * - OAuth 凭证类型
 * - Token 凭证类型
 * - 认证配置存储结构
 * - 配置使用统计信息
 *
 * @module agents/auth-profiles/types
 */

import type { OAuthCredentials } from "@mariozechner/pi-ai";

import type { MoltbotConfig } from "../../config/config.js";

/** API 密钥凭证类型 */
export type ApiKeyCredential = {
  /** 凭证类型标识 */
  type: "api_key";
  /** 提供商标识符 */
  provider: string;
  /** API 密钥 */
  key: string;
  /** 关联的邮箱地址（可选） */
  email?: string;
};

export type TokenCredential = {
  /**
   * Static bearer-style token (often OAuth access token / PAT).
   * Not refreshable by moltbot (unlike `type: "oauth"`).
   */
  type: "token";
  provider: string;
  token: string;
  /** Optional expiry timestamp (ms since epoch). */
  expires?: number;
  email?: string;
};

/** OAuth 凭证类型，扩展自 pi-ai 的 OAuthCredentials */
export type OAuthCredential = OAuthCredentials & {
  /** 凭证类型标识 */
  type: "oauth";
  /** 提供商标识符 */
  provider: string;
  /** OAuth 客户端 ID（可选） */
  clientId?: string;
  /** 关联的邮箱地址（可选） */
  email?: string;
};

/** 认证配置凭证联合类型，可以是 API 密钥、Token 或 OAuth 凭证 */
export type AuthProfileCredential = ApiKeyCredential | TokenCredential | OAuthCredential;

/**
 * 认证配置失败原因类型
 * - auth: 认证失败
 * - format: 格式错误
 * - rate_limit: 速率限制
 * - billing: 计费问题
 * - timeout: 超时
 * - unknown: 未知错误
 */
export type AuthProfileFailureReason =
  | "auth"
  | "format"
  | "rate_limit"
  | "billing"
  | "timeout"
  | "unknown";

/** Per-profile usage statistics for round-robin and cooldown tracking */
export type ProfileUsageStats = {
  lastUsed?: number;
  cooldownUntil?: number;
  disabledUntil?: number;
  disabledReason?: AuthProfileFailureReason;
  errorCount?: number;
  failureCounts?: Partial<Record<AuthProfileFailureReason, number>>;
  lastFailureAt?: number;
};

/**
 * 认证配置存储结构
 * 包含所有认证配置及其元数据
 */
export type AuthProfileStore = {
  /** 存储格式版本号 */
  version: number;
  /** 认证配置映射表，键为配置 ID */
  profiles: Record<string, AuthProfileCredential>;
  /**
   * 可选的每个代理首选配置顺序覆盖
   * 允许为特定代理锁定/覆盖认证轮换，而无需更改全局配置
   */
  order?: Record<string, string[]>;
  /** 每个提供商最后成功使用的配置 ID */
  lastGood?: Record<string, string>;
  /** 每个配置的使用统计信息，用于轮询轮换 */
  usageStats?: Record<string, ProfileUsageStats>;
};

/** 认证配置 ID 修复结果 */
export type AuthProfileIdRepairResult = {
  /** 更新后的配置 */
  config: MoltbotConfig;
  /** 变更描述列表 */
  changes: string[];
  /** 是否进行了迁移 */
  migrated: boolean;
  /** 原配置 ID */
  fromProfileId?: string;
  /** 新配置 ID */
  toProfileId?: string;
};
