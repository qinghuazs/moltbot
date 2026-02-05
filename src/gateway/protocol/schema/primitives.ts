/**
 * 网关协议基础类型 Schema 模块
 *
 * 该模块定义了网关协议中使用的基础类型 Schema，包括：
 * - 非空字符串类型
 * - 会话标签字符串类型
 * - 网关客户端 ID 类型
 * - 网关客户端模式类型
 *
 * @module gateway/protocol/schema/primitives
 */

import { Type } from "@sinclair/typebox";
import { SESSION_LABEL_MAX_LENGTH } from "../../../sessions/session-label.js";
import { GATEWAY_CLIENT_IDS, GATEWAY_CLIENT_MODES } from "../client-info.js";

/** 非空字符串 Schema */
export const NonEmptyString = Type.String({ minLength: 1 });

/** 会话标签字符串 Schema，限制最大长度 */
export const SessionLabelString = Type.String({
  minLength: 1,
  maxLength: SESSION_LABEL_MAX_LENGTH,
});

/** 网关客户端 ID Schema，枚举所有有效的客户端 ID */
export const GatewayClientIdSchema = Type.Union(
  Object.values(GATEWAY_CLIENT_IDS).map((value) => Type.Literal(value)),
);

/** 网关客户端模式 Schema，枚举所有有效的客户端模式 */
export const GatewayClientModeSchema = Type.Union(
  Object.values(GATEWAY_CLIENT_MODES).map((value) => Type.Literal(value)),
);
