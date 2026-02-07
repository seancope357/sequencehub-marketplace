import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { PublishReadinessState } from './types';

interface PublishReadinessPanelProps {
  readiness: PublishReadinessState;
}

export function PublishReadinessPanel({ readiness }: PublishReadinessPanelProps) {
  if (readiness.ready) {
    return (
      <Alert className="border-green-500 bg-green-50 text-green-900">
        <CheckCircle2 className="h-5 w-5" />
        <AlertTitle>Ready To Publish</AlertTitle>
        <AlertDescription>
          All required checks are passing. You can publish this listing.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-amber-500 bg-amber-50 text-amber-900">
      <AlertCircle className="h-5 w-5" />
      <AlertTitle>Publish Requirements</AlertTitle>
      <AlertDescription>
        <ul className="list-disc space-y-1 pl-4 text-sm">
          {readiness.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
        {readiness.warnings.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-4 text-sm opacity-90">
            {readiness.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
