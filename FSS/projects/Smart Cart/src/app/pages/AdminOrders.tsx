import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Package, DollarSign, Send, Plus, X, Trash2, Save, LogOut, Settings, ExternalLink } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import Select from 'react-select';
import { getOrderStatuses, getStatusColor } from '../utils/orderStatuses';
import { ExportButtons } from '../components/ExportButtons';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  active?: boolean;
  phone?: string;
}

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: any[];
  total: number;
  status: string;
  paymentStatus: string;
  amountPaid: number;
  paymentMethod: string | null;
  paymentLink: string | null;
  createdAt: string;
  notes?: string;
}

export default function AdminOrders() {
  const context = useOutletContext<{ user: any }>();
  const currentUser = context?.user;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const navigate = useNavigate();
  
  // Orders management state
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<string[]>([]);
  
  // Filters
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  
  // Payment modal
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'zelle' | 'cash'>('stripe');
  
  // Custom status modal
  const [customStatusModalOrder, setCustomStatusModalOrder] = useState<Order | null>(null);
  const [customStatus, setCustomStatus] = useState('');
  
  // Notes editing
  const [editingNotesOrderId, setEditingNotesOrderId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  useEffect(() => {
    console.log('AdminOrders: useEffect triggered');
    console.log('AdminOrders: currentUser from context:', currentUser);
    console.log('AdminOrders: currentUser role:', currentUser?.role);
    console.log('AdminOrders: localStorage user:', localStorage.getItem('user'));
    
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
      console.log('User is not admin (role:', userToCheck.role, '), redirecting to home');
      navigate('/');
      return;
    }
    console.log('Admin access granted, loading data...');
    loadData();
    loadOrderStatuses();
  }, [currentUser, navigate]);
  
  useEffect(() => {
    applyFilters();
  }, [orders, filterCustomer, filterPaymentStatus, filterStatus, filterDateFrom, filterDateTo, searchOrderNumber]);

  const loadData = async () => {
    try {
      setLoading(true);
      const demo = localStorage.getItem('demoMode') === 'true';
      setDemoMode(demo);
      
      if (demo) {
        // Load demo data
        const demoUsers = JSON.parse(localStorage.getItem('demo_users') || '[]');
        setUsers(demoUsers.map(({ password, ...user }: any) => user));
        
        const storedOrders = localStorage.getItem('orders');
        if (storedOrders) {
          const parsedOrders = JSON.parse(storedOrders);
          setOrders(parsedOrders);
        }
      } else {
        // Try to load from backend
        try {
          const healthCheck = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/health`,
            {
              headers: { Authorization: `Bearer ${publicAnonKey}` },
              signal: AbortSignal.timeout(3000),
            }
          );
          
          if (!healthCheck.ok) {
            // Fallback to demo data
            const demoUsers = JSON.parse(localStorage.getItem('demo_users') || '[]');
            setUsers(demoUsers.map(({ password, ...user }: any) => user));
          } else {
            // Load users from backend
            const usersRes = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/users`,
              { headers: { Authorization: `Bearer ${publicAnonKey}` } }
            );
            
            if (usersRes.ok) {
              const usersData = await usersRes.json();
              setUsers(usersData.users || []);
            }
          }
        } catch (healthError) {
          // Fallback to demo data
          const demoUsers = JSON.parse(localStorage.getItem('demo_users') || '[]');
          setUsers(demoUsers.map(({ password, ...user }: any) => user));
        }
        
        // Load orders
        const storedOrders = localStorage.getItem('orders');
        if (storedOrders) {
          const parsedOrders = JSON.parse(storedOrders);
          setOrders(parsedOrders);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadOrderStatuses = async () => {
    const customStatuses = getOrderStatuses();
    setOrderStatuses(customStatuses.map(s => s.name));
  };

  const applyFilters = () => {
    let filtered = orders;
    
    if (filterCustomer !== 'all') {
      filtered = filtered.filter(order => order.customerId === filterCustomer);
    }
    
    if (filterPaymentStatus !== 'all') {
      filtered = filtered.filter(order => order.paymentStatus === filterPaymentStatus);
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }
    
    if (filterDateFrom) {
      filtered = filtered.filter(order => new Date(order.createdAt) >= new Date(filterDateFrom));
    }
    
    if (filterDateTo) {
      const endDate = new Date(filterDateTo);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => new Date(order.createdAt) <= endDate);
    }
    
    if (searchOrderNumber) {
      filtered = filtered.filter(order => order.id.includes(searchOrderNumber));
    }
    
    setFilteredOrders(filtered);
  };

  const handleSendPaymentRequest = (order: Order) => {
    setPaymentModalOrder(order);
    const balance = order.total - (order.amountPaid || 0);
    setPaymentAmount(balance.toFixed(2));
    setPaymentLink('');
  };

  const handleRecordPayment = (orderId: string, amount: number, method: string) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        const newAmountPaid = (order.amountPaid || 0) + amount;
        const newPaymentStatus = newAmountPaid >= order.total ? 'paid' : 'partial';
        return {
          ...order,
          amountPaid: newAmountPaid,
          paymentStatus: newPaymentStatus,
          paymentMethod: method
        };
      }
      return order;
    });
    
    setOrders(updatedOrders);
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
    toast.success(`Payment of $${amount} recorded`);
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: string) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return { ...order, status: newStatus };
      }
      return order;
    });
    
    setOrders(updatedOrders);
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
    setCustomStatusModalOrder(null);
    setCustomStatus('');
    toast.success('Order status updated');
  };

  const handleStartEditingNotes = (orderId: string, currentNotes: string) => {
    setEditingNotesOrderId(orderId);
    setNotesText(currentNotes || '');
  };

  const handleSaveNotes = (orderId: string) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return { ...order, notes: notesText };
      }
      return order;
    });
    
    setOrders(updatedOrders);
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
    setEditingNotesOrderId(null);
    setNotesText('');
    toast.success('Notes saved');
  };

  const handleCancelEditingNotes = () => {
    setEditingNotesOrderId(null);
    setNotesText('');
  };

  const customers = users.filter(u => u.role === 'customer');

  const customerOptions = [
    { value: 'all', label: 'All Customers' },
    ...customers.map(c => ({ value: c.id, label: c.name }))
  ];

  // Prepare detailed export data with all items
  const getDetailedExportData = () => {
    const detailedData: any[] = [];
    
    filteredOrders.forEach(order => {
      order.items.forEach((item, index) => {
        detailedData.push({
          orderId: order.id,
          orderDate: new Date(order.createdAt).toLocaleDateString(),
          customer: order.customerName,
          itemNumber: index + 1,
          itemTitle: item.name,
          itemUrl: item.url,
          itemPrice: item.price,
          itemNotes: item.notes || 'N/A',
          orderStatus: order.status,
          paymentStatus: order.paymentStatus,
          amountPaid: order.amountPaid,
          orderTotal: order.total,
          balance: order.total - order.amountPaid,
          adminNotes: order.notes || 'N/A'
        });
      });
    });
    
    return detailedData;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <span className="font-medium">Demo Mode Active</span>
              <span className="hidden sm:inline text-blue-100">- No backend calls are being made</span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('demoMode');
                setDemoMode(false);
                toast.success('Demo mode disabled');
              }}
              className="px-3 py-1 bg-white text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              Disable Demo Mode
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <header className="mb-6">
          <div className="bg-white rounded-lg shadow px-6 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
                <p className="text-gray-600 mt-1">View and manage all customer orders</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </button>
                <button
                  onClick={() => navigate('/admin/settings')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4" />
                  Settings
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
          </div>
        </header>

        <div className="space-y-6">
          {/* Order Management Section */}
          <div className="bg-white rounded-lg shadow p-6" id="order-management-section">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold">All Orders</h2>
                <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
                </span>
              </div>
              {filteredOrders.length > 0 && (
                <ExportButtons 
                  exportOptions={{
                    filename: 'admin-orders-detailed-report',
                    title: 'Orders Detailed Report - All Items',
                    columns: [
                      { header: 'Order ID', accessor: (row: any) => `#${row.orderId.substring(0, 8)}`, width: 12 },
                      { header: 'Order Date', accessor: 'orderDate', width: 12 },
                      { header: 'Customer', accessor: 'customer', width: 20 },
                      { header: 'Item #', accessor: 'itemNumber', width: 8 },
                      { header: 'Item Title', accessor: 'itemTitle', width: 30 },
                      { header: 'Item URL', accessor: 'itemUrl', width: 40 },
                      { header: 'Item Price', accessor: (row: any) => `$${row.itemPrice}`, width: 12 },
                      { header: 'Item Notes', accessor: 'itemNotes', width: 40 },
                      { header: 'Order Status', accessor: 'orderStatus', width: 15 },
                      { header: 'Payment Status', accessor: 'paymentStatus', width: 15 },
                      { header: 'Amount Paid', accessor: (row: any) => `$${row.amountPaid.toFixed(2)}`, width: 12 },
                      { header: 'Order Total', accessor: (row: any) => `$${row.orderTotal.toFixed(2)}`, width: 12 },
                      { header: 'Balance', accessor: (row: any) => `$${row.balance.toFixed(2)}`, width: 12 },
                      { header: 'Admin Notes', accessor: 'adminNotes', width: 40 },
                    ],
                    data: getDetailedExportData(),
                  }}
                />
              )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <Select
                  options={customerOptions}
                  value={customerOptions.find(opt => opt.value === filterCustomer)}
                  onChange={(option) => setFilterCustomer(option?.value || 'all')}
                  className="text-sm"
                  placeholder="All Customers"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select
                  value={filterPaymentStatus}
                  onChange={(e) => setFilterPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All</option>
                  {orderStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
                <input
                  type="text"
                  value={searchOrderNumber}
                  onChange={(e) => setSearchOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Search by order number"
                />
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No orders found</p>
                  <p className="text-sm text-gray-500 mt-1">Orders from all customers will appear here</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {/* Order Header with Gradient */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">
                          Order #{order.id.substring(0, 8)}
                        </h3>
                        <span className="text-blue-100 text-sm font-medium">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-white">
                    {/* Customer & Status Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <p className="text-sm text-gray-600">Customer</p>
                        <p className="font-medium text-gray-900">{order.customerName}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          order.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Items ({order.items.length})</h4>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <a 
                                  href={item.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-base leading-tight hover:underline"
                                  title={item.name}
                                >
                                  {(() => {
                                    const words = item.name.split(' ');
                                    if (words.length > 15) {
                                      return words.slice(0, 15).join(' ') + '...';
                                    }
                                    return item.name;
                                  })()}
                                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                </a>
                                {item.notes && (
                                  <div className="mt-2 px-3 py-2 bg-orange-100 border border-orange-300 rounded text-sm">
                                    <span className="font-semibold text-orange-900">Notes:</span>{' '}
                                    <span className="text-orange-800">{item.notes}</span>
                                  </div>
                                )}
                              </div>
                              <p className="font-bold text-gray-900 text-lg ml-4">${item.price}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Items Subtotal</p>
                            <p className="font-medium text-gray-900">
                              ${order.items.reduce((sum, item) => sum + parseFloat(item.price), 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Service Fee</p>
                            <p className="font-medium text-gray-900">
                              ${(() => {
                                const config = JSON.parse(localStorage.getItem('adminConfig') || '{}');
                                const serviceFee = config.serviceFee || 5.00;
                                return serviceFee.toFixed(2);
                              })()}
                            </p>
                          </div>
                        </div>
                        <div className="border-t border-gray-300 pt-2 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 font-medium">Total</p>
                            <p className="font-bold text-gray-900 text-lg">
                              ${(() => {
                                const itemsTotal = order.items.reduce((sum, item) => sum + parseFloat(item.price), 0);
                                const config = JSON.parse(localStorage.getItem('adminConfig') || '{}');
                                const serviceFee = config.serviceFee || 5.00;
                                return (itemsTotal + serviceFee).toFixed(2);
                              })()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium">Paid</p>
                            <p className="font-bold text-green-600 text-lg">${(order.amountPaid || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium">Balance</p>
                            <p className="font-bold text-red-600 text-lg">
                              ${(() => {
                                const itemsTotal = order.items.reduce((sum, item) => sum + parseFloat(item.price), 0);
                                const config = JSON.parse(localStorage.getItem('adminConfig') || '{}');
                                const serviceFee = config.serviceFee || 5.00;
                                const total = itemsTotal + serviceFee;
                                return (total - (order.amountPaid || 0)).toFixed(2);
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">Admin Notes</h4>
                      </div>
                      {editingNotesOrderId === order.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[80px]"
                            placeholder="Add notes for this order..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveNotes(order.id)}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEditingNotes}
                              className="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 min-h-[60px] mb-2">
                            {order.notes || 'No admin notes yet'}
                          </div>
                          <button
                            onClick={() => handleStartEditingNotes(order.id, order.notes || '')}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                          >
                            Edit Notes
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap pt-3 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setCustomStatusModalOrder(order);
                          setCustomStatus(order.status);
                        }}
                        className="px-4 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
                      >
                        Change Status
                      </button>
                      {order.paymentStatus !== 'paid' && (
                        <>
                          <button
                            onClick={() => handleSendPaymentRequest(order)}
                            className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            Payment Request
                          </button>
                          <button
                            onClick={() => {
                              const amount = prompt(`Record payment amount (Max: $${(order.total - (order.amountPaid || 0)).toFixed(2)}):`);
                              if (amount && !isNaN(parseFloat(amount))) {
                                const method = prompt('Payment method (stripe/zelle/cash):') || 'cash';
                                handleRecordPayment(order.id, parseFloat(amount), method);
                              }
                            }}
                            className="px-4 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center gap-1"
                          >
                            <DollarSign className="w-3 h-3" />
                            Record Payment
                          </button>
                        </>
                      )}
                    </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Request Modal */}
      {paymentModalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Send Payment Request</h3>
              <button 
                onClick={() => setPaymentModalOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'zelle' | 'cash')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="stripe">Stripe</option>
                  <option value="zelle">Zelle</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Link (Optional)</label>
                <input
                  type="text"
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://..."
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    // In a real app, this would send an email/notification
                    toast.success('Payment request sent');
                    setPaymentModalOrder(null);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Send Request
                </button>
                <button
                  onClick={() => setPaymentModalOrder(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom Status Modal */}
      {customStatusModalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Change Order Status</h3>
              <button 
                onClick={() => setCustomStatusModalOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Status</label>
                <div className="space-y-2">
                  {orderStatuses.map(status => (
                    <label 
                      key={status}
                      className={`flex items-center p-3 border-2 rounded-md cursor-pointer transition-colors ${
                        customStatus === status 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={status}
                        checked={customStatus === status}
                        onChange={(e) => setCustomStatus(e.target.value)}
                        className="mr-3"
                      />
                      <span className="font-medium">{status}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => handleUpdateOrderStatus(customStatusModalOrder.id, customStatus)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  disabled={!customStatus}
                >
                  Update Status
                </button>
                <button
                  onClick={() => {
                    setCustomStatusModalOrder(null);
                    setCustomStatus('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}