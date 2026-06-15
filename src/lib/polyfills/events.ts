export class EventEmitter {
  on() { return this; }
  once() { return this; }
  off() { return this; }
  emit() {}
  addListener() { return this; }
  removeListener() { return this; }
}
export default { EventEmitter };
