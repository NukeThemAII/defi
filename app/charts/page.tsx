import Link from "next/link";

export default function ChartsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Charts</h1>
        <p className="text-sm text-muted-foreground">
          Visualizations for APY, TVL, and earnings are in progress. Historical data is already stored via hourly
          snapshots—check the <Link href="/snapshots" className="underline-offset-4 hover:underline">snapshots</Link>{" "}
          page in the meantime.
        </p>
      </header>
      <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        Charting UI coming soon.
      </div>
    </div>
  );
}

