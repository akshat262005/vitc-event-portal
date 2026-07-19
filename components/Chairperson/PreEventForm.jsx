'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import Loader from '../Common/Loader';
import { ArrowLeft, Calendar } from 'lucide-react';

const PreEventForm = () => {
  const { user, showToast } = useAuth();
  const router = useRouter();

  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [clubId, setClubId] = useState('');
  const [clubName, setClubName] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [odRequiredDate, setOdRequiredDate] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventCategoryOthersSpecify, setEventCategoryOthersSpecify] = useState('');
  
  // Coordinator Details
  const [facultyCoordinator, setFacultyCoordinator] = useState('');
  const [studentCoordinator, setStudentCoordinator] = useState('');
  const [studentCoordinatorContact, setStudentCoordinatorContact] = useState('');
  
  // Purpose
  const [purpose, setPurpose] = useState('');

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const response = await api.get('/clubs');
        setClubs(response.data);
        
        // Auto-select chairperson's club
        if (user && user.role === 'Chairperson' && user.clubId) {
          const matchedClubId = user.clubId.toString();
          setClubId(matchedClubId);
          const matchedClub = response.data.find(c => (c.id || c._id) === matchedClubId);
          if (matchedClub) {
            setClubName(matchedClub.name);
          }
        }
      } catch (err) {
        console.error('Error fetching clubs:', err);
        showToast('Failed to load club details.', 'error');
      } finally {
        setLoadingClubs(false);
      }
    };
    fetchClubs();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation checks
    if (!eventName.trim() || !eventDate || !odRequiredDate || !eventCategory || !facultyCoordinator.trim() || !studentCoordinator.trim() || !studentCoordinatorContact.trim() || !purpose.trim()) {
      showToast('Please fill in all mandatory fields.', 'warning');
      return;
    }

    // Phone number validation: exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(studentCoordinatorContact.trim())) {
      showToast('Student Coordinator Contact must be a valid 10-digit mobile number.', 'error');
      return;
    }

    // Date validation: OD required date cannot be after actual event date
    const evDate = new Date(eventDate);
    const odReqDate = new Date(odRequiredDate);
    if (odReqDate > evDate) {
      showToast('OD Required Date cannot be after the Actual Event Date.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/pre-events', {
        eventName: eventName.trim(),
        eventDate,
        odRequiredDate,
        eventCategory,
        eventCategoryOthersSpecify: eventCategory === 'Others' ? eventCategoryOthersSpecify.trim() : '',
        facultyCoordinator: facultyCoordinator.trim(),
        studentCoordinator: studentCoordinator.trim(),
        studentCoordinatorContact: studentCoordinatorContact.trim(),
        purpose: purpose.trim()
      });

      showToast('Pre-Event Operation request submitted successfully!', 'success');
      router.push('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Error submitting request.';
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
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-2 text-vit-neutral-500 hover:text-vit-blue transition-colors text-sm font-semibold cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-vit-navy dark:text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-vit-blue" />
          <span>Pre-Event Operations</span>
        </h2>
        <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
          Submit pre-event activity details to request On Duty (OD) for students involved in event preparation before the actual event.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Event Information */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="text-base font-bold text-vit-navy dark:text-white border-b border-vit-neutral-200 dark:border-vit-neutral-700 pb-2">
            1. Event Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Club / Chapter Name dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Club / Chapter Name
              </label>
              <select
                value={clubId}
                disabled
                className="w-full px-4 py-3 bg-vit-neutral-100 dark:bg-vit-neutral-800 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium disabled:opacity-75 disabled:cursor-not-allowed"
                required
              >
                <option value={clubId}>{clubName || 'Assigned Club'}</option>
              </select>
            </div>

            {/* Event Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Event Name
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Hackfest Setup"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            {/* Actual Event Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Actual Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            {/* OD Required Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                OD Required Date
              </label>
              <input
                type="date"
                value={odRequiredDate}
                onChange={(e) => setOdRequiredDate(e.target.value)}
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            {/* Event Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Event Category
              </label>
              <select
                value={eventCategory}
                onChange={(e) => setEventCategory(e.target.value)}
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              >
                <option value="">Select Category</option>
                <option value="Competition">Competition</option>
                <option value="Game">Game</option>
                <option value="Hackathon">Hackathon</option>
                <option value="Workshop">Workshop</option>
                <option value="Management">Management</option>
                <option value="Women's internal">Women's internal</option>
                <option value="Women external">Women external</option>
                <option value="Outreach events">Outreach events</option>
                <option value="Women's only event">Women's only event</option>
                <option value="Gender equity programs">Gender equity programs</option>
                <option value="Others">Others (Specify)</option>
              </select>
            </div>

            {/* Specify Category if Others */}
            {eventCategory === 'Others' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                  Specify Category
                </label>
                <input
                  type="text"
                  value={eventCategoryOthersSpecify}
                  onChange={(e) => setEventCategoryOthersSpecify(e.target.value)}
                  placeholder="e.g. Practice Rehearsal"
                  className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                  required
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Coordinator Details */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="text-base font-bold text-vit-navy dark:text-white border-b border-vit-neutral-200 dark:border-vit-neutral-700 pb-2">
            2. Coordinator Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Faculty Coordinator Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Faculty Coordinator Name
              </label>
              <input
                type="text"
                value={facultyCoordinator}
                onChange={(e) => setFacultyCoordinator(e.target.value)}
                placeholder="e.g. Dr. A Ramanathan"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            {/* Student Coordinator Name */}
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

            {/* Student Coordinator Contact Number */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Student Coordinator Contact Number
              </label>
              <input
                type="tel"
                value={studentCoordinatorContact}
                onChange={(e) => setStudentCoordinatorContact(e.target.value)}
                placeholder="e.g. 98765XXXXX"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Purpose of OD */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="text-base font-bold text-vit-navy dark:text-white border-b border-vit-neutral-200 dark:border-vit-neutral-700 pb-2">
            3. Purpose of OD
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
              Purpose of Pre-Event Operations
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Provide a detailed reason for the OD request (e.g., Practice Session, Technical Rehearsal, Venue Setup, Registration Preparation, Volunteer Meeting, Decoration Work, Equipment Installation, Testing and Setup, etc.)"
              rows="4"
              className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium resize-none"
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3.5 bg-vit-navy hover:bg-vit-blue text-white text-sm font-extrabold rounded-xl transition-all duration-200 shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'Submitting Request...' : 'Submit Pre-Event Operation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PreEventForm;
