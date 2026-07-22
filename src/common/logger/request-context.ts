import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContextStore {
  requestId: string;
  ip?: string;
  userId?: string | number;
}

export const requestContextStorage =
  new AsyncLocalStorage<RequestContextStore>();

export function getRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}

export function getRequestContext(): RequestContextStore | undefined {
  return requestContextStorage.getStore();
}
