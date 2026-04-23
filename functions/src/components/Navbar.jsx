import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, UserCircle } from 'lucide-react';

const Navbar = () => {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [time, setTime] = useState(null);

  useEffect(() => {
    const fetchTime = async () => {
      try {
        const res = await fetch('http://worldtimeapi.org/api/timezone/Asia/Kolkata');
        const data = await res.json();
        setTime(new Date(data.datetime));
      } catch (err) {
        setTime(new Date()); // fallback
      }
    };
    fetchTime();

    const interval = setInterval(() => {
      setTime(prev => prev ? new Date(prev.getTime() + 1000) : new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    if (!date) return 'Loading clock...';
    const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return `${dateStr} — ${timeStr}`;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <nav className="bg-teal-600 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight hover:text-teal-100 transition-colors">
            <Activity className="h-8 w-8" />
            CureQ
          </Link>
          
          <div className="hidden md:flex font-mono text-teal-100 items-center justify-center">
            <span className="font-semibold text-sm tracking-wide bg-teal-800/50 px-4 py-1.5 rounded-xl border border-teal-700/50 transition-colors cursor-default shadow-inner">
              <span className="inline-block w-2 h-2 rounded-full bg-teal-400 mr-2 animate-pulse"></span>
              {formatTime(time)}
            </span>
          </div>
          
          <div>
            {currentUser ? (
              <div className="flex items-center gap-6">
                <div className="hidden sm:flex items-center gap-2">
                  <UserCircle className="h-5 w-5 opacity-80" />
                  <span className="font-medium text-sm capitalize">{userRole}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 px-4 py-2 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow active:scale-95"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <Link to="/auth" className="font-medium px-6 py-2 rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 bg-white text-teal-600 shadow-sm hover:bg-teal-50">Sign In / Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
