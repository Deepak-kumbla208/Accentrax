/** Placeholder login. Wired to real auth in Phase 1. */
export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            A
          </div>
          <span className="text-lg font-semibold">Accentrax</span>
        </div>
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="mb-4 text-sm text-muted-foreground">Authentication arrives in Phase 1.</p>
        <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="Email"
            disabled
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            placeholder="Password"
            disabled
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled
            className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground opacity-60"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
