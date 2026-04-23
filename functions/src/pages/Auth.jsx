import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Stethoscope, UserCircle2 } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('patient');
  
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '',
    specialization: '', hospitalName: '', qualification: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await signup(formData.email, formData.password, role, formData);
      }
      navigate('/'); // RootRedirect will handle routing to dashboard based on role
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
    setLoading(false);
  };

  return (
    <div className="flex h-[80vh] w-full max-w-6xl mx-auto bg-white rounded-[2rem] shadow-2xl overflow-hidden mt-6 animate-in zoom-in-95 duration-500">
      
      {/* LEFT SIDE: Animated Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-900 via-navy to-teal-800 p-12 flex-col justify-center relative overflow-hidden text-white">
        {/* Floating background elements */}
        <div className="absolute top-10 left-10 opacity-10 animate-bounce delay-100"><Stethoscope size={80}/></div>
        <div className="absolute bottom-20 right-10 opacity-10 animate-pulse"><Activity size={100}/></div>
        <div className="absolute top-1/2 right-20 opacity-10 animate-bounce delay-300"><UserCircle2 size={60}/></div>
        
        <div className="relative z-10">
          <h2 className="text-5xl font-serif font-bold mb-6 leading-tight">
            Queue Smarter, <br/><span className="text-teal-300">Care Better.</span>
          </h2>
          <p className="text-teal-50 text-lg mb-8 max-w-md opacity-90 leading-relaxed font-sans">
            Join thousands of patients and doctors experiencing healthcare without the wait exactly when you need it.
          </p>
          
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
            <h3 className="font-bold flex items-center gap-2 mb-2"><Activity className="text-teal-300"/> Real-time Sync</h3>
            <p className="text-sm opacity-80">Timeline updates securely via live channels.</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Auth Form */}
      <div className="w-full lg:w-1/2 p-8 sm:p-12 overflow-y-auto flex flex-col justify-center">
        <div className="w-full max-w-md mx-auto">
          
          {/* Header */}
          <div className="text-center mb-10">
            <Activity className="w-12 h-12 text-teal-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-navy">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-gray-500 mt-2">
              {isLogin ? 'Enter your details to access your dashboard.' : 'Sign up to modernize your healthcare access.'}
            </p>
          </div>

          {/* Toggle Pill for Login/Signup */}
          <div className="bg-gray-100 p-1 rounded-xl flex mb-8">
            <button 
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 font-bold rounded-lg transition-all ${isLogin ? 'bg-white shadow text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sign In
            </button>
            <button 
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 font-bold rounded-lg transition-all ${!isLogin ? 'bg-white shadow text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sign Up
            </button>
          </div>

          {/* Role Toggle for both Sign In / Sign Up */}
          <div className="flex gap-4 mb-6">
            <button 
              type="button"
              onClick={() => setRole('patient')}
              className={`flex-1 py-3 border-2 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${role === 'patient' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              <UserCircle2 size={18}/> Patient
            </button>
            <button 
              type="button"
              onClick={() => setRole('doctor')}
              className={`flex-1 py-3 border-2 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${role === 'doctor' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              <Stethoscope size={18}/> Doctor
            </button>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm text-center border border-red-100 font-medium">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Full Name</label>
                <input required={!isLogin} type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-shadow bg-gray-50 focus:bg-white" placeholder="John Doe" />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Email Address</label>
              <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-shadow bg-gray-50 focus:bg-white" placeholder="you@example.com" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Password</label>
              <input required type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-shadow bg-gray-50 focus:bg-white" placeholder="••••••••" />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Phone Number</label>
                <input required={!isLogin} type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-shadow bg-gray-50 focus:bg-white" placeholder="+1 (555) 000-0000" />
              </div>
            )}

            {!isLogin && role === 'doctor' && (
              <div className="grid grid-cols-1 gap-4 pt-2 border-t border-gray-100 mt-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Specialization</label>
                  <input required={role==='doctor'} type="text" name="specialization" value={formData.specialization} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-shadow bg-gray-50 focus:bg-white" placeholder="e.g. Cardiologist" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Hospital Name</label>
                  <input required={role==='doctor'} type="text" name="hospitalName" value={formData.hospitalName} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-shadow bg-gray-50 focus:bg-white" placeholder="City General Hospital" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Qualification</label>
                  <input required={role==='doctor'} type="text" name="qualification" value={formData.qualification} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-shadow bg-gray-50 focus:bg-white" placeholder="MBBS, MD" />
                </div>
              </div>
            )}

            <button 
              disabled={loading}
              type="submit" 
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-600/30 transition-all active:scale-[0.98] mt-6 disabled:bg-teal-400 disabled:shadow-none hover:-translate-y-0.5"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In to Dashboard' : 'Create Account')}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Auth;
