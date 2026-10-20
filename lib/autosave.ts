// Debounced autosave for one string value (document HTML, or the title).
//
// Rules (SPEC "Reliability rules"):
// - send 800 ms after the last change
// - at most one request in flight; edits made meanwhile are sent right after it
// - network/server errors retry with backoff 2s, 4s, 8s… capped at 30s, under one
//   "retrying" state rather than one message per attempt
// - a conflict stops saving for good: nothing is silently overwritten
//
// Framework-free; React subscribes through useSyncExternalStore.

export type SaveOutcome =
  | { type: "saved" }
  | { type: "retry" } // network or server error
  | { type: "conflict" } // someone else saved first
  | { type: "failed"; message: string }; // rejected; try again on the next edit

export type SaveState =
  | { status: "saved" }
  | { status: "saving" }
  | { status: "retrying" }
  | { status: "conflict" }
  | { status: "failed"; message: string };

export const DEBOUNCE_MS = 800;
const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 30_000;

export function retryDelay(failures: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** (failures - 1), RETRY_MAX_MS);
}

export class Autosaver {
  private saved: string;
  private latest: string;
  private state: SaveState = { status: "saved" };
  private inFlight = false;
  private active = true;
  private failures = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly send: (value: string) => Promise<SaveOutcome>,
    initial = "",
  ) {
    this.saved = initial;
    this.latest = initial;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): SaveState => this.state;

  get savedValue(): string {
    return this.saved;
  }

  hasUnsavedChanges(): boolean {
    return this.inFlight || this.latest !== this.saved;
  }

  // Adopt a value loaded from the server as the new baseline.
  reset(value: string) {
    this.clearTimers();
    this.saved = value;
    this.latest = value;
    this.failures = 0;
    this.setState({ status: "saved" });
  }

  // Record a local change.
  update(value: string) {
    this.latest = value;
    if (this.state.status === "conflict") return;
    // While backing off, the scheduled retry will send the newest value.
    if (this.retryTimer !== undefined) return;

    clearTimeout(this.debounceTimer);
    this.debounceTimer = undefined;
    if (!this.inFlight && value === this.saved) {
      this.setState({ status: "saved" });
      return;
    }
    if (this.state.status !== "retrying") this.setState({ status: "saving" });
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      void this.flush();
    }, DEBOUNCE_MS);
  }

  // Send the newest value now, unless a request is already in flight.
  async flush(): Promise<void> {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = undefined;
    if (this.inFlight || this.state.status === "conflict") return;
    if (this.latest === this.saved) {
      this.clearTimers();
      this.setState({ status: "saved" });
      return;
    }
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;

    const value = this.latest;
    this.inFlight = true;
    if (this.state.status !== "retrying") this.setState({ status: "saving" });
    let outcome: SaveOutcome;
    try {
      outcome = await this.send(value);
    } catch {
      outcome = { type: "retry" };
    }
    this.inFlight = false;

    switch (outcome.type) {
      case "saved":
        this.saved = value;
        this.failures = 0;
        if (this.latest === this.saved) {
          this.setState({ status: "saved" });
        } else {
          this.setState({ status: "saving" });
          // Edits arrived during the request; send them now unless their debounce is still running.
          if (this.debounceTimer === undefined) void this.flush();
        }
        return;
      case "retry":
        this.failures += 1;
        this.setState({ status: "retrying" });
        this.clearTimers();
        if (this.active) {
          this.retryTimer = setTimeout(() => {
            this.retryTimer = undefined;
            void this.flush();
          }, retryDelay(this.failures));
        }
        return;
      case "conflict":
        this.clearTimers();
        this.setState({ status: "conflict" });
        return;
      case "failed":
        this.setState({ status: "failed", message: outcome.message });
        return;
    }
  }

  // The editor became visible again (Next.js keeps visited pages alive while hidden).
  resume() {
    this.active = true;
    if (this.debounceTimer === undefined && this.retryTimer === undefined) void this.flush();
  }

  // The editor is being hidden or unmounted: send pending edits now instead of dropping
  // them, and stop retrying in the background until resume().
  suspend() {
    this.active = false;
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    void this.flush();
  }

  private clearTimers() {
    clearTimeout(this.debounceTimer);
    clearTimeout(this.retryTimer);
    this.debounceTimer = undefined;
    this.retryTimer = undefined;
  }

  private setState(next: SaveState) {
    const prev = this.state;
    const unchanged =
      prev.status === next.status &&
      (prev.status !== "failed" || (next.status === "failed" && prev.message === next.message));
    if (unchanged) return;
    this.state = next;
    for (const listener of this.listeners) listener();
  }
}
