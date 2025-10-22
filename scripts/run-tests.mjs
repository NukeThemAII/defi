import { startVitest } from "vitest/node";

async function main() {
  const vitest = await startVitest("test", [], {
    run: true,
    reporters: process.env.CI ? "default" : "basic",
  });

  const exitCode = await vitest?.close();
  if (typeof exitCode === "number" && exitCode > 0) {
    process.exit(exitCode);
  }
}

await main();
