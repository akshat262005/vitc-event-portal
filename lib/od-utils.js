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

// ============================================================
// CONSOLIDATED EVENT / OD EXCEL PROCESSOR (THEORY SLOTS)
// Matches Python Consolidated Event / OD Excel Processor
// ============================================================

export const THEORY_SLOTS = [
  ['08:00', '08:50'],
  ['08:55', '09:45'],
  ['09:50', '10:40'],
  ['10:45', '11:35'],
  ['11:40', '12:30'],
  ['12:35', '13:25'],
  ['14:00', '14:50'],
  ['14:55', '15:45'],
  ['15:50', '16:40'],
  ['16:45', '17:35'],
  ['17:40', '18:30'],
  ['18:35', '19:25'],
];

export const hhmmToMinutes = (x) => {
  if (!x || typeof x !== 'string') return 0;
  const [h, m] = x.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const minutesToHHMM = (minutes) => {
  const norm = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const THEORY_BOUNDARIES = THEORY_SLOTS.map(([startStr, endStr]) => ({
  start: startStr,
  end: endStr,
  startMin: hhmmToMinutes(startStr),
  endMin: hhmmToMinutes(endStr),
}));

export const REGEX_REG_NO = /\b\d{2}[A-Za-z]{2,5}\d{4}\b/i;

export const extractRegNo = (text) => {
  if (!text) return null;
  const match = String(text).match(REGEX_REG_NO);
  return match ? match[0].toUpperCase() : null;
};

export const cleanDate = (value, defaultYear = 2026) => {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) {
    return value.toISOString().split('T')[0];
  }
  let text = String(value).trim();
  if (!text) return null;

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  // Format: DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = String(ddmmyyyy[1]).padStart(2, '0');
    const month = String(ddmmyyyy[2]).padStart(2, '0');
    return `${ddmmyyyy[3]}-${month}-${day}`;
  }

  // Month names
  const months = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const textLower = text.toLowerCase().replace(/(\d{1,2})(st|nd|rd|th)/, '$1');
  const monthMatch = textLower.match(/\b(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?\b/);
  if (monthMatch && months[monthMatch[2]]) {
    const day = String(monthMatch[1]).padStart(2, '0');
    const m = months[monthMatch[2]];
    const y = monthMatch[3] || defaultYear;
    return `${y}-${m}-${day}`;
  }

  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return text;
};

export const parseSingleTime = (value, defaultMeridiem = null) => {
  if (!value) return null;
  let text = String(value).trim().toLowerCase().replace(/\./g, ':').replace(/\s+/g, '');
  if (!text) return null;

  const meridiemMatch = text.match(/(am|pm)$/i);
  let meridiem = null;
  if (meridiemMatch) {
    meridiem = meridiemMatch[1].toLowerCase();
    text = text.slice(0, -2);
  } else if (defaultMeridiem) {
    meridiem = defaultMeridiem.toLowerCase();
  }

  let hour = 0;
  let minute = 0;
  if (text.includes(':')) {
    const parts = text.split(':');
    hour = parseInt(parts[0], 10);
    minute = parseInt(parts[1], 10);
  } else {
    hour = parseInt(text, 10);
    minute = 0;
  }

  if (isNaN(hour) || isNaN(minute) || minute < 0 || minute > 59) return null;

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'pm' && hour !== 12) hour += 12;
    else if (meridiem === 'am' && hour === 12) hour = 0;
  } else {
    if (hour < 0 || hour > 23) return null;
  }

  return hour * 60 + minute;
};

