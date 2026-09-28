'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import Loader from '../Common/Loader';
import { autoFitColumns, applyExcelStyling, isStudentRemarkMatched } from '@/lib/excel-utils';
import {
  CalendarDays,
  FileText,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  RotateCcw
} from 'lucide-react';

const UnifiedDailyView = () => {
  const { showToast } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Date state
  const dateParam = searchParams.get('date') || new Date().toISOString().substring(0, 10);
  const [date, setDate] = useState(dateParam);

  const [reports, setReports] = useState([]);
  const [ods, setOds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedODRow, setExpandedODRow] = useState(null);

  const fetchDailyData = async (queryDate) => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/daily-view?date=${queryDate}`);
      setReports(response.data.reports || []);
      setOds(response.data.ods || []);
    } catch (error) {
      console.error('Failed to load daily view data:', error);
      showToast('Error loading daily data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData(dateParam);
    if (date !== dateParam) {
      setDate(dateParam);
    }
  }, [dateParam]);

  const handleDateChange = (newDate) => {
    setDate(newDate);
    router.push(`/admin/daily-view?date=${newDate}`);
  };

  const handleDownloadReport = (filePath) => {
    if (!filePath) return;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      window.open(filePath, '_blank');
    } else {
      const url = `${api.defaults.baseURL.replace('/api', '')}${filePath}`;
      window.open(url, '_blank');
    }
  };

  const handleDownloadODExcel = async (odItem) => {
    try {
      const xlsx = await import('xlsx');
      const wsData = [
        ['Club Name', odItem.clubName],
        ['Event Name', odItem.eventName],
        ['Event Date', odItem.eventDate],
        ['Time Slot', odItem.timeSlot || 'N/A'],
        ['Admin Remarks', odItem.adminRemarks || 'N/A'],
        [],
        ['Registration Number', 'Student Name', 'Date', 'Time', 'Remarks Status (Green / Red)']
      ];
      
      (odItem.students || []).forEach(s => {
        const isMatched = isStudentRemarkMatched(s.registrationNumber, odItem.adminRemarks);
        const remarkStatusText = isMatched ? 'Matched in Remarks (Green)' : 'Pending / Marked Red (Red)';
        wsData.push([s.registrationNumber.toUpperCase(), s.studentName, s.date || odItem.eventDate, s.time, remarkStatusText]);
      });

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet(wsData);
      applyExcelStyling(ws, wsData, 6, 4);
      ws['!cols'] = autoFitColumns(wsData, 6);
      xlsx.utils.book_append_sheet(wb, ws, 'OD Student List');
      xlsx.writeFile(wb, `${odItem.eventName.replace(/[^a-z0-9]/gi, '_')}_OD_List.xlsx`);
      showToast('OD List Excel generated successfully.', 'success');
    } catch (err) {
      console.error('Excel generation failed:', err);
      showToast('Failed to generate Excel download.', 'error');
    }
  };

  const handleDownloadBundle = () => {
    if (reports.length === 0 && ods.length === 0) {
      showToast('No documents available for bundle on this date.', 'error');
      return;
    }
    const url = `${api.defaults.baseURL}/admin/daily-bundle?date=${dateParam}`;
    window.open(url, '_blank');
    showToast('Initiating bundle download...', 'success');
  };

  const toggleExpandOD = (index) => {
    setExpandedODRow(expandedODRow === index ? null : index);
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-vit-neutral-200/60 dark:border-vit-neutral-700/60 pb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-vit-navy dark:text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-vit-blue" />
            <span>Unified Daily Event Ledger</span>
          </h2>
          <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
            Display all events conducted and student On Duties uploaded on a single calendar day.
          </p>
        </div>

        {/* Date Selection and Bundle Downloader */}
        <div className="flex flex-wrap items-center gap-3">
          {date !== new Date().toISOString().substring(0, 10) && (
            <button
              onClick={() => handleDateChange(new Date().toISOString().substring(0, 10))}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-all duration-200 border border-rose-200 dark:border-rose-900/40 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Date</span>
            </button>
          )}

          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            onBlur={(e) => {
              const val = e.target.value;
              if (val) {
                const parts = val.split('-');
                if (parts[0] && parts[0].length > 4) {
                  parts[0] = parts[0].slice(0, 4);
                  handleDateChange(parts.join('-'));
                }
              }
            }}
            className="px-4 py-2.5 bg-white dark:bg-vit-neutral-800 border border-vit-neutral-200 dark:border-vit-neutral-700 text-sm font-semibold rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
          />

          <button
            onClick={handleDownloadBundle}
            disabled={reports.length === 0 && ods.length === 0}
            className="flex items-center gap-2 px-5 py-3 glow-btn-primary rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>Download Daily Bundle (ZIP)</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT SIDE: Event Reports */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-vit-navy dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-vit-blue" />
                <span>Submitted Event Reports ({reports.length})</span>
              </h3>
            </div>

            {reports.length === 0 ? (
              <div className="glass-panel p-8 text-center text-vit-neutral-500 dark:text-vit-neutral-400">
                No reports submitted on this date.
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id || report._id} className="glass-card p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-vit-navy dark:text-white text-base">
                          {report.eventName}
                        </h4>
                        <p className="text-xs text-vit-blue dark:text-sky-400 font-semibold mt-1">
                          {report.clubName}
                        </p>
                      </div>
                      <span className="text-xs bg-vit-sky text-vit-blue dark:bg-vit-blue/20 dark:text-sky-300 px-2.5 py-1 rounded-full font-bold">
                        {report.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-vit-neutral-100 dark:border-vit-neutral-700/60 pt-3 text-vit-neutral-600 dark:text-vit-neutral-350">
                      <p><strong>Venue:</strong> {report.venue}</p>
                      <p><strong>Time:</strong> {report.eventTime}</p>
                      <p className="col-span-2"><strong>Duration:</strong> {report.eventEndDate && report.eventEndDate !== report.eventDate ? `${report.eventDate} to ${report.eventEndDate}` : report.eventDate}</p>
                      <p className="col-span-2"><strong>Attendance:</strong> {report.numberOfParticipants} students</p>
                      {report.facultyCoordinator && <p className="col-span-2"><strong>Faculty Coordinator:</strong> {report.facultyCoordinator}</p>}
                      <p className="col-span-2"><strong>Student Coordinator:</strong> {report.studentCoordinator}</p>
                      {report.studentCoordinatorContact && <p className="col-span-2"><strong>Coordinator Contact:</strong> {report.studentCoordinatorContact}</p>}
                      {report.isCollaboration && report.collaborationClubs && report.collaborationClubs.length > 0 && (
                        <p className="col-span-2 text-vit-blue font-semibold">🤝 <strong>Collaboration:</strong> {report.collaborationClubs.join(', ')}</p>
                      )}
                      {report.isSponsored && (
                        <p className="col-span-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                          💰 <strong>Sponsored:</strong> {report.sponsorName} (₹{report.sponsorAmount?.toLocaleString('en-IN') || 0})
                        </p>
                      )}
                      <p className="col-span-2"><strong>Event Outcome:</strong> {report.outcome}</p>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-vit-neutral-100 dark:border-vit-neutral-700/60">
                      <button
                        onClick={() => handleDownloadReport(report.reportFilePath)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-vit-neutral-50 hover:bg-vit-neutral-100 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-lg text-vit-neutral-800 dark:text-white transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Document</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDE: OD Student Lists */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-vit-navy dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                <span>Submitted On-Duty Lists ({ods.length})</span>
              </h3>
            </div>

            {ods.length === 0 ? (
              <div className="glass-panel p-8 text-center text-vit-neutral-500 dark:text-vit-neutral-400">
                No OD lists submitted on this date.
              </div>
            ) : (
              <div className="space-y-4">
                {ods.map((od, index) => (
                  <div key={od.id || od._id} className="glass-card overflow-hidden">
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-vit-navy dark:text-white text-base">
                            {od.eventName}
                          </h4>
                          <p className="text-xs text-vit-blue dark:text-sky-400 font-semibold mt-1">
                            {od.clubName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full font-bold border border-amber-200 dark:border-amber-900/40">
                            <Clock className="w-3.5 h-3.5" />
                            {od.timeSlot}
                          </span>
                          <span className="text-xs bg-vit-sky text-vit-blue dark:bg-vit-blue/20 dark:text-sky-300 px-2.5 py-1 rounded-full font-bold">
                            {od.students?.length || 0} Students
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-vit-neutral-100 dark:border-vit-neutral-700/60">
                        <button
                          onClick={() => toggleExpandOD(index)}
                          className="flex items-center gap-1 text-xs font-bold text-vit-neutral-500 hover:text-vit-blue dark:hover:text-white cursor-pointer"
                        >
                          {expandedODRow === index ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              <span>Hide Student Details</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              <span>Show Student Details</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDownloadODExcel(od)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/25 border border-emerald-250 dark:border-emerald-900 text-xs font-semibold rounded-lg text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Download Excel</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable student list details */}
                    {expandedODRow === index && (
                      <div className="bg-vit-neutral-50 dark:bg-vit-neutral-900 border-t border-vit-neutral-200/50 dark:border-vit-neutral-700/50 overflow-x-auto max-h-64">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-vit-neutral-100/55 dark:bg-vit-neutral-850 text-vit-neutral-500 font-bold uppercase border-b border-vit-neutral-200 dark:border-vit-neutral-700">
                              <th className="px-4 py-2">Reg Number</th>
                              <th className="px-4 py-2">Student Name</th>
                              <th className="px-4 py-2">Date</th>
                              <th className="px-4 py-2">Time</th>
                              <th className="px-4 py-2 text-center">Remark Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-700">
                            {(od.students || []).map((student, sIdx) => {
                              const isMatched = isStudentRemarkMatched(student.registrationNumber, od.adminRemarks);
                              return (
                                <tr
                                  key={sIdx}
                                  className={`transition-colors border-l-4 ${
                                    isMatched
                                      ? 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-500'
                                      : 'bg-rose-50/60 dark:bg-rose-950/25 border-rose-500'
                                  }`}
                                >
                                  <td className={`px-4 py-2 font-bold uppercase ${isMatched ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                                    {student.registrationNumber}
                                  </td>
                                  <td className="px-4 py-2 font-semibold">
                                    {student.studentName}
                                  </td>
                                  <td className="px-4 py-2 text-vit-neutral-500">
                                    {student.date}
                                  </td>
                                  <td className="px-4 py-2 text-vit-neutral-500">
                                    {student.time}
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    {isMatched ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-300 dark:border-emerald-800">
                                        🟢 Matched (Green)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-full font-bold border border-rose-300 dark:border-rose-800">
                                        🔴 Marked Red
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default UnifiedDailyView;
