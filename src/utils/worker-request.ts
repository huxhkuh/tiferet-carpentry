/** Bound RPC lifetime and detach listeners even if a worker never replies. */
export function workerRequest<T>(
  promise: PromiseLike<T>,
  worker: Worker | null,
  timeoutMs = 30_000,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      worker?.removeEventListener('error', failed);
      worker?.removeEventListener('messageerror', failed);
      signal?.removeEventListener('abort', abort);
    };
    const failed = () => {
      cleanup();
      reject(new Error('Background calculation failed'));
    };
    const abort = () => {
      cleanup();
      reject(new DOMException('Export cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Background calculation timed out'));
    }, timeoutMs);
    worker?.addEventListener('error', failed);
    worker?.addEventListener('messageerror', failed);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    Promise.resolve(promise).then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}
