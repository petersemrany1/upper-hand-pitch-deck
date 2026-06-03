type Listener = (...args: unknown[]) => void;

class EventEmitter {
  private events = new Map<string | symbol, Listener[]>();

  on(eventName: string | symbol, listener: Listener) {
    const listeners = this.events.get(eventName) ?? [];
    listeners.push(listener);
    this.events.set(eventName, listeners);
    return this;
  }

  addListener(eventName: string | symbol, listener: Listener) {
    return this.on(eventName, listener);
  }

  once(eventName: string | symbol, listener: Listener) {
    const wrapped: Listener = (...args) => {
      this.off(eventName, wrapped);
      listener(...args);
    };
    return this.on(eventName, wrapped);
  }

  off(eventName: string | symbol, listener: Listener) {
    const listeners = this.events.get(eventName);
    if (!listeners) return this;
    this.events.set(
      eventName,
      listeners.filter((candidate) => candidate !== listener),
    );
    return this;
  }

  removeListener(eventName: string | symbol, listener: Listener) {
    return this.off(eventName, listener);
  }

  removeAllListeners(eventName?: string | symbol) {
    if (eventName === undefined) this.events.clear();
    else this.events.delete(eventName);
    return this;
  }

  emit(eventName: string | symbol, ...args: unknown[]) {
    const listeners = this.events.get(eventName) ?? [];
    for (const listener of [...listeners]) listener(...args);
    return listeners.length > 0;
  }

  listeners(eventName: string | symbol) {
    return [...(this.events.get(eventName) ?? [])];
  }

  listenerCount(eventName: string | symbol) {
    return this.events.get(eventName)?.length ?? 0;
  }
}

function once(emitter: EventEmitter, eventName: string | symbol) {
  return new Promise<unknown[]>((resolve) => {
    emitter.once(eventName, (...args) => resolve(args));
  });
}

export { EventEmitter, once };
export default EventEmitter;