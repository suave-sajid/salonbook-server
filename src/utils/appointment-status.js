export function getAllowedPreviousStatuses(nextStatus) {
  if (nextStatus === "confirmed") return ["pending"];
  if (nextStatus === "cancelled") return ["pending", "confirmed"];
  return [];
}
