/**
 * 渠道 Zod Schema 定义
 *
 * 定义渠道心跳可见性等通用渠道配置 Schema。
 */
import { z } from "zod";

export const ChannelHeartbeatVisibilitySchema = z
  .object({
    showOk: z.boolean().optional(),
    showAlerts: z.boolean().optional(),
    useIndicator: z.boolean().optional(),
  })
  .strict()
  .optional();
