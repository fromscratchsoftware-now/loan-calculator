import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear user from localStorage
    localStorage.removeItem('user');
    
    // Redirect to login page
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Logging out...</p>
    </div>
  );
}
