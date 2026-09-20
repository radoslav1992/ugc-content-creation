import { configuredOrigin } from "./config";
import { Container } from "@cloudflare/containers";
import type { Env } from "./types";
export class MediaRenderer extends Container<Env> {
  defaultPort = 8080;
  sleepAfter = "1m";
  envVars = {
    SOURCE_ORIGIN: configuredOrigin(this.env),
  };
}
