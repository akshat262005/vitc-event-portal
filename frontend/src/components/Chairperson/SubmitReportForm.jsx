import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Loader from '../Common/Loader';
import { ArrowLeft, Link as LinkIcon } from 'lucide-react';

const SubmitReportForm = () => {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [clubId, setClubId] = useState('');
  const [clubName, setClubName] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [venue, setVenue] = useState('');
  const [category, setCategory] = useState('');
  const [categoryOthersSpecify, setCategoryOthersSpecify] = useState('');
  const [numberOfParticipants, setNumberOfParticipants] = useState('');
  const [studentCoordinator, setStudentCoordinator] = useState('');
  const [studentCoordinatorReg, setStudentCoordinatorReg] = useState('');
  const [studentCoordinatorContact, setStudentCoordinatorContact] = useState('');
  const [outcome, setOutcome] = useState('');
  const [reportFilePath, setReportFilePath] = useState(''); // Stores Google Drive / document URL link

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const response = await api.get('/clubs');
        setClubs(response.data);
        
        // Auto-select chairperson's assigned club
        if (user && user.clubId) {
          setClubId(user.clubId);
          setClubName(user.clubName);
        }
      } catch (err) {
        console.error('Error fetching clubs:', err);
      } finally {
        setLoadingClubs(false);
      }
    };
    fetchClubs();
  }, [user]);

  const handleClubChange = (e) => {
    const selectedId = e.target.value;
    setClubId(selectedId);
    const selectedClub = clubs.find(c => (c.id || c._id) === selectedId);
    if (selectedClub) {
      setClubName(selectedClub.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportFilePath.trim()) {
      showToast('Please submit the Drive/Docx report link.', 'error');
      return;
    }

    setSubmitting(true);
    const payload = {
      clubId,
      clubName,
      eventName,
      eventDate,
      eventEndDate,
      eventTime,
      venue,
      category,
      categoryOthersSpecify: category === 'Others' ? categoryOthersSpecify : '',
      numberOfParticipants: parseInt(numberOfParticipants, 10),
      studentCoordinator: studentCoordinator.trim(),
      studentCoordinatorReg: studentCoordinatorReg.trim().toUpperCase(),
      studentCoordinatorContact: studentCoordinatorContact.trim(),
      outcome: outcome.trim(),
      reportFilePath: reportFilePath.trim() // Stores Drive link
    };

    try {
      await api.post('/reports', payload);
      showToast('Event report submitted successfully!', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Error submitting event report.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingClubs) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Back link */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-vit-neutral-500 hover:text-vit-blue transition-colors text-sm font-semibold cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-vit-navy dark:text-white">Submit Post-Event Report</h2>
        <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
          Complete the details below to submit your event report. Student OD uploads will unlock upon submission.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Event Details */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="text-base font-bold text-vit-navy dark:text-white border-b border-vit-neutral-200 dark:border-vit-neutral-700 pb-2">
            1. Event Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Club Selection Dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Club / Chapter Name
              </label>
              <select
                value={clubId}
                onChange={handleClubChange}
                disabled={user && user.role === 'Chairperson'}
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium disabled:opacity-75 disabled:cursor-not-allowed"
                required
              >
                <option value="">Select Club/Chapter</option>
                {clubs.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Event Name
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. CodeStorm Hackathon"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Event Start Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Event End Date
              </label>
              <input
                type="date"
                value={eventEndDate}
                onChange={(e) => setEventEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Event Time
              </label>
              <input
                type="text"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="e.g. 10:00 AM - 4:00 PM"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Venue
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. MG Auditorium, Nethaji Auditorium"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Event Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              >
                <option value="">Select Category</option>
                <option value="Competition">Competition</option>
                <option value="Game">Game</option>
                <option value="Hackathon">Hackathon</option>
                <option value="Workshop">Workshop</option>
                <option value="Management">Management</option>
                <option value="Others">Others (Specify)</option>
              </select>
            </div>

            {category === 'Others' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                  Specify Category
                </label>
                <input
                  type="text"
                  value={categoryOthersSpecify}
                  onChange={(e) => setCategoryOthersSpecify(e.target.value)}
                  placeholder="e.g. Guest Lecture"
                  className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                  required
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Participant & Student Coordinator details */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="text-base font-bold text-vit-navy dark:text-white border-b border-vit-neutral-200 dark:border-vit-neutral-700 pb-2">
            2. Attendance and Student Coordinator details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Number of Participants
              </label>
              <input
                type="number"
                value={numberOfParticipants}
                onChange={(e) => setNumberOfParticipants(e.target.value)}
                placeholder="e.g. 150"
                min="1"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Student Coordinator Name
              </label>
              <input
                type="text"
                value={studentCoordinator}
                onChange={(e) => setStudentCoordinator(e.target.value)}
                placeholder="e.g. Rajesh Nair"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Student Coordinator Registration Number
              </label>
              <input
                type="text"
                value={studentCoordinatorReg}
                onChange={(e) => setStudentCoordinatorReg(e.target.value)}
                placeholder="e.g. 23MIA1110"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Student Coordinator Contact Number
              </label>
              <input
                type="tel"
                value={studentCoordinatorContact}
                onChange={(e) => setStudentCoordinatorContact(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Outcome Only */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="text-base font-bold text-vit-navy dark:text-white border-b border-vit-neutral-200 dark:border-vit-neutral-700 pb-2">
            3. Narrative
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
              Event Outcome
            </label>
            <textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              rows="4"
              placeholder="Explain the results, learning targets reached, and key achievements..."
              className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
              required
            />
          </div>
        </div>

        {/* SECTION 4: Drive Document Link */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="text-base font-bold text-vit-navy dark:text-white border-b border-vit-neutral-200 dark:border-vit-neutral-700 pb-2">
            4. Report file upload
          </h3>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400">
              Official Report Document (Submit Google Drive / OneDrive / Docx Link)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-vit-neutral-400">
                <LinkIcon className="w-4 h-4" />
              </span>
              <input
                type="url"
                value={reportFilePath}
                onChange={(e) => setReportFilePath(e.target.value)}
                placeholder="e.g. https://drive.google.com/file/d/..."
                className="w-full pl-10 pr-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-semibold text-vit-neutral-800 dark:text-white"
                required
              />
            </div>
            <p className="text-[10px] text-vit-neutral-450 dark:text-vit-neutral-500 mt-1">
              Please make sure the link access settings allow anybody with the link to view the file.
            </p>
          </div>
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
            type="submit"
            disabled={submitting}
            className="px-6 py-3 glow-btn-primary rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting Report...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmitReportForm;
