import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, collection, getDocs, addDoc, query, where, onSnapshot, doc, updateDoc, getDoc } from '../firebase';
import { triggerCall } from '../services/NotificationService';
import { Building2, Stethoscope, Clock, CheckCircle2, UserCircle2, X, Activity, MapPin, Search, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Toast from '../components/Toast';

// Leaflet Icons Setup
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to dynamically pan map
function UpdateMapCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

// Live Countdown Component
const LiveCountdown = ({ projectedTime }) => {
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0, ready: false });

  useEffect(() => {
    if (!projectedTime) return;
    const timer = setInterval(() => {
      const diff = new Date(projectedTime).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, ready: true });
      } else {
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft({ minutes: m, seconds: s, ready: false });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [projectedTime]);

  if (timeLeft.ready) {
    return <p className="text-sm font-bold text-teal-100 mt-2 animate-pulse mb-1">Almost there! Please wait for the doctor.</p>;
  }
  return (
    <p className="text-sm font-semibold text-teal-800 mt-2 mb-1 bg-teal-50 inline-block px-3 py-1 rounded-full border border-teal-100 shadow-sm animate-in fade-in transition-all">
      Your turn in <span className="text-teal-600 font-bold">{timeLeft.minutes}m {timeLeft.seconds}s</span>
    </p>
  );
};

// Live Digital Clock for current session
const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</>;
};

// Premium Hardcoded Unsplash Assets (Replaces deprecated source.unsplash.com)

const doctorAvatars = [
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&q=80',
  'https://images.unsplash.com/photo-1612349317150-e4d38baf4723?w=100&h=100&fit=crop&q=80',
  'https://images.unsplash.com/photo-1537368910025-7001c08cb36a?w=100&h=100&fit=crop&q=80',
  'https://images.unsplash.com/photo-1622253692010-33bfac6da92d?w=100&h=100&fit=crop&q=80'
];

