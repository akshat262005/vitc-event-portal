'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import Loader from '../Common/Loader';
import {
  Compass,
  Users,
  FileCheck,
  FileSpreadsheet,
  Calendar,
  CalendarRange,
  ChevronRight,
  Download,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Hourglass
} from 'lucide-react';

const AdminDashboard = () => {
  const { showToast } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Date selection for unified view & bundle
  const todayStr = new Date().toISOString().substring(0, 10);
  const [dateMode, setDateMode] = useState('single'); // 'single' | 'range'
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      showToast('Error loading stats.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getActiveDates = () => {
    if (dateMode === 'single') {
      return { start: selectedDate, end: selectedDate, isRange: false };
    }
    return { start: startDate, end: endDate, isRange: startDate !== endDate };
  };

  const setQuickRange = (preset) => {
    const now = new Date();
    if (preset === 'today') {
      const d = now.toISOString().substring(0, 10);
      setDateMode('single');
      setSelectedDate(d);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const d = y.toISOString().substring(0, 10);
      setDateMode('single');
      setSelectedDate(d);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'last7') {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      setDateMode('range');
      setStartDate(past.toISOString().substring(0, 10));
      setEndDate(now.toISOString().substring(0, 10));
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateMode('range');
      setStartDate(firstDay.toISOString().substring(0, 10));
      setEndDate(now.toISOString().substring(0, 10));
    }
  };

  const handleOpenUnifiedView = () => {
    const { start, end } = getActiveDates();
    if (!start || !end) {
      showToast('Please select valid date(s).', 'error');
      return;
    }
    router.push(`/admin/daily-view?startDate=${start}&endDate=${end}`);
  };

  const handleDownloadBundle = async () => {
    const { start, end, isRange } = getActiveDates();
    if (!start || !end) {
      showToast('Please select valid date(s).', 'error');
      return;
    }

    try {
      const res = await api.get(`/admin/daily-view?startDate=${start}&endDate=${end}`);
      if ((res.data.reports?.length || 0) === 0 && (res.data.ods?.length || 0) === 0) {
        showToast(`No reports or OD lists found for ${isRange ? `${start} to ${end}` : start}.`, 'error');
        return;
      }

      const url = `${api.defaults.baseURL}/admin/daily-bundle?startDate=${start}&endDate=${end}`;
      window.open(url, '_blank');
      showToast(`Initiating bundle download for ${isRange ? `${start} to ${end}` : start}...`, 'success');
    } catch (err) {
      console.error('Download bundle error:', err);
      showToast('Error checking reports/ODs for the bundle.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  const { cards, charts } = stats || { cards: {}, charts: { monthlyEvents: [], categoryEvents: [], clubEvents: [] } };

  // Helper to generate colors for categories/clubs
  const chartColors = ['bg-vit-navy', 'bg-vit-blue', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-pink-500', 'bg-rose-500'];

  return (
    <div className="space-y-8 animate-fade-in p-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-vit-navy dark:text-white">Portal Control Center</h2>
        <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
          Monitor club activity, check event schedules, and process academic On Duty sheets campus-wide.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="glass-card p-5 flex flex-col justify-between h-32 border-l-4 border-yellow-500 hover:border-yellow-600 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-vit-neutral-500 uppercase tracking-wider">Pending Verification</span>
            <Clock className="w-4.5 h-4.5 text-yellow-500" />
          </div>
          <p className="text-2xl font-extrabold text-vit-navy dark:text-white">{cards.pendingVerification || 0}</p>
        </div>

        <div className="glass-card p-5 flex flex-col justify-between h-32 border-l-4 border-emerald-500 hover:border-emerald-600 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-vit-neutral-500 uppercase tracking-wider">Fully Verified</span>
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-vit-navy dark:text-white">{cards.fullyUpdated || 0}</p>
        </div>

        <div className="glass-card p-5 flex flex-col justify-between h-32 border-l-4 border-orange-500 hover:border-orange-600 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-vit-neutral-500 uppercase tracking-wider">Partially Verified</span>
            <AlertTriangle className="w-4.5 h-4.5 text-orange-500" />
          </div>
          <p className="text-2xl font-extrabold text-vit-navy dark:text-white">{cards.partiallyUpdated || 0}</p>
        </div>

        <div className="glass-card p-5 flex flex-col justify-between h-32 border-l-4 border-blue-500 hover:border-blue-600 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-vit-neutral-500 uppercase tracking-wider">Students Completed</span>
            <Users className="w-4.5 h-4.5 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-vit-navy dark:text-white">{cards.totalCompletedStudents || 0}</p>
        </div>

        <div className="glass-card p-5 flex flex-col justify-between h-32 border-l-4 border-red-500 hover:border-red-600 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-vit-neutral-500 uppercase tracking-wider">Students Remaining</span>
            <Hourglass className="w-4.5 h-4.5 text-red-500" />
          </div>
          <p className="text-2xl font-extrabold text-vit-navy dark:text-white">{cards.totalRemainingStudents || 0}</p>
        </div>
      </div>

      {/* Unified Event Explorer & Bundler Controls */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-vit-neutral-200/60 dark:border-vit-neutral-700/60 pb-3">
          <div>
            <h3 className="text-base font-bold text-vit-navy dark:text-white flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-vit-blue" />
              <span>Unified Event Ledger Explorer & Bundler</span>
            </h3>
            <p className="text-xs text-vit-neutral-500 dark:text-vit-neutral-400 mt-0.5">
              Review campus-wide events and student On-Duty lists for a single date or date range.
            </p>
          </div>

          {/* Mode Selector & Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-vit-neutral-100 dark:bg-vit-neutral-800 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDateMode('single')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateMode === 'single'
                    ? 'bg-white dark:bg-vit-neutral-700 text-vit-navy dark:text-white shadow-sm font-bold'
                    : 'text-vit-neutral-500 hover:text-vit-neutral-800 dark:hover:text-vit-neutral-200'
                }`}
              >
                Single Date
              </button>
              <button
                type="button"
                onClick={() => setDateMode('range')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateMode === 'range'
                    ? 'bg-white dark:bg-vit-neutral-700 text-vit-navy dark:text-white shadow-sm font-bold'
                    : 'text-vit-neutral-500 hover:text-vit-neutral-800 dark:hover:text-vit-neutral-200'
                }`}
              >
                Date Range
              </button>
            </div>

            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setQuickRange('today')}
                className="px-2.5 py-1.5 bg-vit-neutral-100 hover:bg-vit-neutral-200 dark:bg-vit-neutral-800 dark:hover:bg-vit-neutral-700 text-vit-neutral-700 dark:text-vit-neutral-300 rounded-lg font-medium cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setQuickRange('yesterday')}
                className="px-2.5 py-1.5 bg-vit-neutral-100 hover:bg-vit-neutral-200 dark:bg-vit-neutral-800 dark:hover:bg-vit-neutral-700 text-vit-neutral-700 dark:text-vit-neutral-300 rounded-lg font-medium cursor-pointer"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setQuickRange('last7')}
                className="px-2.5 py-1.5 bg-vit-neutral-100 hover:bg-vit-neutral-200 dark:bg-vit-neutral-800 dark:hover:bg-vit-neutral-700 text-vit-neutral-700 dark:text-vit-neutral-300 rounded-lg font-medium cursor-pointer"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setQuickRange('month')}
                className="px-2.5 py-1.5 bg-vit-neutral-100 hover:bg-vit-neutral-200 dark:bg-vit-neutral-800 dark:hover:bg-vit-neutral-700 text-vit-neutral-700 dark:text-vit-neutral-300 rounded-lg font-medium cursor-pointer"
              >
                This Month
              </button>
            </div>
          </div>
        </div>

        {/* Date Inputs & Action Buttons */}
        <div className="flex flex-wrap gap-4 items-end">
          {dateMode === 'single' ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-vit-neutral-500 uppercase">Select Calendar Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-sm font-medium rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-vit-neutral-500 uppercase">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-sm font-medium rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-vit-neutral-500 uppercase">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-sm font-medium rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleOpenUnifiedView}
            className="flex items-center gap-2 px-5 py-2.5 glow-btn-primary rounded-xl text-sm font-semibold cursor-pointer"
          >
            <span>Open Unified View</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleDownloadBundle}
            className="flex items-center gap-2 px-5 py-2.5 border border-vit-neutral-300 dark:border-vit-neutral-700 text-vit-neutral-750 dark:text-vit-neutral-250 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-800 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download ZIP Bundle</span>
          </button>
        </div>
      </div>

      {/* Analytical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Chart 1: Monthly Timeline */}
        <div className="glass-panel p-6 flex flex-col h-[340px]">
          <h4 className="font-bold text-sm text-vit-neutral-500 uppercase tracking-wider border-b pb-2.5 dark:border-vit-neutral-700 shrink-0">
            Event Submissions Timeline
          </h4>
          {charts.monthlyEvents.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-vit-neutral-400">
              No historical data available
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col justify-end space-y-2 pt-4">
              {/* Timeline bar charts */}
              <div className="flex-1 flex items-end gap-3 justify-center pb-2">
                {charts.monthlyEvents.map((month, i) => {
                  const maxCount = Math.max(...charts.monthlyEvents.map(m => m.count), 1);
                  const heightPercent = `${(month.count / maxCount) * 80}%`;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="relative w-full flex justify-center">
                        {/* Hover count indicator */}
                        <span className="absolute -top-7 scale-0 group-hover:scale-100 bg-vit-navy text-white text-[10px] px-2 py-0.5 rounded font-bold transition-all shadow z-10">
                          {month.count}
                        </span>
                        <div
                          style={{ height: heightPercent }}
                          className="w-8 bg-gradient-to-t from-vit-navy to-vit-blue rounded-t-lg transition-all duration-500 hover:opacity-85 shadow"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-vit-neutral-400 select-none">
                        {month.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Category Breakdown */}
        <div className="glass-panel p-6 flex flex-col h-[340px]">
          <div className="flex items-center justify-between border-b pb-2.5 dark:border-vit-neutral-700 shrink-0">
            <h4 className="font-bold text-sm text-vit-neutral-500 uppercase tracking-wider">
              Event Category Breakdown
            </h4>
            {charts.categoryEvents && charts.categoryEvents.length > 0 && (
              <span className="text-[11px] font-semibold text-vit-blue bg-vit-sky/40 dark:bg-vit-blue/20 dark:text-sky-300 px-2 py-0.5 rounded-full">
                {charts.categoryEvents.length} Categories
              </span>
            )}
          </div>

          {(!charts.categoryEvents || charts.categoryEvents.length === 0) ? (
            <div className="flex-1 flex items-center justify-center text-xs text-vit-neutral-400">
              No category metrics available
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-2 pt-3">
              {(() => {
                const total = charts.categoryEvents.reduce((acc, c) => acc + c.count, 0) || 1;
                const sorted = [...charts.categoryEvents].sort((a, b) => b.count - a.count);

                return sorted.map((cat, i) => {
                  const percent = Math.round((cat.count / total) * 100);
                  const barColor = chartColors[i % chartColors.length];

                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-vit-neutral-750 dark:text-vit-neutral-250 truncate pr-2" title={cat.name}>
                          {cat.name}
                        </span>
                        <span className="text-vit-neutral-500 font-bold shrink-0">
                          {cat.count} <span className="font-normal text-[11px]">({percent}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-vit-neutral-100 dark:bg-vit-neutral-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Chart 3: Top Performing Clubs */}
        <div className="glass-panel p-6 flex flex-col h-[340px]">
          <h4 className="font-bold text-sm text-vit-neutral-500 uppercase tracking-wider border-b pb-2.5 dark:border-vit-neutral-700 shrink-0">
            Club Event Distributions
          </h4>
          {charts.clubEvents.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-vit-neutral-400">
              No club data available
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-2 pt-3">
              {charts.clubEvents
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
                .map((club, i) => {
                  const maxCount = Math.max(...charts.clubEvents.map(c => c.count), 1);
                  const widthPercent = `${(club.count / maxCount) * 100}%`;
                  
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-vit-neutral-750 dark:text-vit-neutral-250 truncate max-w-[200px]" title={club.name}>
                          {club.name}
                        </span>
                        <span className="text-vit-neutral-500 font-bold">{club.count}</span>
                      </div>
                      <div className="w-full h-3 bg-vit-neutral-100 dark:bg-vit-neutral-900 rounded-lg overflow-hidden flex">
                        <div
                          className="h-full bg-gradient-to-r from-vit-navy to-vit-blue rounded-lg shadow-sm"
                          style={{ width: widthPercent }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
