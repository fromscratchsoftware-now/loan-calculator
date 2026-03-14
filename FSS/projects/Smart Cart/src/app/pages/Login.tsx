import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { projectId, publicAnonKey } from "@/utils/supabase/info";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const navigate = useNavigate();

  // Check server health on component mount
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        console.log('Checking server health...');
        console.log('Project ID:', projectId);
        console.log('Server URL:', `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/health`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/health`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
            },
            signal: controller.signal,
          }
        );
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Server health check successful:', data);
          setServerStatus('online');
          // Server is online, initialize seed data
          await initSeedData();
        } else {
          console.error('Server health check failed:', response.status, response.statusText);
          setServerStatus('offline');
          console.warn('Server is offline - using local demo mode');
          initializeDemoData();
          setInitializing(false);
        }
      } catch (err) {
        console.error('Server health check error:', err);
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            console.error('Health check timed out - using local demo mode');
          } else {
            console.error('Error details:', err.message);
          }
        }
        setServerStatus('offline');
        console.warn('Cannot connect to server - using local demo mode');
        initializeDemoData();
        setInitializing(false);
      }
    };

    checkServerHealth();
  }, []);

  // Initialize demo data in localStorage when server is offline
  const initializeDemoData = () => {
    console.log('Initializing demo data in localStorage...');
    
    const demoUsers = [
      {
        id: "admin-001",
        email: "admin@smartcart.com",
        password: "admin123",
        role: "admin",
        name: "Admin User",
        verified: true,
      },
      {
        id: "manager-001",
        email: "manager1@smartcart.com",
        password: "manager123",
        role: "manager",
        name: "Sarah Johnson",
        verified: true,
      },
      {
        id: "manager-002",
        email: "manager2@smartcart.com",
        password: "manager123",
        role: "manager",
        name: "Michael Chen",
        verified: true,
      },
      {
        id: "customer-001",
        email: "customer1@example.com",
        password: "customer123",
        role: "customer",
        name: "Alice Williams",
        verified: true,
      },
      {
        id: "customer-002",
        email: "customer2@example.com",
        password: "customer123",
        role: "customer",
        name: "Bob Martinez",
        verified: true,
      },
      {
        id: "customer-003",
        email: "customer3@example.com",
        password: "customer123",
        role: "customer",
        name: "Charlie Davis",
        verified: true,
      },
    ];
    
    // Only initialize if not already present
    if (!localStorage.getItem('demo_users')) {
      localStorage.setItem('demo_users', JSON.stringify(demoUsers));
      console.log('Demo users initialized in localStorage');
    }
    
    // Initialize demo assignments
    if (!localStorage.getItem('demo_assignments')) {
      const demoAssignments = [
        { customerId: "customer-001", managerId: "manager-001" },
        { customerId: "customer-002", managerId: "manager-001" },
        { customerId: "customer-003", managerId: "manager-002" },
      ];
      localStorage.setItem('demo_assignments', JSON.stringify(demoAssignments));
    }
    
    // Initialize demo settings
    if (!localStorage.getItem('demo_settings')) {
      const demoSettings = {
        autoAssignEnabled: false,
        autoAssignManagerIds: [],
      };
      localStorage.setItem('demo_settings', JSON.stringify(demoSettings));
    }
    
    console.log('Demo mode initialized successfully');
  };

  // Initialize seed data
  const initSeedData = async () => {
    try {
      console.log('Initializing seed data...');
      console.log('URL:', `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/init-seed-data`);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/init-seed-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Seed data initialized:', data.message);
      } else {
        console.error('Seed data init failed with status:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (err) {
      console.error('Error initializing seed data:', err);
      console.error('Error details:', err instanceof Error ? err.message : String(err));
    } finally {
      setInitializing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    setLoading(true);

    try {
      // Use demo mode if server is offline
      if (serverStatus === 'offline') {
        console.log('Using demo mode login for:', email);
        
        const demoUsers = JSON.parse(localStorage.getItem('demo_users') || '[]');
        const user = demoUsers.find((u: any) => u.email === email && u.password === password);
        
        if (!user) {
          setError('Invalid email or password');
          setLoading(false);
          return;
        }
        
        console.log('Demo login successful for user:', user.email, 'Role:', user.role);
        
        // Store user in localStorage (without password)
        const { password: _, ...userWithoutPassword } = user;
        localStorage.setItem('user', JSON.stringify(userWithoutPassword));
        
        console.log('User stored in localStorage:', JSON.stringify(userWithoutPassword));
        console.log('Verifying localStorage user:', localStorage.getItem('user'));
        
        // Redirect based on role
        if (user.role === 'admin') {
          console.log('Redirecting to admin dashboard');
          navigate('/admin');
        } else if (user.role === 'manager') {
          console.log('Redirecting to manager dashboard');
          navigate('/manager');
        } else {
          console.log('Redirecting to home');
          navigate('/');
        }
        
        // Force a full reload to ensure navigation state is updated
        setTimeout(() => {
          window.location.reload();
        }, 100);
        return;
      }
      
      // Server mode login
      console.log('Attempting login for:', email);
      console.log('Login URL:', `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/login`);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, password }),
        }
      );

      console.log('Login response status:', response.status);

      if (!response.ok) {
        const data = await response.json();
        console.error('Login failed:', data);
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Login successful for user:', data.user?.email, 'Role:', data.user?.role);

      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect based on role
      if (data.user.role === 'admin') {
        console.log('Redirecting to admin dashboard');
        navigate('/admin');
      } else if (data.user.role === 'manager') {
        console.log('Redirecting to manager dashboard');
        navigate('/manager');
      } else {
        console.log('Redirecting to home');
        navigate('/');
      }
      
      // Force a full reload to ensure navigation state is updated
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`An error occurred during login: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
    // Auto-submit the form
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-center text-blue-600 mb-2">SmartCart</h1>
          <h2 className="text-2xl font-semibold text-center text-gray-900">Personal Shopping Assistant</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Sign in to your account</p>
          
          {/* Server Status Indicator */}
          <div className="mt-4 text-center">
            {serverStatus === 'checking' && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                Checking server status...
              </div>
            )}
            {serverStatus === 'online' && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Server online - Live backend
              </div>
            )}
            {serverStatus === 'offline' && (
              <div className="space-y-3">
                <div className="inline-flex flex-col items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">Demo Mode Active</span>
                  </div>
                  <span className="text-xs">Backend server offline - Using local storage</span>
                </div>
                
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-left">
                  <h4 className="text-sm font-semibold text-amber-900 mb-2">📋 To Enable Live Backend:</h4>
                  <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
                    <li>Open your Supabase project dashboard</li>
                    <li>Navigate to Edge Functions section</li>
                    <li>Deploy the <code className="bg-amber-100 px-1 rounded">make-server-23b9846d</code> function</li>
                    <li>The app will automatically connect when ready</li>
                  </ol>
                  <p className="text-xs text-amber-700 mt-2 italic">
                    💡 Demo mode works fully offline with all features!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {initializing && serverStatus === 'checking' && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
              Initializing application...
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email address"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Login - Click to use:</h3>
          <div className="space-y-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@smartcart.com', 'admin123')}
              className="w-full bg-white p-3 rounded border border-blue-200 hover:bg-blue-50 hover:border-blue-400 transition-colors text-left"
            >
              <strong className="text-blue-600">Admin:</strong> admin@smartcart.com
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('manager1@smartcart.com', 'manager123')}
              className="w-full bg-white p-3 rounded border border-green-200 hover:bg-green-50 hover:border-green-400 transition-colors text-left"
            >
              <strong className="text-green-600">Manager 1 (Sarah):</strong> manager1@smartcart.com
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('manager2@smartcart.com', 'manager123')}
              className="w-full bg-white p-3 rounded border border-green-200 hover:bg-green-50 hover:border-green-400 transition-colors text-left"
            >
              <strong className="text-green-600">Manager 2 (Michael):</strong> manager2@smartcart.com
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('customer1@example.com', 'customer123')}
              className="w-full bg-white p-3 rounded border border-purple-200 hover:bg-purple-50 hover:border-purple-400 transition-colors text-left"
            >
              <strong className="text-purple-600">Customer 1 (Alice):</strong> customer1@example.com
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('customer2@example.com', 'customer123')}
              className="w-full bg-white p-3 rounded border border-purple-200 hover:bg-purple-50 hover:border-purple-400 transition-colors text-left"
            >
              <strong className="text-purple-600">Customer 2 (Bob):</strong> customer2@example.com
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('customer3@example.com', 'customer123')}
              className="w-full bg-white p-3 rounded border border-purple-200 hover:bg-purple-50 hover:border-purple-400 transition-colors text-left"
            >
              <strong className="text-purple-600">Customer 3 (Charlie):</strong> customer3@example.com
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}