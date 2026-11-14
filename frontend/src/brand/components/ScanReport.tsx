import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/brand/cn";
import { Button } from "@/brand/components/Button";
import { ConfirmDialog } from "@/brand/components/ConfirmDialog";
import type { ScanReportStatus } from "@/domain/scanReport";

interface ScanReportProps {
  status: ScanReportStatus;
  error: string | null;
  onSend: () => void;
  className?: string;
}

const DISCLAIMER =
  "We'll get the photo and why it couldn't be read, so we can learn to read cards like it. Nothing about your account goes with it.";

function ScanReport({ status, error, onSend, className }: ScanReportProps) {
  const [open, setOpen] = useState(false);
  const sent = status === "sent";
  const sending = status === "sending";

  return (
    <>
      <Button
        variant="link"
        size="inline"
        data-slot="scan-report"
        aria-disabled={sent || undefined}
        onClick={sent ? undefined : () => setOpen(true)}
        className={cn(
          "font-normal text-current underline decoration-1 aria-disabled:cursor-default aria-disabled:no-underline",
          className,
        )}
      >
        {sent && <Check data-icon="inline-start" />}
        {sent ? "Report sent" : "Report scan"}
      </Button>
      <ConfirmDialog
        open={open && !sent}
        onOpenChange={setOpen}
        tone="default"
        title="Report this scan?"
        detail={DISCLAIMER}
        confirmLabel={sending ? "Sending report…" : "Send report"}
        pending={sending}
        error={error}
        onConfirm={onSend}
      />
    </>
  );
}

export { ScanReport };
export type { ScanReportProps };
