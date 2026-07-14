import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Loader from '../Common/Loader';
import { UploadCloud, Image as ImageIcon, Trash2, ArrowLeft } from 'lucide-react';

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
  const [facultyCoordinator, setFacultyCoordinator] = useState('');
  const [studentCoordinator, setStudentCoordinator] = useState('');
  const [description, setDescription] = useState('');
  const [outcome, setOutcome] = useState('');
  const [budgetUsed, setBudgetUsed] = useState('');

  // File states
  const [reportFile, setReportFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

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

  const handleReportChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size (20 MB = 20 * 1024 * 1024 bytes)
    if (file.size > 20 * 1024 * 1024) {
      showToast('Report file size must be less than 20MB.', 'error');
      return;
    }

    // Check extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx' && ext !== 'doc') {
      showToast('Only PDF and DOCX file types are allowed.', 'error');
      return;
    }

    setReportFile(file);
  };

  const handlePhotosChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate each file is an image
    const validFiles = [];
    const newPreviews = [];
    
    for (let file of files) {
      if (!file.type.startsWith('image/')) {
        showToast(`File "${file.name}" is not a valid image.`, 'error');
        continue;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setPhotoFiles(prev => [...prev, ...validFiles]);
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemovePhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportFile) {
      showToast('Please attach the Event Report file.', 'error');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('clubId', clubId);
    formData.append('clubName', clubName);
    formData.append('eventName', eventName);
    formData.append('eventDate', eventDate);
    formData.append('eventEndDate', eventEndDate);
    formData.append('eventTime', eventTime);
    formData.append('venue', venue);
    formData.append('category', category);
    if (category === 'Others') {
      formData.append('categoryOthersSpecify', categoryOthersSpecify);
    }
    formData.append('numberOfParticipants', numberOfParticipants);
    formData.append('facultyCoordinator', facultyCoordinator);
    formData.append('studentCoordinator', studentCoordinator);
    formData.append('description', description);
    formData.append('outcome', outcome);
    formData.append('budgetUsed', budgetUsed);
    formData.append('report', reportFile);
    photoFiles.forEach(file => {
      formData.append('photos', file);
    });

    try {
      await api.post('/reports', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
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
                disabled={user && user.role === 'Chairperson'} // Locked to assigned club for Chairperson
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

        {/* SECTION 2: Coordinators and Participants */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="text-base font-bold text-vit-navy dark:text-white border-b border-vit-neutral-200 dark:border-vit-neutral-700 pb-2">
            2. Attendance & Staff Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                Faculty Coordinator
              </label>
              <input
                type="text"
                value={facultyCoordinator}
                onChange={(e) => setFacultyCoordinator(e.target.value)}
                placeholder="e.g. Dr. A. Ramanathan"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Student Coordinator
              </label>
              <input
                type="text"
                value={studentCoordinator}
                onChange={(e) => setStudentCoordinator(e.target.value)}
                placeholder="e.g. Rajesh Nair (21BCE0104)"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Content Narratives */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="text-base font-bold text-vit-navy dark:text-white border-b border-vit-neutral-200 dark:border-vit-neutral-700 pb-2">
            3. Narrative & Financials
          </h3>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Event Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="4"
                placeholder="Detail the activities, lectures, or schedules conducted during the event..."
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Event Outcome
              </label>
              <textarea
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                rows="3"
                placeholder="Explain the results, learning targets reached, and key achievements..."
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Budget Used (INR)
              </label>
              <input
                type="number"
                value={budgetUsed}
                onChange={(e) => setBudgetUsed(e.target.value)}
                placeholder="e.g. 5000"
                min="0"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: File Uploads */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="text-base font-bold text-vit-navy dark:text-white border-b border-vit-neutral-200 dark:border-vit-neutral-700 pb-2">
            4. Report Files & Media Uploads
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PDF/DOCX Report File Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400">
                Official Report Document (PDF / DOCX • Max 20MB)
              </label>
              <div className="relative border-2 border-dashed border-vit-neutral-300 dark:border-vit-neutral-700 hover:border-vit-blue rounded-2xl p-6 flex flex-col items-center justify-center transition-colors bg-vit-neutral-50 dark:bg-vit-neutral-900/50">
                <UploadCloud className="w-8 h-8 text-vit-neutral-400 dark:text-vit-neutral-500 mb-3" />
                <p className="text-xs font-semibold text-vit-neutral-600 dark:text-vit-neutral-400 mb-1">
                  {reportFile ? reportFile.name : 'Select or drag & drop report file'}
                </p>
                <p className="text-[10px] text-vit-neutral-400">PDF, DOC, DOCX up to 20MB</p>
                <input
                  type="file"
                  onChange={handleReportChange}
                  accept=".pdf,.docx,.doc"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Photo Uploads */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400">
                Event Photos (Multiple Uploads)
              </label>
              <div className="relative border-2 border-dashed border-vit-neutral-300 dark:border-vit-neutral-700 hover:border-vit-blue rounded-2xl p-6 flex flex-col items-center justify-center transition-colors bg-vit-neutral-50 dark:bg-vit-neutral-900/50">
                <ImageIcon className="w-8 h-8 text-vit-neutral-400 dark:text-vit-neutral-500 mb-3" />
                <p className="text-xs font-semibold text-vit-neutral-600 dark:text-vit-neutral-400 mb-1">
                  Click to select photos
                </p>
                <p className="text-[10px] text-vit-neutral-400">PNG, JPG, JPEG formats</p>
                <input
                  type="file"
                  multiple
                  onChange={handlePhotosChange}
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Photo Previews grid */}
          {photoPreviews.length > 0 && (
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase text-vit-neutral-500">Selected Photos Preview ({photoFiles.length})</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative w-full h-24 rounded-xl border overflow-hidden bg-vit-neutral-100 group shadow-sm">
                    <img src={preview} alt={`preview ${index}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-750 text-white p-1 rounded-lg opacity-80 hover:opacity-100 transition-opacity focus:outline-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
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
