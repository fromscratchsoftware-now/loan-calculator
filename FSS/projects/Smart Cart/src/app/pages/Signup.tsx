import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { UserPlus, Mail, Phone, CheckCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

export default function Signup() {
  const [step, setStep] = useState<'signup' | 'verify'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'phone'>('email');
  const [verificationCode, setVerificationCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate phone number (basic validation)
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    if (!phoneRegex.test(phone)) {
      setError('Please enter a valid phone number');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, phone, password, name }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Signup failed');
        setLoading(false);
        return;
      }

      toast.success('Account created! Please verify your contact information.');
      setStep('verify');
      
      // Automatically send verification code
      handleSendVerification();
    } catch (err) {
      console.error('Signup error:', err);
      setError('An error occurred during signup');
      setLoading(false);
    }
  };

  const handleSendVerification = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/send-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email,
            phone,
            method: verificationMethod,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send verification code');
        setLoading(false);
        return;
      }

      // For demo purposes, show the code
      if (data.demoCode) {
        setDemoCode(data.demoCode);
        toast.success(`Verification code sent to your ${verificationMethod}! Demo code: ${data.demoCode}`);
      } else {
        toast.success(`Verification code sent to your ${verificationMethod}!`);
      }
    } catch (err) {
      console.error('Send verification error:', err);
      setError('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/verify-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email,
            phone,
            code: verificationCode,
            method: verificationMethod,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verification failed');
        setLoading(false);
        return;
      }

      toast.success('Verification successful! You can now log in.');
      navigate('/login');
    } catch (err) {
      console.error('Verification error:', err);
      setError('An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8">
        {/* Logo/Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-full mb-3 sm:mb-4">
            <UserPlus className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Create Account</h1>
          <p className="text-sm sm:text-base text-gray-600">
            {step === 'signup'
              ? 'Join SmartCart Personal Shopping Assistant'
              : 'Verify your contact information'}
          </p>
        </div>

        {/* Signup Form */}
        {step === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4 sm:space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder="+1 (555) 123-4567"
              />
              <p className="text-xs text-gray-500 mt-1">Include country code if outside US</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder="Minimum 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Verification Form */}
        {step === 'verify' && (
          <div className="space-y-4 sm:space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                Account created! Please verify your contact information to complete registration.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationMethod('email');
                    setVerificationCode('');
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 transition-colors text-sm sm:text-base ${
                    verificationMethod === 'email'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerificationMethod('phone');
                    setVerificationCode('');
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 transition-colors text-sm sm:text-base ${
                    verificationMethod === 'phone'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  SMS
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendVerification}
              disabled={loading}
              className="w-full py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
            >
              {loading ? 'Sending...' : `Send Code to ${verificationMethod === 'email' ? email : phone}`}
            </button>

            {demoCode && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  Demo Code: <span className="text-lg font-bold">{demoCode}</span>
                </p>
                <p className="text-xs text-green-600 mt-1">
                  (In production, this would be sent via {verificationMethod})
                </p>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Enter Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-xl sm:text-2xl font-bold tracking-wider"
                  placeholder="000000"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">Enter the 6-digit code</p>
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full py-2.5 sm:py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
              >
                {loading ? 'Verifying...' : 'Verify & Complete'}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