export const parseTimeRanges = (text) => {
  if (!text) return [];
  let s = String(text).trim().toLowerCase();
  if (!s) return [];

  s = s.replace(/[–—]/g, '-').replace(/\s+to\s+/gi, ' - ');
  // Split multiple ranges ONLY on "n" or "and"
  const parts = s.split(/\s+(?:n|and)\s+/i);
  const ranges = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^\s*([0-9]{1,2}(?::[0-9]{1,2})?\s*(?:am|pm)?)\s*-\s*([0-9]{1,2}(?::[0-9]{1,2})?\s*(?:am|pm)?)\s*$/i);
    if (!match) continue;

    let startText = match[1].trim();
    let endText = match[2].trim();

    const startAmPm = startText.match(/(am|pm)/i);
    const endAmPm = endText.match(/(am|pm)/i);

    if (startAmPm && !endAmPm) {
      endText += startAmPm[1];
    } else if (endAmPm && !startAmPm) {
      startText += endAmPm[1];
    }

    const startMin = parseSingleTime(startText);
    const endMin = parseSingleTime(endText);

    if (startMin === null || endMin === null || endMin <= startMin) continue;

    ranges.push({ startMin, endMin, raw: trimmed });
  }

  return ranges;
};

export const standardizeTime = (startMin, endMin) => {
  if (startMin === null || endMin === null || endMin <= startMin) return null;

  // Start: Snap DOWN to the latest theory start <= raw start
  const startCandidates = THEORY_BOUNDARIES.filter(slot => slot.startMin <= startMin).map(slot => slot.startMin);
  const stdStartMin = startCandidates.length > 0 ? Math.max(...startCandidates) : startMin;

  // End: Snap UP to the earliest theory end >= raw end
  const endCandidates = THEORY_BOUNDARIES.filter(slot => slot.endMin >= endMin).map(slot => slot.endMin);
  const stdEndMin = endCandidates.length > 0 ? Math.min(...endCandidates) : endMin;

  if (stdEndMin <= stdStartMin) return null;

  const duration = stdEndMin - stdStartMin;
  return {
    time: `${minutesToHHMM(stdStartMin)}-${minutesToHHMM(stdEndMin)}`,
    duration,
    startMin: stdStartMin,
    endMin: stdEndMin,
  };
};

/**
 * Builds a 3-sheet Consolidated Event / OD Workbook adhering to Python processor logic:
 * Sheets:
 *   1. "Final Output" (Sorted by Date asc, Duration desc, Start asc, Reg No asc; blank row between groups)
 *   2. "Review"
 *   3. "Theory Slots"
 */
