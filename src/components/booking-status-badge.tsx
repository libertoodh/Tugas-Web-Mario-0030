import { bookingStatusMeta, BookingStatusValue } from "@/lib/status";
import { Badge } from "./ui";

export function BookingStatusBadge({
  status,
  short = false,
}: {
  status: BookingStatusValue;
  short?: boolean;
}) {
  const meta = bookingStatusMeta[status];
  return (
    <Badge className={meta.className} dotClassName={meta.dot}>
      {short ? meta.short : meta.label}
    </Badge>
  );
}
