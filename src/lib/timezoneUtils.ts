/**
 * Convert a local datetime-local input value to UTC, assuming the input represents UK time
 * @param localDateTimeString - Value from datetime-local input (YYYY-MM-DDTHH:mm)
 * @returns ISO string in UTC (representing UK time)
 */
export function localDateTimeToUKTimezone(localDateTimeString: string): string {
  if (!localDateTimeString) return '';
  
  try {
    // Parse the input datetime string
    const [datePart, timePart] = localDateTimeString.split('T');
    const [year, month, day] = datePart.split('-');
    const [hours, minutes] = timePart.split(':');
    
    // Create a date object from these components
    // Note: Date constructor uses browser's local timezone
    const inputDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      0
    );
    
    // Get the current time in UTC
    const nowUTC = new Date();
    
    // Format current UTC time as if it's in UK timezone to calculate offset
    const ukFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const ukTimeStr = ukFormatter.format(nowUTC); // e.g., "2024-03-10 15:30:00"
    
    // Parse this as if it's local time to see the offset
    const [ukDate, ukTime] = ukTimeStr.split(' ');
    const [ukYear, ukMonth, ukDay] = ukDate.split('-');
    const [ukHours, ukMinutes, ukSeconds] = ukTime.split(':');
    
    const ukAsLocalDate = new Date(
      parseInt(ukYear),
      parseInt(ukMonth) - 1,
      parseInt(ukDay),
      parseInt(ukHours),
      parseInt(ukMinutes),
      parseInt(ukSeconds)
    );
    
    // The offset between UTC and our browser's interpretation
    const offset = nowUTC.getTime() - ukAsLocalDate.getTime();
    
    // Apply this offset to our input date to get the correct UTC time
    const correctedUTC = new Date(inputDate.getTime() + offset);
    
    return correctedUTC.toISOString();
  } catch (error) {
    console.error('Error converting to UK timezone:', error);
    return '';
  }
}

/**
 * Format a UTC ISO string to UK timezone display format
 * @param isoString - ISO string from database (stored in UTC)
 * @returns Formatted string in UK timezone (DD/MM/YYYY HH:mm:ss format)
 */
export function formatUKTime(isoString: string): string {
  if (!isoString) return '—';
  
  try {
    const date = new Date(getUKTimestamp(isoString));
    
    // Format in UK timezone
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    return formatter.format(date);
  } catch (error) {
    console.error('Error formatting UK time:', error);
    return '—';
  }
}

/**
 * Convert UTC ISO string to UK timezone Date object for comparisons
 * @param isoString - ISO string from database
 * @returns Timestamp (useful for comparisons with current time)
 */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const values: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') values[part.type] = part.value;
  });

  const asUTC = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return asUTC - date.getTime();
}

function parseTimeParts(timePart: string | undefined) {
  if (!timePart) return { hour: 0, minute: 0, second: 0 };
  const [hour, minute, second] = timePart.split(':');
  return {
    hour: Number(hour || 0),
    minute: Number(minute || 0),
    second: Number(second || 0),
  };
}

/**
 * Convert an ISO-like string stored without timezone to a UTC timestamp,
 * assuming the stored value represents UK local time.
 */
export function getUKTimestamp(isoString: string): number {
  if (!isoString) return Date.now();

  const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(isoString);
  if (hasTimezone) {
    return new Date(isoString).getTime();
  }

  const normalized = isoString.includes('T') ? isoString : isoString.replace(' ', 'T');
  const [datePart, timePart] = normalized.split('T');
  const [year, month, day] = (datePart || '').split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(isoString).getTime();
  }

  const { hour, minute, second } = parseTimeParts(timePart);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), 'Europe/London');
  return utcGuess - offset;
}
