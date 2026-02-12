import { postJson, JsonRpcRequest, JsonRpcResponse } from "../lib/http.js";
import { config } from "../lib/config.js";

type RpcBlock = {
  number?: string;
  timestamp?: string;
  transactions?: unknown[];
  size?: string;
};

export class MonadRpcClient {
  constructor(private rpcUrl = config.MONAD_RPC_URL) {}

  async batch<T>(calls: Array<{ method: string; params?: any }>, timeoutMs = 10_000): Promise<T[]> {
    const req: JsonRpcRequest[] = calls.map((c, idx) => ({
      jsonrpc: "2.0",
      id: idx + 1,
      method: c.method,
      params: c.params ?? []
    }));

    const res = await postJson<Array<JsonRpcResponse<T>>>(this.rpcUrl, req, timeoutMs);
    return res.map((r) => {
      if (r.error) throw new Error(`RPC error ${r.error.code}: ${r.error.message}`);
      return r.result as T;
    });
  }

  // These are intentionally generic wrappers; different Monad RPCs can be wired here.
  async getLatestBlock(): Promise<RpcBlock | null> {
    const [block] = await this.batch<RpcBlock>([{ method: "eth_getBlockByNumber", params: ["latest", true] }]);
    return block ?? null;
  }

  async getBlockByNumber(hexNumber: string): Promise<RpcBlock | null> {
    const [block] = await this.batch<RpcBlock>([{ method: "eth_getBlockByNumber", params: [hexNumber, true] }]);
    return block ?? null;
  }
}
