import React, { useEffect } from 'react';
import { Bell, X } from 'lucide-react';

const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 6000); // Hide after 6 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right fade-in duration-300">
      <div className="bg-white border-l-4 border-teal-500 shadow-xl rounded-xl p-4 flex items-start gap-4 max-w-sm">
        <div className="bg-teal-100 p-2 rounded-full flex-shrink-0">
          <Bell className="w-5 h-5 text-teal-600 animate-bounce" />
        </div>
        <div className="flex-1 pt-1">
          <h3 className="font-bold text-gray-900 text-sm">Automated Reminder</h3>
          <p className="text-sm text-gray-600 mt-1 leading-tight">{message}</p>
        </div>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
