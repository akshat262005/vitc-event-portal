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
  
  // Date selection for daily view
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));

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

  const handleDownloadBundle = () => {
    if (!selectedDate) return;
    const url = `${api.defaults.baseURL}/admin/daily-bundle?date=${selectedDate}`;
    
    // Check if there are events/ODs on this date before downloading
    api.get(`/admin/daily-view?date=${selectedDate}`)
      .then(res => {
        if (res.data.reports.length === 0 && res.data.ods.length === 0) {
          showToast('No reports or OD lists found for the selected date.', 'error');
        } else {
          window.open(url, '_blank');
          showToast(`Initiating Daily Bundle download for ${selectedDate}...`, 'success');
        }
      })
      .catch(err => {
        showToast('Error checking daily view.', 'error');
      });
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

      {/* Unified Daily View Controls & Date picker */}
      <div className="glass-panel p-6">
        <h3 className="text-base font-bold text-vit-navy dark:text-white mb-4 flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-vit-blue" />
          <span>Unified Daily Event Explorer & Bundler</span>
        </h3>
        
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-vit-neutral-500 uppercase">Select Calendar Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-sm font-medium rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
            />
          </div>

          <button
            onClick={() => router.push(`/admin/daily-view?date=${selectedDate}`)}
            className="flex items-center gap-2 px-5 py-3 glow-btn-primary rounded-xl text-sm font-semibold cursor-pointer"
          >
            <span>Open Daily View</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleDownloadBundle}
            className="flex items-center gap-2 px-5 py-3 border border-vit-neutral-300 dark:border-vit-neutral-700 text-vit-neutral-750 dark:text-vit-neutral-250 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-800 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Daily ZIP Bundle</span>
          </button>
        </div>
      </div>

      {/* Analytical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Chart 1: Monthly Timeline */}
        <div className="glass-panel p-6 space-y-4">
          <h4 className="font-bold text-sm text-vit-neutral-500 uppercase tracking-wider border-b pb-2 dark:border-vit-neutral-700">
            Event Submissions Timeline
          </h4>
          {charts.monthlyEvents.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs text-vit-neutral-400">
              No historical data available
            </div>
          ) : (
            <div className="h-60 flex flex-col justify-end space-y-2 pt-4">
              {/* Timeline bar charts */}
              <div className="flex-1 flex items-end gap-3 justify-center pb-2">
                {charts.monthlyEvents.map((month, i) => {
                  const maxCount = Math.max(...charts.monthlyEvents.map(m => m.count), 1);
                  const heightPercent = `${(month.count / maxCount) * 80}%`;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="relative w-full flex justify-center">
                        {/* Hover count indicator */}
                        <span className="absolute -top-7 scale-0 group-hover:scale-100 bg-vit-navy text-white text-[10px] px-2 py-0.5 rounded font-bold transition-all shadow">
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
        <div className="glass-panel p-6 space-y-4">
          <h4 className="font-bold text-sm text-vit-neutral-500 uppercase tracking-wider border-b pb-2 dark:border-vit-neutral-700">
            Event Category Breakdown
          </h4>
          {charts.categoryEvents.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs text-vit-neutral-400">
              No category metrics available
            </div>
          ) : (
            <div className="h-60 flex flex-col justify-center space-y-3">
              {charts.categoryEvents.map((cat, i) => {
                const total = charts.categoryEvents.reduce((acc, c) => acc + c.count, 0);
                const percent = Math.round((cat.count / total) * 100);
                const barColor = chartColors[i % chartColors.length];

                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-vit-neutral-750 dark:text-vit-neutral-250 truncate pr-2">{cat.name}</span>
                      <span className="text-vit-neutral-500">{cat.count} ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 bg-vit-neutral-100 dark:bg-vit-neutral-900 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 3: Top Performing Clubs */}
        <div className="glass-panel p-6 space-y-4">
          <h4 className="font-bold text-sm text-vit-neutral-500 uppercase tracking-wider border-b pb-2 dark:border-vit-neutral-700">
            Club Event Distributions
          </h4>
          {charts.clubEvents.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs text-vit-neutral-400">
              No club data available
            </div>
          ) : (
            <div className="h-60 overflow-y-auto space-y-3 pr-1 pt-1">
              {charts.clubEvents
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
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
                      <div className="w-full h-4 bg-vit-neutral-100 dark:bg-vit-neutral-900 rounded-lg overflow-hidden flex">
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
