#!/usr/bin/env node
import { runCli } from "./index.js";

const result = runCli(process.argv.slice(2));
process.stdout.write(result.output + "\n");
process.exit(result.status === "ok" ? 0 : 1);
