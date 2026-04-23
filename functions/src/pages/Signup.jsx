import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

const Signup = () => {
  const [role, setRole] = useState('patient');
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', specialization: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const extraData = { name: formData.name };
      if (role === 'patient') extraData.phone = formData.phone;
      if (role === 'doctor') extraData.specialization = formData.specialization;
      
      await signup(formData.email, formData.password, role, extraData);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to create an account');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-3xl shadow-xl flex flex-col items-center">
      <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mb-6 text-teal-600">
        <Activity size={32} />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
      <p className="text-gray-500 mb-8 text-center">Join CureQ as a patient to book appointments, or as a doctor to manage your queue.</p>
      
      {error && <div className="w-full bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm text-center border border-red-100">{error}</div>}
      
      {/* Role Toggle */}
      <div className="flex p-1 bg-gray-100 rounded-xl mb-8 w-full max-w-sm">
        <button 
          className={`flex-1 py-2 rounded-lg font-medium transition-all ${role === 'patient' ? 'bg-white shadow text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setRole('patient')}
        >
          Patient
        </button>
        <button 
          className={`flex-1 py-2 rounded-lg font-medium transition-all ${role === 'doctor' ? 'bg-white shadow text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setRole('doctor')}
        >
          Doctor
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="John Doe" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input type="password" name="password" required value={formData.password} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="••••••••" />
        </div>
        
        {role === 'patient' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="+1 (555) 000-0000" />
          </div>
        )}
        
        {role === 'doctor' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
            <input type="text" name="specialization" required value={formData.specialization} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Cardiologist, Neurologist, etc." />
          </div>
        )}

        <button disabled={loading} type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl shadow-md transition-all active:scale-[0.98] mt-4 disabled:bg-teal-400">
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      
      <p className="mt-8 text-sm text-gray-600">
        Already have an account? <Link to="/login" className="text-teal-600 font-semibold hover:underline">Sign in here</Link>
      </p>
    </div>
  );
};

export default Signup;
