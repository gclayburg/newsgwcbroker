// Date/time formatting. Everything is shown in US Mountain Time, the site's home
// timezone, so server output is identical regardless of where the build runs.

const TZ = "America/Denver";

const longDate = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const shortDate = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "short",
  day: "numeric",
});

const time = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
});

/** "Sunday, November 8, 2026" */
export function formatLongDate(ts: string): string {
  return longDate.format(new Date(ts));
}

/** "Nov 8, 2026" */
export function formatShortDate(ts: string): string {
  return shortDate.format(new Date(ts));
}

/** "7:30 a.m. MT" */
export function formatTime(ts: string): string {
  return (
    time
      .format(new Date(ts))
      .replace(/ |\s/g, " ")
      .replace(" AM", " a.m.")
      .replace(" PM", " p.m.") + " MT"
  );
}

/** Long date for an edition's YYYY-MM-DD date field (treated as a calendar date). */
export function formatEditionDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  // Noon UTC is the same calendar day in Mountain Time.
  return longDate.format(new Date(Date.UTC(y, m - 1, d, 12)));
}