export const buildConsolidatedODWorkbook = (odRecords, xlsx) => {
  const records = Array.isArray(odRecords) ? odRecords : [odRecords];
  const outputRows = [];
  const reviewRows = [];

  for (const od of records) {
    if (!od) continue;
    const eventName = od.eventName || 'Event';
    const metadataEventDate = cleanDate(od.eventDate);
    const sourceLabel = od.clubName ? `${od.clubName} | ${eventName}` : eventName;
    const students = Array.isArray(od.students) ? od.students : [];

    for (const student of students) {
      const regNo = extractRegNo(student.registrationNumber);
      if (!regNo) {
        reviewRows.push({
          SOURCE: sourceLabel,
          ORIGINAL: `${student.studentName || 'Student'} | ${student.registrationNumber || ''}`,
          ISSUE: 'Missing or invalid Registration Number'
        });
        continue;
      }

      // DATE PRIORITY: 1. Student's own Date column, 2. Event Date metadata
      const studentDate = student.date ? cleanDate(student.date) : null;
      const finalDate = studentDate || metadataEventDate;

      if (!finalDate) {
        reviewRows.push({
          SOURCE: sourceLabel,
          ORIGINAL: `${regNo} | Time=${student.time || ''}`,
          ISSUE: 'Date missing'
        });
        continue;
      }

      const rawTimeText = student.time ? String(student.time).trim() : '';
      if (!rawTimeText) {
        reviewRows.push({
          SOURCE: sourceLabel,
          ORIGINAL: `${regNo} | Date=${finalDate}`,
          ISSUE: 'Time missing'
        });
        continue;
      }

      const ranges = parseTimeRanges(rawTimeText);
      const normalizedTimeText = rawTimeText.replace(/\s+to\s+/gi, ' - ');
      const explicitMultiple = /\s+(?:n|and)\s+/i.test(normalizedTimeText);

      if (!ranges || ranges.length === 0) {
        reviewRows.push({
          SOURCE: sourceLabel,
          ORIGINAL: `${regNo} | ${rawTimeText}`,
          ISSUE: 'Could not parse time range'
        });
        continue;
      }

      if (!explicitMultiple && ranges.length !== 1) {
        reviewRows.push({
          SOURCE: sourceLabel,
          ORIGINAL: `${regNo} | ${rawTimeText}`,
          ISSUE: 'Expected one time range but parser returned multiple ranges'
        });
        continue;
      }

      for (const range of ranges) {
        const standardized = standardizeTime(range.startMin, range.endMin);
        if (!standardized) {
          reviewRows.push({
            SOURCE: sourceLabel,
            ORIGINAL: `${regNo} | ${rawTimeText}`,
            ISSUE: 'Invalid standardized time'
          });
          continue;
        }

        outputRows.push({
          'REG NO': regNo,
          'DATE': finalDate,
          'TIME': standardized.time,
          'REMARKS': eventName,
          _DURATION: standardized.duration,
          _START: standardized.startMin,
          _SOURCE: sourceLabel,
          _ORIGINAL_TIME: rawTimeText
        });
      }
    }
  }

  // 17. SORTING
  // 1. DATE ascending
  // 2. DURATION descending
  // 3. START TIME ascending
  // 4. REG NO ascending
  outputRows.sort((a, b) => {
    if (a.DATE !== b.DATE) return a.DATE.localeCompare(b.DATE);
    if (b._DURATION !== a._DURATION) return b._DURATION - a._DURATION;
    if (a._START !== b._START) return a._START - b._START;
    return a['REG NO'].localeCompare(b['REG NO']);
  });

  // 20. ADD BLANK ROW BETWEEN DATE/TIME GROUPS
  const formattedRows = [];
  let previousGroup = null;
  for (const row of outputRows) {
    const group = `${row.DATE}__${row.TIME}`;
    if (previousGroup !== null && group !== previousGroup) {
      formattedRows.push({
        'REG NO': '',
        'DATE': '',
        'TIME': '',
        'REMARKS': ''
      });
    }
    formattedRows.push({
      'REG NO': row['REG NO'],
      'DATE': row['DATE'],
      'TIME': row['TIME'],
      'REMARKS': row['REMARKS']
    });
    previousGroup = group;
  }

  // Build SheetJS Workbook
  const wb = xlsx.utils.book_new();

  const xlsxColName = (colIdx) => {
    let temp = '';
    let letter = '';
    while (colIdx >= 0) {
      temp = colIdx % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      colIdx = Math.floor(colIdx / 26) - 1;
    }
    return letter;
  };

  const applyConsolidatedStyling = (ws, aoaData, centerCols = []) => {
    aoaData.forEach((row, rIdx) => {
      row.forEach((cellVal, cIdx) => {
        const cellRef = `${xlsxColName(cIdx)}${rIdx + 1}`;
        if (!ws[cellRef]) return;
        if (rIdx === 0) {
          ws[cellRef].s = {
            fill: { fgColor: { rgb: '0C4095' }, patternType: 'solid' },
            font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
            alignment: { vertical: 'center', horizontal: 'center' }
          };
        } else {
          const isCentered = centerCols.includes(cIdx);
          ws[cellRef].s = {
            font: { name: 'Calibri', sz: 11 },
            alignment: { vertical: 'center', horizontal: isCentered ? 'center' : 'left' }
          };
        }
      });
    });
  };

  // 1. Sheet: "Final Output"
  const finalOutputHeaders = ['REG NO', 'DATE', 'TIME', 'REMARKS'];
  const finalOutputData = [
    finalOutputHeaders,
    ...formattedRows.map(r => [r['REG NO'], r['DATE'], r['TIME'], r['REMARKS']])
  ];
  const wsFinal = xlsx.utils.aoa_to_sheet(finalOutputData);
  wsFinal['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 40 }];
  wsFinal['!views'] = [{ state: 'frozen', ySplit: 1 }];
  applyConsolidatedStyling(wsFinal, finalOutputData, [0, 1, 2]);
  xlsx.utils.book_append_sheet(wb, wsFinal, 'Final Output');

  // 2. Sheet: "Review"
  const reviewHeaders = ['SOURCE', 'ORIGINAL', 'ISSUE'];
  const reviewData = [
    reviewHeaders,
    ...reviewRows.map(r => [r.SOURCE, r.ORIGINAL, r.ISSUE])
  ];
  const wsReview = xlsx.utils.aoa_to_sheet(reviewData);
  wsReview['!cols'] = [{ wch: 45 }, { wch: 70 }, { wch: 50 }];
  wsReview['!views'] = [{ state: 'frozen', ySplit: 1 }];
  applyConsolidatedStyling(wsReview, reviewData, []);
  xlsx.utils.book_append_sheet(wb, wsReview, 'Review');

  // 3. Sheet: "Theory Slots"
  const theoryHeaders = ['SLOT', 'START', 'END'];
  const theoryData = [
    theoryHeaders,
    ...THEORY_SLOTS.map((slot, i) => [i + 1, slot[0], slot[1]])
  ];
  const wsTheory = xlsx.utils.aoa_to_sheet(theoryData);
  wsTheory['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 15 }];
  wsTheory['!views'] = [{ state: 'frozen', ySplit: 1 }];
  applyConsolidatedStyling(wsTheory, theoryData, [0, 1, 2]);
  xlsx.utils.book_append_sheet(wb, wsTheory, 'Theory Slots');

  return wb;
};

/**
 * Downloads consolidated OD Excel for browser environment
 */
export const exportConsolidatedODExcel = (odRecords, fileName, xlsx) => {
  const wb = buildConsolidatedODWorkbook(odRecords, xlsx);
  xlsx.writeFile(wb, fileName);
  return wb;
};

/**
 * Constructs a keyed OD Registry Map where each student's registration number
 * serves as the unique key. If a student is encountered again across OD lists,
 * their entry is updated with the latest event name, date, status, and remarks.
 *
 * @param {Array} ods - List of OD list objects from database
 * @param {Array} reports - List of report objects (for event category matching)
 * @returns {Map<string, object>} Map keyed by normalized uppercase registrationNumber
 */
export const buildODRegistryMap = (ods = [], reports = []) => {
  const reportsMap = new Map();
  if (Array.isArray(reports)) {
    reports.forEach(r => {
      if (r) reportsMap.set(String(r.id || r._id), r);
    });
  }

  // Sort ODs chronologically (by eventDate or uploadedAt) so later events update earlier ones
  const sortedODs = Array.isArray(ods)
    ? [...ods].sort((a, b) => {
        const dateA = a.eventDate || a.uploadedAt || '';
        const dateB = b.eventDate || b.uploadedAt || '';
        return String(dateA).localeCompare(String(dateB));
      })
    : [];

  const registryMap = new Map();

  sortedODs.forEach(od => {
    if (!od) return;
    const studentsList = Array.isArray(od.students) ? od.students : [];
    const total = od.totalStudents !== undefined ? od.totalStudents : studentsList.length;
    const completed = od.completedStudents || 0;
    const remaining = od.remainingStudents !== undefined ? od.remainingStudents : Math.max(0, total - completed);
    const isDone = total > 0 && (completed >= total || remaining === 0);
    const effectiveStatus = isDone ? 'fully_updated' : (od.verificationStatus || 'pending');

    const evId = od.eventId?._id ? String(od.eventId._id) : String(od.eventId || '');
    const matchedReport = evId ? reportsMap.get(evId) : null;
    const eventCategory = matchedReport
      ? (matchedReport.categoryOthersSpecify ? `${matchedReport.category} (${matchedReport.categoryOthersSpecify})` : (matchedReport.category || 'N/A'))
      : (od.eventCategory || 'N/A');

    studentsList.forEach(student => {
      if (!student) return;
      const regNo = (student.registrationNumber || '').trim().toUpperCase();
      if (!regNo) return;

      // Parse specific remark for this registration number
      let specificRemark = '';
      if (od.adminRemarks) {
        const lines = String(od.adminRemarks).split('\n');
        const lineMatch = lines.find(line => line.toUpperCase().includes(regNo));
        if (lineMatch) specificRemark = lineMatch.trim();
      }

      const isMatchedInRemarks = od.adminRemarks ? String(od.adminRemarks).toUpperCase().includes(regNo) : false;
      const studentDate = student.date || od.eventDate || '';
      const studentTime = student.time || '';

      const fallbackRemark = effectiveStatus === 'fully_updated'
        ? 'Verified Successfully'
        : (effectiveStatus === 'missed_od_added' || effectiveStatus === 'pending'
          ? 'Pending Verification'
          : (od.adminRemarks ? od.adminRemarks.trim() : 'No issues logged'));

      // Check whether it exists already
      if (!registryMap.has(regNo)) {
        // If not, add that as a key with event name, date, status and remarks as value
        registryMap.set(regNo, {
          id: `${od.id || od._id || 'od'}-${regNo}`,
          registrationNumber: regNo,
          studentName: student.studentName || 'Student',
          eventName: od.eventName || 'Event',
          eventCategory: eventCategory,
          clubName: od.clubName || '',
          clubId: od.clubId?._id ? String(od.clubId._id) : String(od.clubId || ''),
          date: studentDate,
          time: studentTime,
          status: effectiveStatus,
          verificationStatus: effectiveStatus,
          remarks: specificRemark || fallbackRemark,
          specificRemark: specificRemark,
          generalRemarks: od.adminRemarks || '',
          isMatchedInRemarks: isMatchedInRemarks,
          allEvents: [od.eventName || 'Event'],
          eventsCount: 1,
          history: [{
            eventName: od.eventName || 'Event',
            date: studentDate,
            time: studentTime,
            status: effectiveStatus,
            remarks: specificRemark || fallbackRemark
          }],
          lastUpdated: od.uploadedAt || od.eventDate || new Date().toISOString()
        });
      } else {
        // If it is there already, then just update the value
        const existing = registryMap.get(regNo);
        if (student.studentName && (!existing.studentName || existing.studentName === 'Student')) {
          existing.studentName = student.studentName;
        }
        existing.eventName = od.eventName || existing.eventName;
        existing.eventCategory = eventCategory !== 'N/A' ? eventCategory : existing.eventCategory;
        existing.clubName = od.clubName || existing.clubName;
        existing.clubId = od.clubId?._id ? String(od.clubId._id) : String(od.clubId || existing.clubId);
        existing.date = studentDate || existing.date;
        existing.time = studentTime || existing.time;
        existing.status = effectiveStatus;
        existing.verificationStatus = effectiveStatus;
        existing.remarks = specificRemark || fallbackRemark;
        existing.specificRemark = specificRemark || existing.specificRemark;
        existing.generalRemarks = od.adminRemarks || existing.generalRemarks;
        existing.isMatchedInRemarks = isMatchedInRemarks;
        if (od.eventName && !existing.allEvents.includes(od.eventName)) {
          existing.allEvents.push(od.eventName);
          existing.eventsCount = existing.allEvents.length;
        }
        existing.history.push({
          eventName: od.eventName || 'Event',
          date: studentDate,
          time: studentTime,
          status: effectiveStatus,
          remarks: specificRemark || fallbackRemark
        });
        existing.lastUpdated = od.uploadedAt || od.eventDate || existing.lastUpdated;
      }
    });
  });

  return registryMap;
};