const PatientDashboard = () => {
  const { currentUser } = useAuth();
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [fetchingHospitals, setFetchingHospitals] = useState(false);
  
  const [myAppointment, setMyAppointment] = useState(null);
  const [liveDoctorQueue, setLiveDoctorQueue] = useState([]);
  
  const [toastMessage, setToastMessage] = useState(null);
  const [feedbackAppointment, setFeedbackAppointment] = useState(null);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const notifiedAppointments = React.useRef(new Set());
  const reminderCallsSent = React.useRef(new Set());

  // Listen for simulated call events from the Notification Service
  useEffect(() => {
    const handleCureQNotify = (e) => {
      setToastMessage(e.detail.message);
    };
    window.addEventListener('cureq-notification', handleCureQNotify);
    return () => window.removeEventListener('cureq-notification', handleCureQNotify);
  }, []);

  useEffect(() => {
    if (myAppointment?.reminderSent && !notifiedAppointments.current.has(myAppointment.id)) {
      setToastMessage(`Your appointment with ${myAppointment.doctorName} is in 5 minutes! Token number ${myAppointment.token}.`);
      notifiedAppointments.current.add(myAppointment.id);
    }
  }, [myAppointment]);

  // Map & Location States
  const defaultLocation = { lat: 40.7128, lng: -74.0060 }; // NYC Default
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultLocation);
  const [searchQuery, setSearchQuery] = useState('');
  const [hospitals, setHospitals] = useState([]);

  const [formData, setFormData] = useState({
    name: '', age: '', gender: 'male', reason: '',
    appointmentDate: new Date().toISOString().split('T')[0]
  });

  const generateFallbackHospitals = (lat, lng) => [
    { id: `fallback_${Math.random()}`, name: '(Demo) Apollo City Hospital', address: 'Downtown Clinic', rating: '4.8', lat: lat + 0.015, lng: lng + 0.01 },
    { id: `fallback_${Math.random()}`, name: '(Demo) Mercy General', address: 'Westside Care', rating: '4.6', lat: lat - 0.015, lng: lng - 0.02 },
    { id: `fallback_${Math.random()}`, name: '(Demo) Sunrise Clinic', address: 'Eastside Wellness', rating: '4.9', lat: lat + 0.005, lng: lng - 0.03 },
  ];

  const fetchRealHospitals = async (lat, lng) => {
    try {
      setFetchingHospitals(true);
      // Fetching both nodes and ways to capture all real-world hospitals accurately!
      const queryStr = `[out:json];nwr["amenity"~"hospital|clinic"](around:8000, ${lat}, ${lng});out center 10;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(queryStr)}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Overpass API Rate limit or Error"); 
      
      const data = await res.json();
      
      if (data && data.elements && data.elements.length > 0) {
        const parsedHospitals = data.elements.map((el, idx) => {
          let parsedAddress = 'Address mapped via GPS coordinates';
          if (el.tags?.['addr:full']) {
            parsedAddress = el.tags['addr:full'];
          } else if (el.tags?.['addr:street']) {
            parsedAddress = `${el.tags['addr:housenumber'] || ''} ${el.tags['addr:street']}, ${el.tags['addr:city'] || ''}`.trim();
          } else if (el.tags?.['addr:city']) {
            parsedAddress = `Located in ${el.tags['addr:city']}`;
          }

          return {
            id: `osm_${el.id}`,
            name: el.tags?.name || 'Local Medical Clinic',
            address: parsedAddress,
            rating: (4 + Math.random()).toFixed(1),
            lat: el.center?.lat || el.lat,
            lng: el.center?.lon || el.lon
          };
        });
        setHospitals(parsedHospitals);
      } else {
        setHospitals(generateFallbackHospitals(lat, lng));
      }
    } catch (err) {
      console.error("Using fallback hospitals due to network error:", err);
      setHospitals(generateFallbackHospitals(lat, lng));
    } finally {
      setFetchingHospitals(false);
    }
  };

  const fetchMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setMapCenter(loc);
          setSearchQuery('');
          fetchRealHospitals(loc.lat, loc.lng);
        },
        () => alert("Location permission denied. Please allow it in your browser settings.")
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  useEffect(() => {
    let triggered = false;
    if (navigator.geolocation && !triggered) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setMapCenter(loc);
          fetchRealHospitals(loc.lat, loc.lng);
        },
        () => {
          fetchRealHospitals(defaultLocation.lat, defaultLocation.lng);
        }
      );
      triggered = true;
    } else if (!triggered) {
      fetchRealHospitals(defaultLocation.lat, defaultLocation.lng);
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const loc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setMapCenter(loc);
        fetchRealHospitals(loc.lat, loc.lng);
      } else {
        alert("Location not found. Please try another city.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'appointments'), 
      where('patientId', '==', currentUser.uid),
      where('appointmentDate', '==', todayStr)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const allAppts = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
      
      // Separate active/in-complete from completed ones that need a rating
      const active = allAppts.find(a => a.status !== 'completed');
      if (active) setMyAppointment(active);
      else {
        setMyAppointment(null); 
        setLiveDoctorQueue([]);
        
        // Find if there is a recently completed appointment that hasn't been rated yet
        const lastCompleted = allAppts
          .filter(a => a.status === 'completed' && !a.rating)
          .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0];
        
        if (lastCompleted) {
          setFeedbackAppointment(lastCompleted);
        }
      }
    });
    return () => unsub();
  }, [currentUser]);

  // Automated 5-Minute Reminder Logic
  useEffect(() => {
    if (!myAppointment || myAppointment.status === 'in-progress' || !myAppointment.projectedTime) return;
    
    const checkReminder = () => {
      const diffMs = new Date(myAppointment.projectedTime).getTime() - new Date().getTime();
      const diffMins = diffMs / 60000;
      
      if (diffMins <= 5 && diffMins > 0 && !reminderCallsSent.current.has(myAppointment.id)) {
        triggerCall('reminder', {
          patientName: myAppointment.patientData?.name || 'Patient',
          doctorName: myAppointment.doctorName,
          hospitalName: myAppointment.hospitalName
        });
        reminderCallsSent.current.add(myAppointment.id);
      }
    };

    const timer = setInterval(checkReminder, 30000); // Check every 30 seconds
    return () => clearInterval(timer);
  }, [myAppointment]);

  useEffect(() => {
    if (!myAppointment) return;
    const q = query(collection(db, 'appointments'), where('doctorId', '==', myAppointment.doctorId));
    const unsub = onSnapshot(q, (snapshot) => {
      let queue = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter(a => a.status !== 'completed');
      const order = { 'in-progress': 1, 'pending': 2 };
      queue.sort((a, b) => {
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return (a.token || 999) - (b.token || 999);
      });
      setLiveDoctorQueue(queue);
    });
    return () => unsub();
  }, [myAppointment]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
      const snapshot = await getDocs(q);
      const docsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (docsList.length === 0) {
        setDoctors([
          { id: 'doc1', name: 'Dr. Sarah Connor', specialization: 'Cardiologist', avatar: doctorAvatars[0], availability: '10:00 AM - 2:00 PM' },
          { id: 'doc2', name: 'Dr. James Smith', specialization: 'Neurologist', avatar: doctorAvatars[1], availability: '1:00 PM - 5:00 PM' }
        ]);
      } else {
        setDoctors(docsList.map((d, index) => ({ 
          ...d, 
          avatar: doctorAvatars[index % doctorAvatars.length], 
          availability: '10:00 AM - 4:00 PM' 
        })));
      }
    } catch (err) { }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedHospital) fetchDoctors();
  }, [selectedHospital]);

  const handleBook = async (e) => {
    e.preventDefault();
    try {
      // Fetch only for the selected date
      const qDocs = query(
        collection(db, 'appointments'), 
        where('doctorId', '==', selectedDoctor.id),
        where('appointmentDate', '==', formData.appointmentDate)
      );
      const snaps = await getDocs(qDocs);
      const doctorApts = snaps.docs.map(d => d.data());
      
      const nextTokenNumber = doctorApts.length + 1;
      
      // Calculate projected time: Based on 4-minute intervals
      // Try to find the latest finishing time on that date, otherwise start from 9AM or Now
      let baseTime = new Date(formData.appointmentDate);
      baseTime.setHours(9, 0, 0, 0);
      
      // If booking for today and 9AM is past, use current time
      const now = new Date();
      if (formData.appointmentDate === now.toISOString().split('T')[0] && baseTime < now) {
        baseTime = now;
      }

      const projectedTime = new Date(baseTime.getTime() + (nextTokenNumber - 1) * 4 * 60000);

      const newAppt = {
        patientId: currentUser.uid,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        hospitalId: selectedHospital.id,
        hospitalName: selectedHospital.name,
        patientData: {
          name: formData.name,
          age: formData.age,
          gender: formData.gender,
          reason: formData.reason
        },
        appointmentDate: formData.appointmentDate,
        token: nextTokenNumber,
        projectedTime: projectedTime.toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'appointments'), newAppt);
      
      // Trigger instant confirmation call
      triggerCall('booking', {
        patientName: formData.name,
        doctorName: selectedDoctor.name,
        hospitalName: selectedHospital.name,
        date: formData.appointmentDate,
        token: nextTokenNumber
      });

      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedDoctor(null);
        setSelectedHospital(null);
        setFormData({ 
          name: '', age: '', gender: 'male', reason: '',
          appointmentDate: new Date().toISOString().split('T')[0]
        });
      }, 2000);
    } catch (error) {
      console.error("Booking failed", error);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackAppointment) return;
    try {
      await updateDoc(doc(db, 'appointments', feedbackAppointment.id), {
        rating: rating,
        feedback: feedbackText,
        updatedAt: new Date().toISOString()
      });
      setFeedbackAppointment(null);
      setRating(5);
      setFeedbackText('');
      setToastMessage("Thank you for your feedback!");
    } catch (error) {
      console.error("Feedback failed", error);
    }
  };

  const handleFocusHospital = (h) => {
    setMapCenter({ lat: h.lat, lng: h.lng });
  };

  const nextPendingId = liveDoctorQueue.find(a => a.status === 'pending')?.id;

  return (
    <div className="py-6 animate-in fade-in duration-500 relative">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Patient Dashboard</h1>
        <p className="text-gray-500 mt-1">Book an appointment and view nearby hospitals on the map.</p>
      </div>

      {myAppointment && (
        <div className="mb-10 bg-white rounded-3xl p-6 shadow-lg border border-teal-100 ring-4 ring-teal-50 animate-in slide-in-from-top-4 duration-500 fade-in relative overflow-hidden">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-400"></div>

          <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="text-teal-500" /> Live Queue Tracking
              </h2>
              <p className="text-gray-500 mt-0.5">Tracking for <span className="font-semibold text-teal-700">{myAppointment.doctorName}</span> at {myAppointment.hospitalName}</p>
            </div>
            <div className="bg-teal-600 text-white rounded-xl px-5 py-3 text-center shadow-md transform hover:scale-105 transition-transform">
              <p className="text-xs font-semibold text-teal-100 uppercase tracking-widest mb-1">Your Token</p>
              <p className="text-3xl font-black leading-none">#{myAppointment.token}</p>
            </div>
          </div>

          <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
            {liveDoctorQueue.map((apt) => {
              const isMe = apt.id === myAppointment.id;
              const isCurrent = apt.status === 'in-progress';
              const isNext = apt.id === nextPendingId;
              
              let styleClass = "bg-gray-50 border-gray-200 text-gray-400 opacity-90";
              let title = "Waiting";
              if (isCurrent) { styleClass = "bg-green-100 border-green-500 text-green-700 ring-4 ring-green-500/20"; title = "In Progress"; }
              else if (isNext) { styleClass = "bg-blue-50 border-blue-400 text-blue-700 font-semibold"; title = "Next in Line"; }
              if (isMe) { styleClass = "bg-teal-600 border-teal-700 text-white shadow-xl transform -translate-y-2 scale-105 ring-4 ring-teal-600/30"; title = isCurrent ? "YOUR TURN!" : "YOU"; }

              return (
                <div key={apt.id} className={`flex-shrink-0 w-44 p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center snap-center ${styleClass}`}>
                  <span className="text-xs font-bold uppercase tracking-wider mb-2 opacity-80">{title}</span>
                  <span className="text-4xl font-black mb-1">#{apt.token}</span>
                  <span className={`text-xs font-medium ${isMe ? 'text-teal-100' : 'text-gray-500'} flex items-center gap-1.5`}>
                    {isCurrent ? (
                      <><Clock size={12} className="animate-pulse" /> <LiveClock /></>
                    ) : (
                      new Date(apt.projectedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    )}
                  </span>
                  {/* Append Live Countdown exclusively for the logged in user */}
                  {isMe && !isCurrent && <LiveCountdown projectedTime={apt.projectedTime} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Map & Sidebar Content */}
      {!selectedHospital ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Sidebar */}
          <div className="lg:col-span-1 flex flex-col h-full space-y-6">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 relative overflow-hidden">
               <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                    <MapPin className="text-teal-600" /> Location Tools
                  </h2>
               </div>
              <button 
                onClick={fetchMyLocation}
                className="flex items-center justify-center gap-2 w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-4 py-3 rounded-xl transition-colors active:scale-95"
              >
                <Navigation size={18} /> Focus My Location
              </button>
              <form onSubmit={handleSearch} className="flex gap-2 w-full">
                <div className="relative w-full">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Search size={16} />
                  </span>
                  <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={e=>setSearchQuery(e.target.value)} 
                    placeholder="Search a city manually..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all" 
                  />
                </div>
                <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-xl transition-colors shrink-0 active:scale-95">
                  Search
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden max-h-[600px]">
              <div className="p-5 border-b border-gray-50 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 flex items-center justify-between">
                   Hospital Directory
                   {fetchingHospitals && <span className="text-xs text-teal-600 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1"><Activity size={14}/> Live</span>}
                </h3>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-3">
                {!fetchingHospitals && hospitals.length === 0 && (
                  <div className="p-6 text-center text-gray-500 animate-in fade-in zoom-in-95">No hospitals found nearby.</div>
                )}
                {/* Dynamically fade over list items */}
                {hospitals.map((h, idx) => (
                   <div 
                     key={h.id}
                     onClick={() => handleFocusHospital(h)}
                     className="rounded-2xl border border-gray-100 hover:border-teal-300 hover:shadow-lg transition-all duration-300 cursor-pointer bg-white group overflow-hidden animate-in fade-in slide-in-from-bottom-2"
                     style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                   >
                      <div className="p-4 bg-teal-50/50 border-b border-gray-50 flex flex-col gap-1">
                         <div className="flex items-center gap-2">
                           <Building2 className="text-teal-600 shrink-0" size={18} />
                           <h4 className="font-bold text-gray-900 line-clamp-1">{h.name}</h4>
                         </div>
                      </div>
                      
                      <div className="p-4">
                        <p className="text-xs text-gray-500 line-clamp-2">{h.address}</p>
                        
                        <div className="mt-4 flex items-center justify-between">
                          <span className="bg-teal-50 text-teal-700 text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                            <span className="text-yellow-500">★</span> {h.rating}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedHospital(h); }}
                            className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg transition-colors active:scale-95"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                   </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Map Engine */}
          <div className="lg:col-span-2 h-[500px] lg:h-[750px] relative z-0 isolate animate-in zoom-in-95 duration-500">
            <div className="h-full w-full rounded-3xl overflow-hidden border-2 border-gray-200 shadow-md isolate relative z-0">
              <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                <UpdateMapCenter center={[mapCenter.lat, mapCenter.lng]} />
                
                {userLocation && (
                  <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                    <Popup><strong className="text-red-600">Your Location</strong></Popup>
                  </Marker>
                )}

                {hospitals.map(h => (
                  <Marker key={h.id} position={[h.lat, h.lng]} icon={hospitalIcon}>
                    <Popup>
                      <div className="text-center font-sans tracking-tight">
                        <strong className="block text-gray-900 leading-tight mb-0.5">{h.name}</strong>
                        <span className="block text-[10px] text-gray-500 mb-2 leading-none">{h.address}</span>
                        <button 
                          className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors w-full active:scale-95" 
                          onClick={() => setSelectedHospital(h)}
                        >
                          View Doctors
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 relative">
          <button 
            onClick={() => setSelectedHospital(null)}
            className="mb-8 bg-white border border-gray-200 hover:border-teal-300 text-teal-600 font-semibold flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl shadow-sm hover:shadow transition-all active:scale-95"
          >
            ← Back to Map Explorer
          </button>
          
          <div className="bg-white rounded-3xl shadow-lg mb-8 border border-gray-100 flex flex-col items-start justify-between overflow-hidden">
            <div className="p-8 w-full">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2 flex items-center gap-3">
                <Building2 className="text-teal-600" /> {selectedHospital.name}
              </h2>
              <p className="text-gray-500 flex items-center gap-2 ml-1"><MapPin size={16} className="text-teal-500" />{selectedHospital.address}</p>
            </div>
          </div>

          <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3">
            <Stethoscope className="text-teal-600" /> Available Doctors
          </h3>

          {loading ? (
            <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doc, idx) => (
                <div 
                  key={doc.id} 
                  className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between hover:border-teal-400 hover:shadow-lg transition-all duration-300 group animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex items-center gap-5 border-b border-gray-50 pb-5 mb-5 mt-2">
                    <img src={doc.avatar} alt={doc.name} className="w-16 h-16 rounded-full object-cover border-4 border-teal-50 shadow-sm group-hover:border-teal-100 transition-colors shrink-0" />
                    <div>
                      <h4 className="font-bold text-lg text-gray-900 leading-tight">{doc.name}</h4>
                      <p className="text-sm text-teal-600 font-semibold mt-0.5">{doc.specialization}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-6 text-sm text-gray-500 font-medium bg-gray-50 p-3 rounded-xl">
                    <Clock size={16} className="text-gray-400" />
                    {doc.availability || 'Available Now'}
                  </div>

                  <button 
                    onClick={() => setSelectedDoctor(doc)}
                    className="w-full bg-teal-50 text-teal-700 py-3 rounded-xl text-sm font-bold hover:bg-teal-600 hover:text-white transition-all transform hover:-translate-y-0.5 shadow-sm active:scale-95"
                  >
                    Book Appointment
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedDoctor(null)}
              className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2"
            >
              <X size={20} />
            </button>
            <div className="p-6 bg-teal-600 text-white flex items-center gap-4">
              <img src={selectedDoctor.avatar} className="w-14 h-14 rounded-full border-2 border-white/20 object-cover shadow-sm shrink-0" alt="Doctor" />
              <div>
                <h3 className="text-2xl font-bold mb-0.5">Book Session</h3>
                <p className="text-teal-100 text-sm font-medium">Consulting with {selectedDoctor.name}</p>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50">
              {bookingSuccess ? (
                <div className="py-12 flex flex-col items-center text-center animate-in zoom-in-50 duration-300">
                  <CheckCircle2 className="w-20 h-20 text-teal-500 mb-4 animate-bounce" />
                  <h4 className="text-2xl font-bold text-gray-900">Success!</h4>
                  <p className="text-gray-500 mt-2 font-medium">Generating your fast-track token...</p>
                </div>
              ) : (
                <form onSubmit={handleBook} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Visit Date</label>
                    <input 
                      required 
                      value={formData.appointmentDate} 
                      onChange={e => setFormData({...formData, appointmentDate: e.target.value})} 
                      type="date" 
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-shadow" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Patient Name</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-shadow" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Age</label>
                      <input required value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} type="number" className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-shadow" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Gender</label>
                      <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-shadow">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Reason for visit</label>
                    <textarea required value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} rows="2" className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-shadow resize-none"></textarea>
                  </div>
                  <button type="submit" className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl mt-6 hover:bg-teal-700 active:scale-[0.98] transition-all shadow-md flex justify-center items-center gap-2">
                    Confirm & Get Token
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Feedback Modal */}
      {feedbackAppointment && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 border border-teal-50">
            <div className="p-8 bg-teal-600 text-white text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/30">
                <CheckCircle2 size={40} className="text-white" />
              </div>
              <h3 className="text-3xl font-black mb-1 tracking-tight">Session Ended</h3>
              <p className="text-teal-100 font-medium opaity-90">How was your experience with Dr. {feedbackAppointment.doctorName}?</p>
            </div>
            
            <form onSubmit={handleFeedbackSubmit} className="p-8 space-y-6 bg-gray-50/50">
              <div className="text-center">
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Your Rating</label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-4xl transition-all transform hover:scale-110 active:scale-90 ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Write a short review</label>
                <textarea 
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us what you liked or how we can improve..."
                  rows="3" 
                  className="w-full px-5 py-4 border border-gray-200 bg-white rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all resize-none shadow-inner"
                ></textarea>
              </div>

              <button type="submit" className="w-full bg-teal-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-teal-600/20 hover:bg-teal-700 hover:-translate-y-0.5 active:scale-95 transition-all flex justify-center items-center gap-3">
                Submit Feedback
              </button>
              
              <button 
                type="button"
                onClick={() => setFeedbackAppointment(null)}
                className="w-full py-2 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors"
              >
                Skip for now
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
