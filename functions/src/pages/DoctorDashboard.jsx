import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, collection, updateDoc, doc, query, where, onSnapshot } from '../firebase';
import { CheckCircle, Play, Clock, UserIcon } from 'lucide-react';

const DoctorDashboard = () => {
  const { currentUser } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    setLoading(true);
    const q = query(
      collection(db, 'appointments'), 
      where('doctorId', '==', currentUser.uid),
      where('appointmentDate', '==', selectedDate)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let queue = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const order = { 'in-progress': 1, 'pending': 2, 'completed': 3 };
      queue.sort((a, b) => {
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return (a.token || 999) - (b.token || 999);
      });
      
      setAppointments(queue);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, selectedDate]);

  const recalculateQueue = async (startTime) => {
    const pending = appointments.filter(a => a.status === 'pending');
    for (let i = 0; i < pending.length; i++) {
      const newTime = new Date(startTime.getTime() + (i + 1) * 4 * 60000);
      try {
        await updateDoc(doc(db, 'appointments', pending[i].id), {
          projectedTime: newTime.toISOString()
        });
      } catch (err) {
        console.error("Error shifting queue", err);
      }
    }
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), { 
        status: newStatus,
        ...(newStatus === 'in-progress' ? { actualStartTime: new Date().toISOString() } : {})
      });
      
      // If completed, trigger a ripple update from now + 4 mins
      if (newStatus === 'completed') {
        await recalculateQueue(new Date());
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const shiftQueueManually = () => {
    recalculateQueue(new Date());
  };

  // Find the first pending item to mark it as "Next"
  const nextPendingId = appointments.find(a => a.status === 'pending')?.id;

  const getHighlightClass = (apt) => {
    if (apt.status === 'in-progress') return 'border-green-500 bg-green-50/30 ring-1 ring-green-500/20 shadow-green-100';
    if (apt.id === nextPendingId) return 'border-blue-400 bg-blue-50/20 ring-1 ring-blue-400/20 shadow-blue-100';
    if (apt.status === 'completed') return 'border-gray-100 opacity-60 bg-gray-50';
    return 'border-gray-200 hover:border-gray-300';
  };

  const getStatusBadge = (apt) => {
    if (apt.status === 'in-progress') return <span className="text-xs px-2.5 py-0.5 rounded-full border font-medium uppercase tracking-wider bg-green-100 text-green-800 border-green-200 animate-pulse">Current</span>;
    if (apt.id === nextPendingId) return <span className="text-xs px-2.5 py-0.5 rounded-full border font-medium uppercase tracking-wider bg-blue-100 text-blue-800 border-blue-200">Next</span>;
    if (apt.status === 'completed') return <span className="text-xs px-2.5 py-0.5 rounded-full border font-medium uppercase tracking-wider bg-gray-100 text-gray-600 border-gray-200">Done</span>;
    return <span className="text-xs px-2.5 py-0.5 rounded-full border font-medium uppercase tracking-wider bg-gray-100 text-gray-500 border-gray-200">Waiting</span>;
  };

  return (
    <div className="py-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your appointments and live token queue.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">View Schedule</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-teal-600 bg-teal-50 px-4 py-2 rounded-xl font-medium shadow-sm border border-teal-100">
            <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div> Live Sync
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-semibold text-gray-800">Current Queue</h2>
        </div>
        
        {loading ? (
          <div className="p-12 flex justify-center text-teal-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <Clock className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-lg font-medium">Your queue is currently empty.</p>
            <p className="text-sm">New appointments will appear here.</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {appointments.map((apt) => (
              <div key={apt.id} className={`p-5 rounded-2xl transition-all duration-300 border shadow-sm flex flex-col sm:flex-row justify-between gap-4 sm:items-center ${getHighlightClass(apt)}`}>
                <div className="flex gap-5 items-center">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xl shadow-inner
                    ${apt.status === 'in-progress' ? 'bg-green-100 text-green-700' : 
                      apt.id === nextPendingId ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}
                  `}>
                    #{apt.token || '?'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                      {apt.patientData?.name || 'Unknown Patient'} 
                      {getStatusBadge(apt)}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {apt.patientData?.age} yrs • {apt.patientData?.gender} • <span className="font-medium">Reason:</span> {apt.patientData?.reason}
                    </p>
                    <p className="text-sm font-medium text-gray-700 mt-2 flex items-center gap-1.5">
                      <Clock size={14} className={apt.status === 'in-progress' ? 'text-green-600' : 'text-teal-600'} /> 
                      Projected: <span className={apt.status === 'in-progress' ? 'text-green-600 font-bold underline' : 'text-teal-700'}>
                        {apt.projectedTime ? new Date(apt.projectedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                      </span>
                      {apt.status === 'in-progress' && apt.actualStartTime && (
                        (() => {
                          const elapsedMs = currentTime - new Date(apt.actualStartTime);
                          const isOvertime = elapsedMs > 4 * 60000;
                          return isOvertime ? (
                            <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full ml-2 border border-red-100 animate-pulse">
                              OVERTIME (+{Math.floor(elapsedMs / 60000)}m)
                            </span>
                          ) : null;
                        })()
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {apt.status === 'in-progress' && (() => {
                    const elapsedMs = currentTime - new Date(apt.actualStartTime);
                    if (elapsedMs > 4 * 60000) {
                      return (
                        <button 
                          onClick={shiftQueueManually}
                          className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg font-bold hover:bg-amber-100 transition-colors shadow-sm"
                        >
                          Shift Queue (Late)
                        </button>
                      );
                    }
                    return null;
                  })()}
                  {apt.status === 'pending' && (
                    <button 
                      onClick={() => handleUpdateStatus(apt.id, 'in-progress')}
                      className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-green-50 hover:text-green-700 hover:border-green-200 px-4 py-2 rounded-xl font-medium transition-colors shadow-sm"
                    >
                      <Play size={16} /> Start
                    </button>
                  )}
                  {apt.status === 'in-progress' && (
                    <button 
                      onClick={() => handleUpdateStatus(apt.id, 'completed')}
                      className="flex items-center gap-1.5 bg-green-600 text-white hover:bg-green-700 px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95"
                    >
                      <CheckCircle size={18} /> Mark Done
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;
