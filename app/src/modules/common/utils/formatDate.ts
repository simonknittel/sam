export const formatDate = (
  date?: Date | null,
  style?: "extra_short" | "short" | "long",
) => {
  if (style === "long")
    // Example: "Do, 4. September 2024, 14:30"
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
    // Example: "04.09.2024"
    return (
      date?.toLocaleDateString("de-DE", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }) || null
    );

  if (style === "extra_short")
    // Example: "04.09."
    return (
      date?.toLocaleDateString("de-DE", {
        timeZone: "Europe/Berlin",
        month: "2-digit",
        day: "2-digit",
      }) || null
    );

  return (
    // Example: "04.09.2024, 14:30"
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
