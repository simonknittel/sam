export const formatDate = (
  date?: Date | null,
  style?: "extra_short" | "short" | "long",
) => {
  if (style === "long")
    return (
      date?.toLocaleDateString("de-DE", {
        timeZone: "Europe/Berlin",
        weekday: "short",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) || null
    );

  if (style === "short")
    return (
      date?.toLocaleDateString("de-DE", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }) || null
    );

  if (style === "extra_short")
    return (
      date?.toLocaleDateString("de-DE", {
        timeZone: "Europe/Berlin",
        month: "2-digit",
        day: "2-digit",
      }) || null
    );

  return (
    date?.toLocaleDateString("de-DE", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }) || null
  );
};
