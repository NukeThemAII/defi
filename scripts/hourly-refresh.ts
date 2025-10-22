import "dotenv/config";

import { prisma } from "@/src/lib/prisma";
import { runRefreshCycle, startHourlyRefresh } from "@/src/jobs/hourly-refresh";

async function main() {
  console.info("[refresh] Booting hourly refresh worker…");

  const task = startHourlyRefresh();

  try {
    await runRefreshCycle();
    console.info("[refresh] Initial snapshot cycle completed");
  } catch (error) {
    console.error("[refresh] Initial snapshot cycle failed", error);
  }

  const shutdown = async () => {
    console.info("[refresh] Shutting down refresh worker…");
    void task.stop();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void main();
