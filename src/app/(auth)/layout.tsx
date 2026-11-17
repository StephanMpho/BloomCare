export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-blush via-ivory to-lavender/60 px-4 py-10 dark:from-night dark:via-night dark:to-night-card">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="font-display text-4xl font-semibold">Bloom<span className="text-rose">Care</span></div>
          <p className="mt-1 text-muted dark:text-white/70">Nourishing you, caring for your little one.</p>
        </div>
        <div className="rounded-3xl border border-line bg-white/90 p-6 shadow-soft dark:border-night-line dark:bg-night-card">{children}</div>
        <p className="mt-4 text-center text-xs text-muted dark:text-white/60">BloomCare supports self-monitoring. It does not replace your doctor, midwife or clinic.</p>
      </div>
    </div>
  );
}
