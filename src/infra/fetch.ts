/**
 * Fetch 包装器模块
 *
 * 提供增强的 fetch 函数，包括：
 * - AbortSignal 兼容性处理
 * - 流式请求的 duplex 模式支持
 * - preconnect 方法透传
 */

/**
 * 带 preconnect 方法的 fetch 类型
 */
type FetchWithPreconnect = typeof fetch & {
  preconnect: (url: string, init?: { credentials?: RequestCredentials }) => void;
};

/**
 * 带 duplex 选项的 RequestInit 类型
 */
type RequestInitWithDuplex = RequestInit & { duplex?: "half" };

/**
 * 为请求添加 duplex 选项
 *
 * 当请求包含 body 时，自动添加 duplex: "half" 以支持流式请求。
 *
 * @param init - 原始请求配置
 * @param input - 请求输入
 * @returns 添加了 duplex 的请求配置
 */
function withDuplex(
  init: RequestInit | undefined,
  input: RequestInfo | URL,
): RequestInit | undefined {
  const hasInitBody = init?.body != null;
  const hasRequestBody =
    !hasInitBody &&
    typeof Request !== "undefined" &&
    input instanceof Request &&
    input.body != null;
  if (!hasInitBody && !hasRequestBody) return init;
  if (init && "duplex" in (init as Record<string, unknown>)) return init;
  return init
    ? ({ ...init, duplex: "half" as const } as RequestInitWithDuplex)
    : ({ duplex: "half" as const } as RequestInitWithDuplex);
}

/**
 * 包装 fetch 以处理 AbortSignal 兼容性
 *
 * 某些环境中的 AbortSignal 可能不完全兼容，
 * 此函数创建一个新的 AbortController 来桥接信号。
 *
 * @param fetchImpl - 原始 fetch 实现
 * @returns 包装后的 fetch 函数
 */
export function wrapFetchWithAbortSignal(fetchImpl: typeof fetch): typeof fetch {
  const wrapped = ((input: RequestInfo | URL, init?: RequestInit) => {
    const patchedInit = withDuplex(init, input);
    const signal = patchedInit?.signal;
    if (!signal) return fetchImpl(input, patchedInit);
    if (typeof AbortSignal !== "undefined" && signal instanceof AbortSignal) {
      return fetchImpl(input, patchedInit);
    }
    if (typeof AbortController === "undefined") {
      return fetchImpl(input, patchedInit);
    }
    if (typeof signal.addEventListener !== "function") {
      return fetchImpl(input, patchedInit);
    }
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
    const response = fetchImpl(input, { ...patchedInit, signal: controller.signal });
    if (typeof signal.removeEventListener === "function") {
      void response.finally(() => {
        signal.removeEventListener("abort", onAbort);
      });
    }
    return response;
  }) as FetchWithPreconnect;

  const fetchWithPreconnect = fetchImpl as FetchWithPreconnect;
  wrapped.preconnect =
    typeof fetchWithPreconnect.preconnect === "function"
      ? fetchWithPreconnect.preconnect.bind(fetchWithPreconnect)
      : () => {};

  return Object.assign(wrapped, fetchImpl);
}

/**
 * 解析 fetch 实现
 *
 * 返回包装后的 fetch 函数，优先使用传入的实现，
 * 否则使用全局 fetch。
 *
 * @param fetchImpl - 可选的 fetch 实现
 * @returns 包装后的 fetch 函数，或 undefined
 */
export function resolveFetch(fetchImpl?: typeof fetch): typeof fetch | undefined {
  const resolved = fetchImpl ?? globalThis.fetch;
  if (!resolved) return undefined;
  return wrapFetchWithAbortSignal(resolved);
}
