import { Page } from "./Page";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <Page>
      <div className="flex flex-col items-center pt-32 text-muted text-sm">
        <div
          className="w-10 h-10 mb-6 rounded-full border-2 border-border border-t-gold"
          style={{ animation: "gw-spin 0.8s linear infinite" }}
        />
        {label}
      </div>
    </Page>
  );
}

export default Loading;
