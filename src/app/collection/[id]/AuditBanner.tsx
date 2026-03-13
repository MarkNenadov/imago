interface AuditBannerProps {
  missingFields: string[];
}

export function AuditBanner({ missingFields }: AuditBannerProps) {
  if (missingFields.length === 0) return null;

  return (
    <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <span className="font-medium">Incomplete: </span>
      {missingFields.join(", ")}
    </div>
  );
}
