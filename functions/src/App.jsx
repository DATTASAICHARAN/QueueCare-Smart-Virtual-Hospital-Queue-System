import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './pages/Auth';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRole && userRole && userRole !== allowedRole) {
    return <Navigate to={`/${userRole}-dashboard`} replace />;
  }

  return children;
};

const RootRedirect = () => {
  const { currentUser, userRole, logout } = useAuth();
  
  if (!currentUser) return <Navigate to="/auth" replace />;
  if (userRole === 'patient') return <Navigate to="/patient-dashboard" replace />;
  if (userRole === 'doctor') return <Navigate to="/doctor-dashboard" replace />;
  
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl shadow-sm border border-gray-100 max-w-lg mx-auto mt-20">
      <div className="w-16 h-16 bg-red-50 rounded-full flex justify-center items-center mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Invalid</h2>
      <p className="text-gray-500 mb-6">Your account role could not be verified. This can happen if the local database state was cleared while logged in.</p>
      <button 
        onClick={async () => {
          await logout();
        }}
        className="px-6 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition"
      >
        Sign Out & Go to Login
      </button>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/auth" element={<Auth />} />
              
              <Route 
                path="/patient-dashboard" 
                element={
                  <ProtectedRoute allowedRole="patient">
                    <PatientDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/doctor-dashboard" 
                element={
                  <ProtectedRoute allowedRole="doctor">
                    <DoctorDashboard />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
