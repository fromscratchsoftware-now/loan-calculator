import { useState, useEffect } from 'react';
import { Users, UserCog, Search, LogOut, Settings, ShoppingCart, CheckCircle, XCircle, FileText } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  active?: boolean;
  phone?: string;
}

interface Assignment {
  customerId: string;
  managerId: string;
  assignedAt: string;
}

interface SystemSettings {
  autoAssignEnabled: boolean;
  autoAssignManagerIds: string[];
}

export default function AdminDashboard() {
  const context = useOutletContext<{ user: any }>();
  const currentUser = context?.user;
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ autoAssignEnabled: false, autoAssignManagerIds: [] });
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    console.log('AdminDashboard: useEffect triggered');
    
    let userToCheck = currentUser;
    if (!userToCheck) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          userToCheck = JSON.parse(storedUser);
        } catch (e) {
          console.error('Error parsing stored user:', e);
        }
      }
    }
    
    if (!userToCheck) {
      console.log('No user found, redirecting to login');
      navigate('/login');
      return;
    }
    if (userToCheck.role !== 'admin') {
      console.log('User is not admin, redirecting to home');
      navigate('/');
      return;
    }
    console.log('Admin access granted, loading data...');
    loadData();
  }, [currentUser, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const demo = localStorage.getItem('demoMode') === 'true';
      setDemoMode(demo);
      
      if (demo) {
        loadDemoData();
        return;
      }

      try {
        const healthCheck = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/health`,
          {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
            signal: AbortSignal.timeout(3000),
          }
        );
        
        if (!healthCheck.ok) {
          loadDemoData();
          return;
        }
      } catch (healthError) {
        loadDemoData();
        return;
      }
      
      const usersRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/users`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      
      if (!usersRes.ok) {
        loadDemoData();
        return;
      }
      
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);

      const assignRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/assignments`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      
      if (assignRes.ok) {
        const assignData = await assignRes.json();
        setAssignments(assignData.assignments || []);
      }

      const settingsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/settings`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.settings || { autoAssignEnabled: false, autoAssignManagerIds: [] });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    setDemoMode(true);
    const demoUsers = JSON.parse(localStorage.getItem('demo_users') || '[]');
    setUsers(demoUsers.map(({ password, ...user }: any) => user));
    const demoAssignments = JSON.parse(localStorage.getItem('demo_assignments') || '[]');
    setAssignments(demoAssignments);
    const demoSettings = JSON.parse(localStorage.getItem('demo_settings') || '{"autoAssignEnabled":false,"autoAssignManagerIds":[]}');
    setSettings(demoSettings);
  };

  const handleAssignCustomer = async () => {
    if (!selectedCustomer || !selectedManager) {
      alert('Please select both a customer and a manager');
      return;
    }

    try {
      if (demoMode) {
        const demoAssignments = JSON.parse(localStorage.getItem('demo_assignments') || '[]');
        const existingIndex = demoAssignments.findIndex((a: any) => a.customerId === selectedCustomer);
        
        const newAssignment = {
          customerId: selectedCustomer,
          managerId: selectedManager,
          assignedAt: new Date().toISOString(),
        };
        
        if (existingIndex >= 0) {
          demoAssignments[existingIndex] = newAssignment;
        } else {
          demoAssignments.push(newAssignment);
        }
        
        localStorage.setItem('demo_assignments', JSON.stringify(demoAssignments));
        alert('Customer assigned successfully!');
        setSelectedCustomer('');
        setSelectedManager('');
        loadDemoData();
        return;
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/assign-customer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            customerId: selectedCustomer,
            managerId: selectedManager,
          }),
        }
      );

      if (response.ok) {
        alert('Customer assigned successfully!');
        setSelectedCustomer('');
        setSelectedManager('');
        loadData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to assign customer');
      }
    } catch (error) {
      console.error('Error assigning customer:', error);
      alert('An error occurred');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      if (demoMode) {
        localStorage.setItem('demo_settings', JSON.stringify(settings));
        alert('Settings updated successfully!');
        return;
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/settings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(settings),
        }
      );

      if (response.ok) {
        alert('Settings updated successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('An error occurred');
    }
  };

  const customers = users.filter(u => u.role === 'customer');
  const managers = users.filter(u => u.role === 'manager');

  const filterUsersBySearch = (userList: User[]) => {
    if (!searchQuery.trim()) return userList;
    const query = searchQuery.toLowerCase();
    return userList.filter(u => 
      u.name.toLowerCase().includes(query) || 
      u.email.toLowerCase().includes(query) ||
      u.phone?.toLowerCase().includes(query)
    );
  };

  const filteredManagers = filterUsersBySearch(managers);
  const filteredCustomers = filterUsersBySearch(customers);

  const getAssignmentForCustomer = (customerId: string) => {
    const assignment = assignments.find(a => a.customerId === customerId);
    if (!assignment) return 'Unassigned';
    const manager = managers.find(m => m.id === assignment.managerId);
    return manager ? manager.name : 'Unknown Manager';
  };

  const getManagerCustomerCount = (managerId: string) => {
    return assignments.filter(a => a.managerId === managerId).length;
  };

  const toggleManagerSelection = (managerId: string) => {
    const currentIds = settings.autoAssignManagerIds || [];
    if (currentIds.includes(managerId)) {
      setSettings({ 
        ...settings, 
        autoAssignManagerIds: currentIds.filter(id => id !== managerId) 
      });
    } else {
      setSettings({ 
        ...settings, 
        autoAssignManagerIds: [...currentIds, managerId] 
      });
    }
  };
  
  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      if (demoMode) {
        const demoUsers = JSON.parse(localStorage.getItem('demo_users') || '[]');
        const updatedUsers = demoUsers.map((u: any) => 
          u.id === userId ? { ...u, role: newRole } : u
        );
        localStorage.setItem('demo_users', JSON.stringify(updatedUsers));
        toast.success(`User role updated to ${newRole}`);
        loadDemoData();
        return;
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/update-user-role`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ userId, newRole }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('An error occurred while updating user role');
    }
  };
  
  const handleToggleUserStatus = async (userId: string, currentActive: boolean) => {
    try {
      const newActive = !currentActive;
      
      if (demoMode) {
        const demoUsers = JSON.parse(localStorage.getItem('demo_users') || '[]');
        const updatedUsers = demoUsers.map((u: any) => 
          u.id === userId ? { ...u, active: newActive } : u
        );
        localStorage.setItem('demo_users', JSON.stringify(updatedUsers));
        toast.success(`Account ${newActive ? 'activated' : 'deactivated'}`);
        loadDemoData();
        return;
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/update-user-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ userId, active: newActive }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('An error occurred while updating user status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {demoMode && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <span className="font-semibold">Demo Mode Active</span>
              <span className="text-blue-100 text-sm">All data is stored locally in your browser</span>
            </div>
            <div className="text-sm bg-blue-700 px-3 py-1 rounded">
              Deploy the Edge Function to enable live backend
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome, {currentUser?.name || 'Admin'}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin/orders')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <ShoppingCart className="w-4 h-4" />
                View Orders
              </button>
              <button
                onClick={() => navigate('/admin/settings')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={() => navigate('/admin/catalog')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <ShoppingCart className="w-4 h-4" />
                Catalog
              </button>
              <button
                onClick={() => navigate('/admin/pages')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                <FileText className="w-4 h-4" />
                Pages
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('user');
                  navigate('/login');
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          {/* System Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold">System Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                <div>
                  <h3 className="font-medium text-gray-900">Auto-Assign New Customers</h3>
                  <p className="text-sm text-gray-600">Automatically assign new customers to selected managers with even distribution</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoAssignEnabled}
                    onChange={(e) => setSettings({ ...settings, autoAssignEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {settings.autoAssignEnabled && (
                <div className="p-4 bg-gray-50 rounded-md">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Automatically assign new customers to any of the following managers
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    New customers will be assigned equally. If one manager has 10 customers and another has 5, the next 5 will go to the manager with 5.
                  </p>
                  
                  <div className="space-y-2">
                    {managers.map(manager => {
                      const isSelected = (settings.autoAssignManagerIds || []).includes(manager.id);
                      const customerCount = getManagerCustomerCount(manager.id);
                      
                      return (
                        <label 
                          key={manager.id}
                          className={`flex items-center justify-between p-3 border-2 rounded-md cursor-pointer transition-colors ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleManagerSelection(manager.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div>
                              <p className="font-medium text-gray-900">{manager.name}</p>
                              <p className="text-xs text-gray-500">{manager.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-700">{customerCount} customers</p>
                            <p className="text-xs text-gray-500">currently assigned</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  
                  {(settings.autoAssignManagerIds || []).length === 0 && (
                    <p className="mt-3 text-sm text-orange-600">
                      ⚠️ Please select at least one manager to enable auto-assignment
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleUpdateSettings}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Settings
              </button>
            </div>
          </div>

          {/* Assign Customer to Manager */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Assign Customer to Manager</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Choose a customer...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Manager
                </label>
                <select
                  value={selectedManager}
                  onChange={(e) => setSelectedManager(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Choose a manager...</option>
                  {managers.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleAssignCustomer}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Assign Customer
            </button>
          </div>

          {/* Users List */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold">All Users</h2>
            </div>

            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              {searchQuery && (
                <p className="text-xs text-gray-600 mt-2">
                  Found {users.filter(u => {
                    const query = searchQuery.toLowerCase();
                    return u.name.toLowerCase().includes(query) || 
                           u.email.toLowerCase().includes(query) ||
                           (u as any).phone?.toLowerCase().includes(query);
                  }).length} user(s) matching "{searchQuery}"
                </p>
              )}
            </div>

            <div className="space-y-4">
              {/* Managers */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Managers ({filteredManagers.length})</h3>
                <div className="space-y-2">
                  {filteredManagers.map(manager => (
                    <div key={manager.id} className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{manager.name}</p>
                            {manager.active === false && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                Deactivated
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{manager.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Managing: <span className="font-medium">{getManagerCustomerCount(manager.id)} customers</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                            Manager
                          </span>
                          <button
                            onClick={() => handleToggleUserStatus(manager.id, manager.active !== false)}
                            className={`px-3 py-1 text-white text-xs font-medium rounded hover:opacity-90 transition-opacity ${
                              manager.active === false ? 'bg-green-600' : 'bg-red-600'
                            }`}
                          >
                            {manager.active === false ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Activate
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Deactivate
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Demote ${manager.name} to Customer role?\n\nNote: All customer assignments for this manager will remain intact.`)) {
                                handleUpdateUserRole(manager.id, 'customer');
                              }
                            }}
                            className="px-3 py-1 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-colors"
                          >
                            Demote to Customer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customers */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Customers ({filteredCustomers.length})</h3>
                <div className="space-y-2">
                  {filteredCustomers.map(customer => (
                    <div key={customer.id} className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{customer.name}</p>
                            {customer.active === false && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                Deactivated
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{customer.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Assigned to: <span className="font-medium">{getAssignmentForCustomer(customer.id)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
                            Customer
                          </span>
                          <button
                            onClick={() => handleToggleUserStatus(customer.id, customer.active !== false)}
                            className={`px-3 py-1 text-white text-xs font-medium rounded hover:opacity-90 transition-opacity ${
                              customer.active === false ? 'bg-green-600' : 'bg-red-600'
                            }`}
                          >
                            {customer.active === false ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Activate
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Deactivate
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Promote ${customer.name} to Manager role?`)) {
                                handleUpdateUserRole(customer.id, 'manager');
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                          >
                            Promote to Manager
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
