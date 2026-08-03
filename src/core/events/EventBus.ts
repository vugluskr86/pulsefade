export type Unsubscribe = () => void;

/** Типизированная шина. Системы общаются событиями, а не прямыми ссылками (DIP). */
export class EventBus<TEvents extends Record<string, unknown>> {
  private readonly handlers = new Map<keyof TEvents, Set<(payload: never) => void>>();

  on<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): Unsubscribe {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as (payload: never) => void);
    return () => {
      set?.delete(handler as (payload: never) => void);
    };
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) (handler as (value: TEvents[K]) => void)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}
