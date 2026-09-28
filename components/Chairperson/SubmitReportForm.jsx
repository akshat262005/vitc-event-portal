'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import Loader from '../Common/Loader';
import { ArrowLeft, Link as LinkIcon, ChevronDown, Search } from 'lucide-react';

const CATEGORIES = [
  'Competition',
  'Game',
  'Hackathon',
  'Workshop',
  'Management',
  "Women's internal",
  'Women external',
  'Outreach events',
  "Women's only event",
  'Gender equity programs',
  'Others'
];

const formatTo12Hour = (time24) => {
  if (!time24) return '';
  const [hoursStr, minutesStr] = time24.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const hoursFormatted = hours < 10 ? `0${hours}` : hours;
  return `${hoursFormatted}:${minutes} ${ampm}`;
};

const convertTo24Hour = (time12) => {
  if (!time12) return '';
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    if (/^\d{2}:\d{2}$/.test(time12)) return time12;
    return '';
  }
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  const hoursFormatted = hours < 10 ? `0${hours}` : hours;
  return `${hoursFormatted}:${minutes}`;
};

const SubmitReportForm = () => {
  const { user, showToast } = useAuth();
  const router = useRouter();
  const { id } = useParams();
  const isEditMode = !!id;

  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [clubId, setClubId] = useState('');
  const [clubName, setClubName] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [eventLocationType, setEventLocationType] = useState('VIT Chennai');
  const [category, setCategory] = useState([]);
  const [categoryOthersSpecify, setCategoryOthersSpecify] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [numberOfParticipants, setNumberOfParticipants] = useState('');
  const [facultyCoordinator, setFacultyCoordinator] = useState('');
  const [studentCoordinator, setStudentCoordinator] = useState('');
  const [studentCoordinatorContact, setStudentCoordinatorContact] = useState('');
  const [isCollaboration, setIsCollaboration] = useState(false);
  const [collaborationClubs, setCollaborationClubs] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownOpen && !e.target.closest('.collaboration-dropdown-container')) {
        setDropdownOpen(false);
      }
      if (categoryDropdownOpen && !e.target.closest('.category-dropdown-container')) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen, categoryDropdownOpen]);

  const handleCategoryToggle = (cat) => {
    if (category.includes(cat)) {
      setCategory(category.filter(c => c !== cat));
    } else {
      setCategory([...category, cat]);
    }
  };
  const [isSponsored, setIsSponsored] = useState(false);
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorAmount, setSponsorAmount] = useState('');
  const [outcome, setOutcome] = useState('');
  const [reportFilePath, setReportFilePath] = useState(''); // Stores Google Drive / document URL link
  const [reportUploadsCount, setReportUploadsCount] = useState(1);

  useEffect(() => {
    if (isEditMode) {
      const fetchReportDetails = async () => {
        try {
          const response = await api.get(`/reports/${id}`);
          const r = response.data;
          setClubId(r.clubId);
          setClubName(r.clubName);
          setEventName(r.eventName);
          setEventDate(r.eventDate);
          setEventEndDate(r.eventEndDate);
          if (r.eventTime && r.eventTime.includes(' - ')) {
            const [start, end] = r.eventTime.split(' - ');
            setEventStartTime(convertTo24Hour(start.trim()));
            setEventEndTime(convertTo24Hour(end.trim()));
          } else if (r.eventTime) {
            setEventStartTime(convertTo24Hour(r.eventTime));
          }
          setVenue(r.venue || '');
          setEventLocationType(r.eventLocationType || 'VIT Chennai');
          setCategory(r.category ? r.category.split(',').map(c => c.trim()) : []);
          setCategoryOthersSpecify(r.categoryOthersSpecify || '');
          setNumberOfParticipants(r.numberOfParticipants);
          setFacultyCoordinator(r.facultyCoordinator || '');
          setStudentCoordinator(r.studentCoordinator);
          setStudentCoordinatorContact(r.studentCoordinatorContact);
          setOutcome(r.outcome);
          setReportFilePath(r.reportFilePath);
          setIsCollaboration(r.isCollaboration || false);
          setCollaborationClubs(r.collaborationClubs || []);
          setIsSponsored(r.isSponsored || false);
          setSponsorName(r.sponsorName || '');
          setSponsorAmount(r.sponsorAmount !== undefined && r.sponsorAmount !== null ? r.sponsorAmount.toString() : '');
          setReportUploadsCount(r.reportUploadsCount || 1);
        } catch (err) {
          console.error('Error fetching report details:', err);
          showToast('Failed to load report details for editing.', 'error');
        }
      };
      fetchReportDetails();
    }
  }, [id, isEditMode]);

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

    if (category.length === 0) {
      showToast('Please select at least one Event Category.', 'error');
      return;
    }

    if (isCollaboration && (!collaborationClubs || collaborationClubs.length === 0)) {
      showToast('Please select at least one collaborating club, or uncheck Collaboration Event if you did not collaborate.', 'error');
      return;
    }

    // Phone number validation: exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(studentCoordinatorContact.trim())) {
      showToast('Student Coordinator Contact must be a valid 10-digit mobile number.', 'error');
      return;
    }

    // Time validation: Start Time must be before End Time
    if (eventStartTime && eventEndTime && eventStartTime > eventEndTime) {
      showToast('Event Start Time cannot be after Event End Time.', 'error');
      return;
    }

    setSubmitting(true);

    // Frontend Duplicate Event validation
    try {
      const reportsRes = await api.get('/reports');
      const allReports = reportsRes.data || [];
      const normalizeName = (name) => name ? name.trim().toLowerCase().replace(/\s+/g, ' ') : '';
      const normalizedInputName = normalizeName(eventName);
      
      const duplicate = allReports.find(r => {
        // Exclude current report on edit
        const rId = r.id || r._id?.toString();
        if (isEditMode && id && rId.toString() === id.toString()) return false;
        
        if (r.eventDate !== eventDate) return false;
        
        const reportNormalizedName = normalizeName(r.eventName);
        if (reportNormalizedName !== normalizedInputName) return false;
        
        const reportClubId = r.clubId?._id ? r.clubId._id.toString() : r.clubId.toString();
        const targetClubId = clubId.toString();
        
        // Case 1: Same club duplicate
        if (reportClubId === targetClubId) return true;
        
        // Case 2: Submitting club is a collaborating club on the existing report
        if (r.isCollaboration && r.collaborationClubs && r.collaborationClubs.includes(clubName)) {
          return true;
        }
        
        return false;
      });

      if (duplicate) {
        const displayMsg = duplicate.clubName.toLowerCase().trim() === clubName.toLowerCase().trim()
          ? `An Event Report for "${eventName}" on ${eventDate} has already been submitted by your club. Please use the "Modify Report" feature to update the existing report instead of creating a duplicate submission.`
          : `An Event Report for "${eventName}" on ${eventDate} has already been submitted by the primary club, ${duplicate.clubName}. Since your club is a collaborator, you can view the report on your dashboard.`;
        showToast(displayMsg, 'error');
        setSubmitting(false);
        return;
      }
    } catch (err) {
      console.error('Error executing duplicate validation:', err);
    }
    const payload = {
      clubId,
      clubName,
      eventName,
      eventDate,
      eventEndDate,
      eventTime: `${formatTo12Hour(eventStartTime)} - ${formatTo12Hour(eventEndTime)}`,
      venue,
      eventLocationType,
      category: category.join(', '),
      categoryOthersSpecify: category.includes('Others') ? categoryOthersSpecify : '',
      numberOfParticipants: parseInt(numberOfParticipants, 10),
      facultyCoordinator: facultyCoordinator.trim(),
      studentCoordinator: studentCoordinator.trim(),
      studentCoordinatorReg: 'N/A',
      studentCoordinatorContact: studentCoordinatorContact.trim(),
      outcome: outcome.trim(),
      reportFilePath: reportFilePath.trim(), // Stores Drive link
      isCollaboration,
      collaborationClubs: isCollaboration ? collaborationClubs : [],
      isSponsored,
      sponsorName: isSponsored ? sponsorName.trim() : '',
      sponsorAmount: isSponsored ? (sponsorAmount ? parseFloat(sponsorAmount) : 0) : 0
    };

    try {
      if (isEditMode) {
        await api.put(`/reports/${id}`, payload);
        showToast('Event report updated successfully!', 'success');
      } else {
        await api.post('/reports', payload);
        showToast('Event report submitted successfully!', 'success');
      }
      router.push('/dashboard');
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
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-2 text-vit-neutral-500 hover:text-vit-blue transition-colors text-sm font-semibold cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-vit-navy dark:text-white">
            {isEditMode ? 'Edit Event Report' : 'Submit Post-Event Report'}
          </h2>
          <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
            {isEditMode ? 'Modify the fields below to update your event report details.' : 'Complete the details below to submit your event report. Student OD uploads will unlock upon submission.'}
          </p>
        </div>
        {isEditMode && (
          <div className="px-4 py-2 border border-vit-blue/30 rounded-xl font-bold text-xs flex flex-col items-center justify-center flex-shrink-0 bg-white dark:bg-vit-neutral-950 text-vit-blue dark:text-sky-400">
            <span>Edit Mode</span>
            <span className="text-[10px] text-vit-neutral-500 dark:text-vit-neutral-400 font-medium">
              Unlimited Edits Allowed
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Event Details */}
        <div className="glass-panel p-6 space-y-6 relative z-20">
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
                onBlur={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const parts = val.split('-');
                    if (parts[0] && parts[0].length > 4) {
                      parts[0] = parts[0].slice(0, 4);
                      setEventDate(parts.join('-'));
                    }
                  }
                }}
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
                onBlur={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const parts = val.split('-');
                    if (parts[0] && parts[0].length > 4) {
                      parts[0] = parts[0].slice(0, 4);
                      setEventEndDate(parts.join('-'));
                    }
                  }
                }}
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            {/* Event Start Time & Event End Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                  Event Start Time
                </label>
                <input
                  type="time"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                  className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium cursor-pointer"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                  Event End Time
                </label>
                <input
                  type="time"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                  className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium cursor-pointer"
                  required
                />
              </div>
            </div>

            {/* Mandatory: Event Location / Venue Scope */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400">
                Event Location / Venue Scope <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    eventLocationType === 'VIT Chennai'
                      ? 'bg-vit-blue/10 border-vit-blue text-vit-blue dark:bg-vit-blue/20 dark:text-sky-300 font-bold shadow-sm ring-1 ring-vit-blue'
                      : 'bg-vit-neutral-50 dark:bg-vit-neutral-900 border-vit-neutral-200 dark:border-vit-neutral-700 text-vit-neutral-700 dark:text-vit-neutral-300 hover:border-vit-neutral-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="eventLocationType"
                    value="VIT Chennai"
                    checked={eventLocationType === 'VIT Chennai'}
                    onChange={(e) => setEventLocationType(e.target.value)}
                    className="w-4 h-4 text-vit-blue focus:ring-vit-blue cursor-pointer"
                    required
                  />
                  <div>
                    <p className="text-sm font-bold">At VIT Chennai</p>
                    <p className="text-[11px] text-vit-neutral-500 dark:text-vit-neutral-400 font-normal">Conducted inside VIT Chennai campus (Auditoriums, Labs, etc.)</p>
                  </div>
                </label>
                <label
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    eventLocationType === 'Outside VIT Chennai'
                      ? 'bg-vit-blue/10 border-vit-blue text-vit-blue dark:bg-vit-blue/20 dark:text-sky-300 font-bold shadow-sm ring-1 ring-vit-blue'
                      : 'bg-vit-neutral-50 dark:bg-vit-neutral-900 border-vit-neutral-200 dark:border-vit-neutral-700 text-vit-neutral-700 dark:text-vit-neutral-300 hover:border-vit-neutral-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="eventLocationType"
                    value="Outside VIT Chennai"
                    checked={eventLocationType === 'Outside VIT Chennai'}
                    onChange={(e) => setEventLocationType(e.target.value)}
                    className="w-4 h-4 text-vit-blue focus:ring-vit-blue cursor-pointer"
                    required
                  />
                  <div>
                    <p className="text-sm font-bold">Outside VIT Chennai</p>
                    <p className="text-[11px] text-vit-neutral-500 dark:text-vit-neutral-400 font-normal">External competition, symposium, inter-college event, or tour</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                Venue <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. MG Auditorium, Nethaji Auditorium, or External Venue Name"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                required
              />
            </div>

            {/* Event Category with Multiple Selection Note */}
            <div className="category-dropdown-container relative z-40">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400">
                  Event Category <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-vit-blue dark:text-sky-400 bg-vit-blue/10 dark:bg-vit-blue/20 px-2 py-0.5 rounded-full border border-vit-blue/20">
                  ℹ Note: You can select multiple
                </span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl text-sm font-medium text-vit-neutral-700 dark:text-white hover:border-vit-neutral-400 transition-colors cursor-pointer text-left"
                >
                  <span className="truncate">
                    {category.length === 0
                      ? 'Select Category'
                      : category.join(', ')}
                  </span>
                  <ChevronDown className="w-4 h-4 text-vit-neutral-500 shrink-0" />
                </button>

                {categoryDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl shadow-2xl p-3.5 space-y-1.5 max-h-60 overflow-y-auto ring-1 ring-black/5">
                    {CATEGORIES.map(cat => {
                      const isChecked = category.includes(cat);
                      return (
                        <label
                          key={cat}
                          className="flex items-center gap-2.5 p-2 hover:bg-slate-50 dark:hover:bg-vit-neutral-850 rounded-xl cursor-pointer text-sm select-none transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCategoryToggle(cat)}
                            className="w-4 h-4 rounded border-vit-neutral-300 text-vit-blue focus:ring-vit-blue cursor-pointer"
                          />
                          <span className="font-semibold text-vit-neutral-800 dark:text-vit-neutral-200">
                            {cat === 'Others' ? 'Others (Specify)' : cat}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {category.includes('Others') && (
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                  Specify Category <span className="text-red-500">*</span>
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

            {/* Collaboration Event Section */}
            <div className="md:col-span-2 border-t border-vit-neutral-200 dark:border-vit-neutral-750 pt-4 mt-2 relative z-20">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isCollaboration}
                  onChange={(e) => {
                    setIsCollaboration(e.target.checked);
                    if (!e.target.checked) setCollaborationClubs([]);
                  }}
                  className="w-4 h-4 rounded border-vit-neutral-300 text-vit-blue focus:ring-vit-blue cursor-pointer"
                />
                <span className="text-sm font-bold text-vit-navy dark:text-white uppercase tracking-wider">
                  Collaboration Event (Conducting event with other clubs)
                </span>
              </label>
              <p className="text-[11px] text-vit-neutral-500 dark:text-vit-neutral-400 mt-1 pl-6">
                <strong>Important:</strong> If you did not collaborate with other clubs, leave this box unticked. If ticked, you must select at least one collaborating club below.
              </p>

              {isCollaboration && (
                <div className="space-y-3 mt-4 animate-fade-in collaboration-dropdown-container relative">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500">
                      Select Collaborating Clubs / Chapters <span className="text-red-500">*</span>
                    </span>
                    {collaborationClubs.length === 0 && (
                      <span className="text-[11px] font-bold text-red-500 animate-pulse">
                        At least one club must be selected
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-2xl text-xs font-semibold text-vit-neutral-700 dark:text-white hover:border-vit-neutral-400 transition-colors cursor-pointer text-left font-bold"
                    >
                      <span className="truncate">
                        {collaborationClubs.length === 0
                          ? 'Select collaborating clubs...'
                          : `${collaborationClubs.length} Club(s) Selected (${collaborationClubs.slice(0, 2).join(', ')}${collaborationClubs.length > 2 ? '...' : ''})`}
                      </span>
                      <ChevronDown className="w-4 h-4 text-vit-neutral-500 shrink-0" />
                    </button>
                    
                    {dropdownOpen && (
                      <div className="absolute z-30 w-full mt-2 bg-white dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-2xl shadow-xl p-3.5 space-y-2.5 max-h-60 overflow-y-auto">
                        <div className="relative flex items-center">
                          <Search className="absolute left-3 w-3.5 h-3.5 text-vit-neutral-400" />
                          <input
                            type="text"
                            placeholder="Search clubs or chapters..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl bg-vit-neutral-50 dark:bg-vit-neutral-950 dark:text-white focus:outline-none focus:border-vit-blue transition-colors"
                          />
                        </div>
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {clubs
                            .filter(c => (c.id || c._id) !== clubId)
                            .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(c => {
                              const isChecked = collaborationClubs.includes(c.name);
                              return (
                                <label
                                  key={c.id || c._id}
                                  className="flex items-center gap-2.5 p-2 hover:bg-slate-50 dark:hover:bg-vit-neutral-850 rounded-xl cursor-pointer text-xs select-none transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setCollaborationClubs(prev => prev.filter(name => name !== c.name));
                                      } else {
                                        setCollaborationClubs(prev => [...prev, c.name]);
                                      }
                                    }}
                                    className="rounded border-vit-neutral-300 text-vit-blue focus:ring-vit-blue cursor-pointer w-4 h-4"
                                  />
                                  <span className="text-vit-neutral-750 dark:text-vit-neutral-300 font-medium">{c.name}</span>
                                </label>
                              );
                            })}
                          {clubs
                            .filter(c => (c.id || c._id) !== clubId)
                            .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                            <p className="text-center text-vit-neutral-450 py-3 text-xs">No matching clubs found.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sponsorship Details Section */}
            <div className="md:col-span-2 border-t border-vit-neutral-200 dark:border-vit-neutral-755 pt-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSponsored}
                  onChange={(e) => {
                    setIsSponsored(e.target.checked);
                    if (!e.target.checked) {
                      setSponsorName('');
                      setSponsorAmount('');
                    }
                  }}
                  className="w-4 h-4 rounded border-vit-neutral-300 text-vit-blue focus:ring-vit-blue cursor-pointer"
                />
                <span className="text-sm font-bold text-vit-navy dark:text-white uppercase tracking-wider">
                  Sponsored Event (This event received external sponsorship)
                </span>
              </label>

              {isSponsored && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                      Sponsor Company / Name
                    </label>
                    <input
                      type="text"
                      value={sponsorName}
                      onChange={(e) => setSponsorName(e.target.value)}
                      placeholder="e.g. Google, Microsoft, Local Sponsor"
                      className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                      required={isSponsored}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-2">
                      Sponsorship Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={sponsorAmount}
                      onChange={(e) => setSponsorAmount(e.target.value)}
                      placeholder="e.g. 25000"
                      min="0"
                      className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
                      required={isSponsored}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: Attendance & Coordinator Details */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="text-base font-bold text-vit-navy dark:text-white border-b border-vit-neutral-200 dark:border-vit-neutral-700 pb-2">
            2. Attendance & Coordinator Details
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
                Faculty Coordinator Name
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
                Student Coordinator Name
              </label>
              <input
                type="text"
                value={studentCoordinator}
                onChange={(e) => setStudentCoordinator(e.target.value)}
                placeholder="e.g. Akshat Kumar"
                className="w-full px-4 py-3 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue focus:border-transparent text-sm font-medium"
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
                placeholder="e.g. 98765XXXXX"
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
            4. Report File Upload
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
            onClick={() => router.push('/dashboard')}
            className="px-5 py-3 border border-vit-neutral-300 dark:border-vit-neutral-700 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-800 text-sm font-semibold rounded-xl text-vit-neutral-750 dark:text-vit-neutral-250 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 glow-btn-primary rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving changes...' : (isEditMode ? 'Save Changes' : 'Submit Report')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmitReportForm;
