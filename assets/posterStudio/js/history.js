// history.js — undo/redo stack
export class History {
  constructor(state) {
    this.state = state;
    this.stack = [];
    this.index = -1;
    this.max = 100;
    this.suspended = false;
  }
  push() {
    if (this.suspended) return;
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(this.state.serialize());
    if (this.stack.length > this.max) this.stack.shift();
    else this.index++;
  }
  undo() {
    if (this.index <= 0) return;
    this.index--;
    this.state.load(this.stack[this.index]);
    this.state.trigger('history');
  }
  redo() {
    if (this.index >= this.stack.length - 1) return;
    this.index++;
    this.state.load(this.stack[this.index]);
    this.state.trigger('history');
  }
}
