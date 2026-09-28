/**
 * Parses an academic OD time slot string (e.g. "08:50 AM - 07:20 PM", "8:00 AM - 5:30 PM", "8 to 5:30", etc.)
 * into numeric startMinutes, endMinutes, and duration (in minutes).
 */
export const parseODTimeSlot = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') {
    return { startMinutes: 0, endMinutes: 0, duration: 0 };
  }

  // Normalize delimiters and spaces
  const clean = timeStr
    .trim()
    .replace(/(\d{1,2})\.(\d{2})/g, '$1:$2')
    .replace(/\s+(to|–|—)\s+/i, ' - ')
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, ' - ');

  const parts = clean.split(' - ');
  if (parts.length !== 2) {
    return { startMinutes: 0, endMinutes: 0, duration: 0 };
  }

  const parsePart = (str) => {
    const s = str.trim();
    if (!s) return null;

    const ampmMatch = s.match(/(AM|PM)/i);
    let ampm = ampmMatch ? ampmMatch[1].toUpperCase() : null;

    const timeMatch = s.match(/(\d{1,2})(?::(\d{2}))?/);
    if (!timeMatch) return null;

    let hour = parseInt(timeMatch[1], 10);
    const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;

    // Infer AM/PM in college schedule context (08:00 AM to 07:30 PM) if omitted
    if (!ampm) {
      if (hour >= 13) {
        return hour * 60 + min;
      } else if (hour >= 8 && hour < 12) {
        ampm = 'AM';
      } else if (hour === 12) {
        ampm = 'PM';
      } else if (hour < 8) {
        ampm = 'PM';
      }
    }

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    return hour * 60 + min;
  };

  const startMinutes = parsePart(parts[0]);
  const endMinutes = parsePart(parts[1]);

  if (startMinutes === null || endMinutes === null) {
    return { startMinutes: 0, endMinutes: 0, duration: 0 };
  }

  let duration = endMinutes - startMinutes;
  if (duration < 0) duration += 24 * 60; // overnight safety

  return { startMinutes, endMinutes, duration };
};

/**
 * Sorts an array of OD student records:
 * 1. Date ascending (e.g. 2026-08-24 before 2026-08-25)
 * 2. Duration descending (longer duration first, e.g. 8:50 AM - 7:20 PM [10h 30m] before 8:00 AM - 5:30 PM [9h 30m])
 * 3. Start time ascending (starting from 8:00 AM comes first among equal duration)
 * 4. End time descending
 * 5. Student registration number ascending
 */
export const sortODStudents = (students) => {
  if (!Array.isArray(students)) return [];

  return [...students].sort((a, b) => {
    // 1. Date ascending
    const dateA = a.date ? String(a.date).trim() : '';
    const dateB = b.date ? String(b.date).trim() : '';
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    const timeA = parseODTimeSlot(a.time);
    const timeB = parseODTimeSlot(b.time);

    // 2. Duration descending (longest duration first)
    if (timeA.duration !== timeB.duration) {
      return timeB.duration - timeA.duration;
    }

    // 3. Start time ascending (earlier start comes first, e.g. 8:00 AM before 8:50 AM)
    if (timeA.startMinutes !== timeB.startMinutes) {
      return timeA.startMinutes - timeB.startMinutes;
    }

    // 4. End time descending
    if (timeA.endMinutes !== timeB.endMinutes) {
      return timeB.endMinutes - timeA.endMinutes;
    }

    // 5. Registration number ascending
    const regA = a.registrationNumber ? String(a.registrationNumber).trim().toUpperCase() : '';
    const regB = b.registrationNumber ? String(b.registrationNumber).trim().toUpperCase() : '';
    return regA.localeCompare(regB);
  });
};

