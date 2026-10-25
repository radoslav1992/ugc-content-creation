import { configuredOrigin } from "./config";
import { Container } from "@cloudflare/containers";
import type { Env } from "./types";
export class MediaRenderer extends Container<Env> {
  defaultPort = 8080;
  sleepAfter = "1m";
  envVars = {
    SOURCE_ORIGIN: configuredOrigin(this.env),
  };
  /** Whether this idle container was already asked to stop. */
  private stopping = false;
  /**
   * An idle container (no request for `sleepAfter`; jobs are polled every few seconds) is asked to stop (SIGTERM:
   * renderer/server.py exits), and killed if it is still running at the next check: the library only ever asks, and a
   * container that keeps running is billed for its memory the whole time.
   */
  override async onActivityExpired() {
    if (!this.ctx.container?.running) return;
    if (this.stopping) return this.destroy();
    this.stopping = true;
    await this.stop();
  }
  override onStart() {
    this.stopping = false;
  }
}
