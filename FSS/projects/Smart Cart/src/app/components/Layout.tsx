import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router';
import { ShoppingCart, LogOut, User, Package, LayoutDashboard, Settings, Mail, MessageCircle } from 'lucide-react';
import { PWAInstallBanner } from './PWAInstallBanner';

export function Layout() {
  const [user, setUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);
  const [config, setConfig] = useState<any>({
    showEmail: true,
    businessEmail: 'support@smartcart.com',
    showWhatsapp: true,
    whatsappNumber: '+1234567890'
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Load user from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    const updateCartCount = () => {
      const savedCart = localStorage.getItem('smartcart_items');
      if (savedCart) {
        try {
          const items = JSON.parse(savedCart);
          setCartCount(items.length);
        } catch (e) {
          setCartCount(0);
        }
      } else {
        setCartCount(0);
      }
    };

    const loadConfig = () => {
      const savedConfig = localStorage.getItem('adminConfig');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    };

    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    
    loadConfig();
    window.addEventListener('configUpdated', loadConfig);
    
    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
      window.removeEventListener('configUpdated', loadConfig);
    };
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  // Check if we're on auth pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/logout';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      {!isAuthPage && (
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2">
                <ShoppingCart className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">SmartCart</span>
              </Link>
              
              <Link to="/catalog" className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold transition-all ml-4 mr-auto border border-blue-200 shadow-sm">
                Catalog
              </Link>

              {/* Navigation Links */}
              <div className="flex items-center gap-4">
                {/* Contact Links */}
                <div className="hidden md:flex items-center gap-4 mr-2">
                  {config?.showEmail && config?.businessEmail && (
                    <a
                      href={`mailto:${config.businessEmail}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                      title="Email Us"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Email Us</span>
                    </a>
                  )}
                  {config?.showWhatsapp && config?.whatsappNumber && (
                    <a
                      href={`https://wa.me/${config.whatsappNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 transition-colors bg-green-50 px-3 py-1.5 rounded-full border border-green-200"
                      title="WhatsApp Us"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="font-medium">WhatsApp</span>
                    </a>
                  )}
                </div>
                {/* Cart - Available to everyone (no login required) */}
                {(!user || user?.role === 'customer') && (
                  <Link
                    to="/cart"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors relative"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span className="hidden sm:inline">Cart</span>
                    {cartCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 font-semibold">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                )}
                
                {user?.role === 'customer' && (
                  <Link
                    to="/orders"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <Package className="w-5 h-5" />
                    <span className="hidden sm:inline">Orders</span>
                  </Link>
                )}

                {user?.role === 'manager' && (
                  <Link
                    to="/manager"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-green-600 transition-colors"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                )}

                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-purple-600 transition-colors"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}

                {user ? (
                  <div className="flex items-center gap-3 ml-2 pl-4 border-l border-gray-200">
                    <div className="hidden sm:block text-right">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-red-600 transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="hidden sm:inline text-sm">Logout</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/login"
                      className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Page Content */}
      <main>
        <Outlet context={{ user }} />
      </main>
      
      {/* PWA Banner */}
      <PWAInstallBanner />
    </div>
  );
}