import { startVitest } from "vitest/node";

async function main() {
  try {
    const vitest = await startVitest("test", [], {
      run: true,
      reporters: [["default", { summary: false }]],
    });

    await vitest?.start();
    const exitCode = await vitest?.close();

    if (exitCode && exitCode > 0) {
      process.exit(exitCode);
    }
  } catch (error) {
    console.error("Vitest execution failed:\n", error);
    process.exit(1);
  }
}

await main();
