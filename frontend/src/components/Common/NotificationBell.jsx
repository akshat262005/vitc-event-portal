import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NotificationBell = ({ align = 'down' }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 30 seconds for real-time update feel
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-vit-neutral-500 hover:text-vit-blue dark:text-vit-neutral-400 dark:hover:text-white rounded-lg hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-800 transition-colors focus:outline-none"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-vit-neutral-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute w-80 bg-white dark:bg-vit-neutral-800 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl shadow-xl z-50 overflow-hidden ${
          align === 'up' 
            ? 'bottom-full left-[-160px] mb-3' 
            : 'right-0 mt-2'
        }`}>
          <div className="px-4 py-3 border-b border-vit-neutral-200 dark:border-vit-neutral-700 flex items-center justify-between">
            <span className="font-semibold text-sm text-vit-neutral-800 dark:text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-vit-blue hover:text-vit-navy dark:text-sky-400 dark:hover:text-sky-300"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-vit-neutral-100 dark:divide-vit-neutral-700">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-vit-neutral-500 dark:text-vit-neutral-400">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id || n._id}
                  className={`px-4 py-3 hover:bg-vit-neutral-50 dark:hover:bg-vit-neutral-750 transition-colors ${
                    !n.isRead ? 'bg-vit-sky/30 dark:bg-vit-blue/10' : ''
                  }`}
                >
                  <p className="text-xs font-semibold text-vit-neutral-900 dark:text-white">
                    {n.title}
                  </p>
                  <p className="text-xs mt-0.5 text-vit-neutral-600 dark:text-vit-neutral-350">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-vit-neutral-400 dark:text-vit-neutral-500 mt-1 block">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
