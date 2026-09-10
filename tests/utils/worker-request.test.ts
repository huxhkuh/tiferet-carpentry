import { afterEach, describe, expect, it, vi } from 'vitest';
import { workerRequest } from '../../src/utils/worker-request';

describe('worker request lifecycle', () => {
  afterEach(() => vi.useRealTimers());
  it('times out RPCs that never return and clears the timer after success', async () => {
    vi.useFakeTimers();
    const result = workerRequest(new Promise<never>(() => {}), null, 50);
    const rejected = expect(result).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(50);
    await rejected;
    await expect(workerRequest(Promise.resolve(42), null)).resolves.toBe(42);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects cancellation and ignores a later successful result', async () => {
    const controller = new AbortController();
    let finish: (value: number) => void = () => {};
    const result = workerRequest(
      new Promise<number>((resolve) => {
        finish = resolve;
      }),
      null,
      50,
      controller.signal,
    );
    controller.abort();
    finish(42);
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await expect(workerRequest(Promise.resolve(42), null, 50, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
  it.each(['error', 'messageerror'])('rejects a worker %s and removes listeners', async (eventName) => {
    const worker = new EventTarget() as Worker;
    const remove = vi.spyOn(worker, 'removeEventListener');
    const result = workerRequest(new Promise<never>(() => {}), worker);
    worker.dispatchEvent(new Event(eventName));
    await expect(result).rejects.toThrow('Background calculation failed');
    expect(remove).toHaveBeenCalledWith('error', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('messageerror', expect.any(Function));
  });
});
