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
    const date = new Date(isoString);
    
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
export function getUKTimestamp(isoString: string): number {
  if (!isoString) return Date.now();
  return new Date(isoString).getTime();
}
