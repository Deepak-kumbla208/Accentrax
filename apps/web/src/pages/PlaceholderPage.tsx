import { Construction } from 'lucide-react';

/** Generic "coming in a later phase" page for nav destinations not yet built. */
export function PlaceholderPage({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Construction className="h-10 w-10 text-muted-foreground" />
      <h1 className="mt-4 text-xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Planned for {phase}.</p>
    </div>
  );
}
