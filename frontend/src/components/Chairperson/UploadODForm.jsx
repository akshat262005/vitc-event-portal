import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Loader from '../Common/Loader';
import { 
  ArrowLeft, 
  UploadCloud, 
  FileDown, 
  Plus, 
  Trash2, 
  Users, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const UploadODForm = () => {
  const { showToast } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [unlockedEvents, setUnlockedEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [parsingExcel, setParsingExcel] = useState(false);

  // Form Fields
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [students, setStudents] = useState([]);

  // Manual input fields
  const [regNo, setRegNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Fetch submitted reports that do not have ODs uploaded yet
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get('/ods/unlocked-events');
        setUnlockedEvents(response.data);

        // Pre-select event if navigated from the dashboard row link
        const navEventId = location.state?.selectedEventId;
        if (navEventId) {
          setSelectedEventId(navEventId);
          const found = response.data.find(e => (e.id || e._id) === navEventId);
          if (found) setSelectedEvent(found);
        }
      } catch (err) {
        console.error('Error fetching unlocked events:', err);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, [location]);

  // Update selected event details
  const handleEventChange = (e) => {
    const id = e.target.value;
    setSelectedEventId(id);
    const found = unlockedEvents.find(event => (event.id || event._id) === id);
    setSelectedEvent(found || null);
  };

  // Handle Excel parsing
  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setParsingExcel(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/ods/parse-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const parsedStudents = response.data.students;
      
      // Check for duplicates between parsed list and existing manual list
      const combined = [...students];
      const seenRegs = new Set(combined.map(s => s.registrationNumber));
      const duplicates = [];

      parsedStudents.forEach(item => {
        if (seenRegs.has(item.registrationNumber)) {
          duplicates.push(item.registrationNumber);
        } else {
          combined.push(item);
          seenRegs.add(item.registrationNumber);
        }
      });

      setStudents(combined);
      
      if (duplicates.length > 0) {
        showToast(`Imported ${parsedStudents.length - duplicates.length} students. Skipped ${duplicates.length} duplicate registration numbers.`, 'info');
      } else {
        showToast(`Successfully parsed and loaded ${parsedStudents.length} students from Excel!`, 'success');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to parse Excel file.';
      showToast(msg, 'error');
    } finally {
      setParsingExcel(false);
      e.target.value = ''; // Reset file input
    }
  };

  // Add student manually
  const handleAddStudentManually = (e) => {
    e.preventDefault();
    if (!regNo.trim() || !studentName.trim() || !date.trim() || !time.trim()) {
      showToast('Please fill in all student details.', 'error');
      return;
    }

    const formattedReg = regNo.trim().toUpperCase();

    // Check duplicate
    if (students.some(s => s.registrationNumber === formattedReg)) {
      showToast(`Student with Registration Number ${formattedReg} is already in the list.`, 'error');
      return;
    }

    const newStudent = {
      registrationNumber: formattedReg,
      studentName: studentName.trim(),
      date: date.trim(),
      time: time.trim()
    };

    setStudents(prev => [...prev, newStudent]);
    showToast(`Added ${newStudent.studentName} manually.`, 'success');

    // Reset fields
    setRegNo('');
    setStudentName('');
    setDate('');
    setTime('');
  };

  // Delete student from preview list
  const handleDeleteStudent = (index) => {
    setStudents(prev => prev.filter((_, i) => i !== index));
  };

  // Submit OD
  const handleSubmitOD = async () => {
    if (!selectedEventId) {
      showToast('Please select the Event.', 'error');
      return;
    }
    if (students.length === 0) {
      showToast('The student list cannot be empty. Enter manually or upload an Excel sheet.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/ods', {
        eventId: selectedEventId,
        timeSlot: 'Individual Slot',
        students
      });
      showToast('OD List uploaded and submitted successfully!', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Error submitting OD list.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEvents) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Back Link */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-vit-neutral-500 hover:text-vit-blue transition-colors text-sm font-semibold cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-vit-navy dark:text-white">Upload On Duty (OD) Student Ledger</h2>
        <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
          Provide student details to grant academic On-Duty approval. This page is unlocked only for events with submitted reports.
        </p>
      </div>

      {unlockedEvents.length === 0 ? (
        <div className="glass-panel p-12 text-center text-vit-neutral-500 space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <p className="font-semibold text-lg">No Event Reports Available for OD Upload</p>
          <p className="text-sm max-w-md mx-auto">
            You must first submit an Event Report. Once the report is successfully registered, the On Duty submission workflow unlocks.
          </p>
          <button
            onClick={() => navigate('/reports/new')}
            className="px-5 py-2.5 bg-vit-navy text-white text-sm font-semibold rounded-xl hover:bg-vit-blue transition-colors cursor-pointer"
          >
            Submit an Event Report
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: Event & Details */}
          <div className="glass-panel p-6 space-y-6">
            <h3 className="text-base font-bold text-vit-navy dark:text-white border-b border-vit-neutral-200 dark:border-vit-neutral-700 pb-2">
              1. Select Conducted Event
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                  Select Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={handleEventChange}
                  className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                  required
                >
                  <option value="">Select Event Report</option>
                  {unlockedEvents.map(e => (
                    <option key={e.id || e._id} value={e.id || e._id}>
                      {e.eventName} ({e.eventDate})
                    </option>
                  ))}
                </select>
              </div>

              {selectedEvent && (
                <div className="md:col-span-2 p-4 bg-vit-sky/30 dark:bg-vit-blue/10 border border-vit-blue/20 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-vit-blue">Linked Event Details</span>
                  <p className="text-sm font-semibold text-vit-navy dark:text-white">
                    Event: <span className="font-normal">{selectedEvent.eventName}</span>
                  </p>
                  <p className="text-sm font-semibold text-vit-navy dark:text-white">
                    Date: <span className="font-normal">{selectedEvent.eventDate}</span>
                  </p>
                  <p className="text-sm font-semibold text-vit-navy dark:text-white">
                    Venue: <span className="font-normal">{selectedEvent.venue}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: Add Students */}
          <div className="glass-panel p-6 space-y-6">
            <h3 className="text-base font-bold text-vit-navy dark:text-white border-b border-vit-neutral-200 dark:border-vit-neutral-700 pb-2">
              2. Add Students to OD List
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option A: Excel Upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500">
                    Option A: Excel Sheet Upload
                  </label>
                  <a
                    href={`${api.defaults.baseURL}/ods/template`}
                    download
                    className="flex items-center gap-1 text-xs font-bold text-vit-blue dark:text-sky-400 hover:underline"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download Template</span>
                  </a>
                </div>

                <div className="relative border-2 border-dashed border-vit-neutral-300 dark:border-vit-neutral-700 hover:border-vit-blue rounded-2xl p-6 flex flex-col items-center justify-center bg-vit-neutral-50 dark:bg-vit-neutral-900/50">
                  <UploadCloud className="w-8 h-8 text-vit-neutral-400 dark:text-vit-neutral-500 mb-2" />
                  <p className="text-xs font-semibold text-vit-neutral-600 dark:text-vit-neutral-400 mb-1">
                    {parsingExcel ? 'Parsing File...' : 'Drag & drop student Excel template'}
                  </p>
                  <p className="text-[10px] text-vit-neutral-400">Accepts .xlsx and .xls files</p>
                  <input
                    type="file"
                    onChange={handleExcelUpload}
                    accept=".xlsx,.xls"
                    disabled={parsingExcel}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Option B: Manual Entry */}
              <form onSubmit={handleAddStudentManually} className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500">
                  Option B: Manual Row Entry
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder="Reg Number (21BCE0001)"
                    className="px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-vit-blue focus:border-transparent font-medium"
                    required
                  />
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Student Name"
                    className="px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-vit-blue focus:border-transparent font-medium"
                    required
                  />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-vit-blue focus:border-transparent font-medium text-vit-neutral-500"
                    required
                  />
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="Time (e.g. 9 AM - 12 PM)"
                    className="px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-vit-blue focus:border-transparent font-medium"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-vit-blue hover:bg-vit-navy text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Student Row</span>
                </button>
              </form>
            </div>
          </div>

          {/* SECTION 3: Preview Table */}
          <div className="glass-panel overflow-hidden">
            <div className="px-6 py-5 border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-vit-blue" />
                <h3 className="font-bold text-base text-vit-navy dark:text-white">Excel Ledger Preview & Editor</h3>
              </div>
              <span className="text-xs bg-vit-sky text-vit-blue px-2.5 py-1 rounded-full font-bold">
                {students.length} Students Listed
              </span>
            </div>

            {students.length === 0 ? (
              <div className="p-12 text-center text-vit-neutral-500 dark:text-vit-neutral-400">
                No students added yet. Upload an Excel sheet or add manually.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-vit-neutral-50 dark:bg-vit-neutral-850 text-vit-neutral-500 text-xs font-bold uppercase tracking-wider border-b border-vit-neutral-200 dark:border-vit-neutral-700 z-10">
                    <tr>
                      <th className="px-6 py-3">Registration Number</th>
                      <th className="px-6 py-3">Student Name</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-700 text-sm">
                    {students.map((student, index) => (
                      <tr key={index} className="hover:bg-vit-neutral-100/30 dark:hover:bg-vit-neutral-800/30 transition-colors">
                        <td className="px-6 py-3 font-semibold text-vit-navy dark:text-white uppercase">
                          {student.registrationNumber}
                        </td>
                        <td className="px-6 py-3 text-vit-neutral-600 dark:text-vit-neutral-400">
                          {student.studentName}
                        </td>
                        <td className="px-6 py-3 text-vit-neutral-600 dark:text-vit-neutral-400">
                          {student.date}
                        </td>
                        <td className="px-6 py-3 text-vit-neutral-600 dark:text-vit-neutral-400">
                          {student.time}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(index)}
                            className="p-1.5 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                            title="Delete Row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="flex gap-4 items-center justify-end">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-5 py-3 border border-vit-neutral-300 dark:border-vit-neutral-700 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-800 text-sm font-semibold rounded-xl text-vit-neutral-750 dark:text-vit-neutral-250 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitOD}
              disabled={submitting || students.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-vit-navy to-vit-blue hover:from-vit-navy hover:to-vit-blue text-white rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting OD Ledger...' : 'Submit OD List'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadODForm;
