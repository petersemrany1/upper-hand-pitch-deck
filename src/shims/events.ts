// @ts-expect-error The browser events package ships CommonJS without bundled declarations for this subpath.
import EventEmitterModule from "events/events.js";

const EventEmitter =
  (EventEmitterModule as typeof EventEmitterModule & { EventEmitter?: typeof EventEmitterModule }).EventEmitter ??
  EventEmitterModule;

const once = (EventEmitterModule as typeof EventEmitterModule & { once?: unknown }).once;

export { EventEmitter, once };
export default EventEmitterModule;