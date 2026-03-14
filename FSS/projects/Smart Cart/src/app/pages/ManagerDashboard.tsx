import { useState, useEffect } from 'react';
import { Package, User, LogOut, Filter, DollarSign, Send, Plus, X, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import Select from 'react-select';
import { ExportButtons } from '../components/ExportButtons';
import { ExportColumn } from '../utils/exportUtils';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  active?: boolean;
}

interface Assignment {
  customerId: string;
  managerId: string;
  assignedAt: string;
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

export default function ManagerDashboard() {
  const context = useOutletContext<{ user: any }>();
  const currentUser = context?.user;
  const navigate = useNavigate();
  const [assignedCustomers, setAssignedCustomers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderStatuses, setOrderStatuses] = useState<string[]>([]);
  
  // Filters
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  // Payment modal
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'zelle' | 'cash'>('stripe');
  
  // Custom status modal
  const [customStatusModalOrder, setCustomStatusModalOrder] = useState<Order | null>(null);
  const [customStatus, setCustomStatus] = useState('');
  const [newStatusName, setNewStatusName] = useState('');

  useEffect(() => {
    loadData();
    loadOrderStatuses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, filterCustomer, filterPaymentStatus, filterStatus, filterDateFrom, filterDateTo]);

  const loadOrderStatuses = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/order-statuses`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );
      const data = await response.json();
      setOrderStatuses(data.statuses || []);
    } catch (error) {
      console.error('Error loading order statuses:', error);
    }
  };

  const loadData = async () => {
    try {
      console.log('ManagerDashboard: Loading data...');
      console.log('Project ID:', projectId);
      console.log('Public Anon Key:', publicAnonKey ? 'Present' : 'Missing');
      
      // Fetch all users
      const usersRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/users`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );
      
      if (!usersRes.ok) {
        console.error('Failed to fetch users:', usersRes.status, usersRes.statusText);
        const errorText = await usersRes.text();
        console.error('Error response:', errorText);
        return;
      }
      
      const usersData = await usersRes.json();
      const allUsers = usersData.users || [];
      console.log('Users loaded:', allUsers.length);

      // Fetch assignments
      const assignRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/assignments`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );
      
      if (!assignRes.ok) {
        console.error('Failed to fetch assignments:', assignRes.status, assignRes.statusText);
        return;
      }
      
      const assignData = await assignRes.json();
      const allAssignments = assignData.assignments || [];
      console.log('Assignments loaded:', allAssignments.length);

      // Filter customers assigned to this manager
      const myAssignments = allAssignments.filter(
        (a: Assignment) => a.managerId === currentUser.id
      );
      const myCustomerIds = myAssignments.map((a: Assignment) => a.customerId);
      const myCustomers = allUsers.filter((u: User) => myCustomerIds.includes(u.id));
      setAssignedCustomers(myCustomers);
      console.log('My customers:', myCustomers.length);

      // Load orders from localStorage and filter by assigned customers
      const savedOrders = localStorage.getItem('orders');
      if (savedOrders) {
        const allOrders = JSON.parse(savedOrders);
        const myOrders = allOrders.filter((order: Order) =>
          myCustomerIds.includes(order.customerId)
        );
        setOrders(myOrders);
        console.log('My orders:', myOrders.length);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    if (filterCustomer !== 'all') {
      filtered = filtered.filter(o => o.customerId === filterCustomer);
    }

    if (filterPaymentStatus !== 'all') {
      filtered = filtered.filter(o => o.paymentStatus === filterPaymentStatus);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(o => o.status === filterStatus);
    }

    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      filtered = filtered.filter(o => new Date(o.createdAt) >= fromDate);
    }

    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59);
      filtered = filtered.filter(o => new Date(o.createdAt) <= toDate);
    }

    setFilteredOrders(filtered);
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: string) => {
    const updatedOrders = orders.map(order =>
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    setOrders(updatedOrders);

    // Update localStorage
    const allSavedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const updatedAllOrders = allSavedOrders.map((order: Order) =>
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    localStorage.setItem('orders', JSON.stringify(updatedAllOrders));
    toast.success('Order status updated');
  };

  const handleSendPaymentRequest = () => {
    if (!paymentModalOrder) return;

    const updatedOrders = orders.map(order =>
      order.id === paymentModalOrder.id 
        ? { 
            ...order, 
            paymentLink,
            paymentStatus: 'Pending Payment'
          } 
        : order
    );
    setOrders(updatedOrders);

    // Update localStorage
    const allSavedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const updatedAllOrders = allSavedOrders.map((order: Order) =>
      order.id === paymentModalOrder.id 
        ? { ...order, paymentLink, paymentStatus: 'Pending Payment' }
        : order
    );
    localStorage.setItem('orders', JSON.stringify(updatedAllOrders));

    toast.success('Payment request sent!');
    setPaymentModalOrder(null);
    setPaymentLink('');
  };

  const handleRecordPayment = () => {
    if (!paymentModalOrder) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    const newAmountPaid = paymentModalOrder.amountPaid + amount;
    const newPaymentStatus = newAmountPaid >= paymentModalOrder.total ? 'Paid' : 'Partial Payment';

    const updatedOrders = orders.map(order =>
      order.id === paymentModalOrder.id 
        ? { 
            ...order, 
            amountPaid: newAmountPaid,
            paymentStatus: newPaymentStatus,
            paymentMethod: paymentMethod
          } 
        : order
    );
    setOrders(updatedOrders);

    // Update localStorage
    const allSavedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const updatedAllOrders = allSavedOrders.map((order: Order) =>
      order.id === paymentModalOrder.id 
        ? { 
            ...order, 
            amountPaid: newAmountPaid,
            paymentStatus: newPaymentStatus,
            paymentMethod
          }
        : order
    );
    localStorage.setItem('orders', JSON.stringify(updatedAllOrders));

    toast.success(`Payment of $${amount.toFixed(2)} recorded`);
    setPaymentModalOrder(null);
    setPaymentAmount('');
  };

  const handleSetCustomStatus = async () => {
    if (!customStatusModalOrder) return;

    let statusToUse = customStatus;

    // If custom status is entered, add it to the list
    if (newStatusName.trim()) {
      const updatedStatuses = [...orderStatuses, newStatusName.trim()];
      setOrderStatuses(updatedStatuses);
      
      // Save to backend
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/order-statuses`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ statuses: updatedStatuses }),
          }
        );
      } catch (error) {
        console.error('Error saving status:', error);
      }

      statusToUse = newStatusName.trim();
    }

    if (!statusToUse) {
      toast.error('Please select or enter a status');
      return;
    }

    handleUpdateOrderStatus(customStatusModalOrder.id, statusToUse);
    setCustomStatusModalOrder(null);
    setCustomStatus('');
    setNewStatusName('');
  };

  const handleToggleCustomerStatus = async (customerId: string, currentActive: boolean) => {
    try {
      const newActive = !currentActive;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/update-user-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ userId: customerId, active: newActive }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        loadData(); // Reload to reflect changes
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update customer status');
      }
    } catch (error) {
      console.error('Error toggling customer status:', error);
      toast.error('An error occurred while updating customer status');
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Partial Payment':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Pending Payment':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!currentUser) {
    return <div className="min-h-screen flex items-center justify-center">Loading user...</div>;
  }

  const pendingOrders = orders.filter(o => o.status === 'Order placed by customer' || o.status === 'Pending Payment');
  const processingOrders = orders.filter(o => o.status === 'Processing' || o.status === 'Payment Received');

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
          itemTitle: item.title,
          itemUrl: item.url,
          itemPrice: item.price,
          orderStatus: order.status,
          paymentStatus: order.paymentStatus,
          amountPaid: order.amountPaid,
          orderTotal: order.total,
          balance: order.total - order.amountPaid,
          notes: order.notes || 'N/A'
        });
      });
    });
    
    return detailedData;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome, {currentUser.name}</p>
          </div>
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
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assigned Customers</p>
                <p className="text-3xl font-bold text-gray-900">{assignedCustomers.length}</p>
              </div>
              <User className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Orders</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingOrders.length}</p>
              </div>
              <Package className="w-10 h-10 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-3xl font-bold text-blue-600">{processingOrders.length}</p>
              </div>
              <Package className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-3xl font-bold text-purple-600">{orders.length}</p>
              </div>
              <Package className="w-10 h-10 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Assigned Customers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">My Customers ({assignedCustomers.length})</h2>
          </div>

          {assignedCustomers.length === 0 ? (
            <p className="text-gray-600">No customers assigned to you yet.</p>
          ) : (
            <div className="space-y-2">
              {assignedCustomers.map(customer => (
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
                        Total orders: {orders.filter(o => o.customerId === customer.id).length}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleCustomerStatus(customer.id, customer.active !== false)}
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Filter Orders</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <Select
                value={filterCustomer === 'all' ? { value: 'all', label: 'All Customers' } : assignedCustomers.find(c => c.id === filterCustomer) ? { value: filterCustomer, label: assignedCustomers.find(c => c.id === filterCustomer)!.name } : null}
                onChange={(option) => setFilterCustomer(option?.value || 'all')}
                options={[
                  { value: 'all', label: 'All Customers' },
                  ...assignedCustomers.map(customer => ({ value: customer.id, label: customer.name }))
                ]}
                className="text-sm"
                placeholder="Select customer..."
                isClearable
                isSearchable
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <Select
                value={filterPaymentStatus === 'all' ? { value: 'all', label: 'All Payment Status' } : { value: filterPaymentStatus, label: filterPaymentStatus }}
                onChange={(option) => setFilterPaymentStatus(option?.value || 'all')}
                options={[
                  { value: 'all', label: 'All Payment Status' },
                  { value: 'Unpaid', label: 'Unpaid' },
                  { value: 'Pending Payment', label: 'Pending Payment' },
                  { value: 'Partial Payment', label: 'Partial Payment' },
                  { value: 'Paid', label: 'Paid' }
                ]}
                className="text-sm"
                placeholder="Select payment status..."
                isClearable
                isSearchable
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
              <Select
                value={filterStatus === 'all' ? { value: 'all', label: 'All Statuses' } : { value: filterStatus, label: filterStatus }}
                onChange={(option) => setFilterStatus(option?.value || 'all')}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  ...orderStatuses.map(status => ({ value: status, label: status }))
                ]}
                className="text-sm"
                placeholder="Select order status..."
                isClearable
                isSearchable
              />
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
          </div>

          {(filterCustomer !== 'all' || filterPaymentStatus !== 'all' || filterStatus !== 'all' || filterDateFrom || filterDateTo) && (
            <button
              onClick={() => {
                setFilterCustomer('all');
                setFilterPaymentStatus('all');
                setFilterStatus('all');
                setFilterDateFrom('');
                setFilterDateTo('');
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold">
                Customer Orders ({filteredOrders.length})
              </h2>
            </div>
            {filteredOrders.length > 0 && (
              <ExportButtons 
                exportOptions={{
                  filename: 'manager-orders-detailed-report',
                  title: 'Manager Orders Detailed Report - All Items',
                  columns: [
                    { header: 'Order ID', accessor: (row: any) => `#${row.orderId.slice(0, 8)}`, width: 12 },
                    { header: 'Order Date', accessor: 'orderDate', width: 12 },
                    { header: 'Customer', accessor: 'customer', width: 20 },
                    { header: 'Item #', accessor: 'itemNumber', width: 8 },
                    { header: 'Item Title', accessor: 'itemTitle', width: 30 },
                    { header: 'Item URL', accessor: 'itemUrl', width: 40 },
                    { header: 'Item Price', accessor: (row: any) => `$${row.itemPrice}`, width: 12 },
                    { header: 'Order Status', accessor: 'orderStatus', width: 15 },
                    { header: 'Payment Status', accessor: 'paymentStatus', width: 15 },
                    { header: 'Amount Paid', accessor: (row: any) => `$${row.amountPaid.toFixed(2)}`, width: 12 },
                    { header: 'Order Total', accessor: (row: any) => `$${row.orderTotal.toFixed(2)}`, width: 12 },
                    { header: 'Balance', accessor: (row: any) => `$${row.balance.toFixed(2)}`, width: 12 },
                    { header: 'Notes', accessor: 'notes', width: 40 },
                  ],
                  data: getDetailedExportData(),
                }}
              />
            )}
          </div>

          {filteredOrders.length === 0 ? (
            <p className="text-gray-600">No orders match the current filters.</p>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-gray-900">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-600">Customer: {order.customerName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">${order.total.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-sm text-gray-600 flex justify-between">
                          <span>{item.name} (x{item.quantity})</span>
                          <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Status */}
                  <div className="mb-3 pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Payment Status:</p>
                        <span className={`px-3 py-1 border rounded-md text-sm font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                          {order.paymentStatus}
                        </span>
                        {order.amountPaid > 0 && (
                          <p className="text-xs text-gray-600 mt-1">
                            Paid: ${order.amountPaid.toFixed(2)} / ${order.total.toFixed(2)} 
                            {order.paymentMethod && ` (${order.paymentMethod})`}
                          </p>
                        )}
                        {order.paymentLink && (
                          <p className="text-xs text-blue-600 mt-1">
                            Payment link sent
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setPaymentModalOrder(order);
                            setPaymentLink(order.paymentLink || '');
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                        >
                          <Send className="w-3 h-3" />
                          Payment
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Order Notes - Read Only for Manager */}
                  {order.notes && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Order Notes</label>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
                    </div>
                  )}

                  {/* Order Status */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Order Status:</span>
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium"
                    >
                      {orderStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        setCustomStatusModalOrder(order);
                        setCustomStatus(order.status);
                      }}
                      className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                    >
                      <Plus className="w-3 h-3" />
                      Custom
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Payment Management</h3>
              <button
                onClick={() => setPaymentModalOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Order: #{paymentModalOrder.id.slice(0, 8)}</p>
                <p className="text-sm text-gray-600">Customer: {paymentModalOrder.customerName}</p>
                <p className="text-sm font-medium">Total: ${paymentModalOrder.total.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Paid: ${paymentModalOrder.amountPaid.toFixed(2)}</p>
                <p className="text-sm font-medium text-orange-600">
                  Balance: ${(paymentModalOrder.total - paymentModalOrder.amountPaid).toFixed(2)}
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Send Payment Request</h4>
                <input
                  type="text"
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                  placeholder="Enter Stripe/Zelle payment link"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3"
                />
                <button
                  onClick={handleSendPaymentRequest}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Send Payment Request
                </button>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Record Payment</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="stripe">Stripe</option>
                      <option value="zelle">Zelle</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <button
                    onClick={handleRecordPayment}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Record Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Status Modal */}
      {customStatusModalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Set Custom Order Status</h3>
              <button
                onClick={() => setCustomStatusModalOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Order: #{customStatusModalOrder.id.slice(0, 8)}</p>
                <p className="text-sm text-gray-600">Customer: {customStatusModalOrder.customerName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Existing Status
                </label>
                <select
                  value={customStatus}
                  onChange={(e) => {
                    setCustomStatus(e.target.value);
                    setNewStatusName('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Choose a status...</option>
                  {orderStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="text-center text-sm text-gray-500">- OR -</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Create New Custom Status
                </label>
                <input
                  type="text"
                  value={newStatusName}
                  onChange={(e) => {
                    setNewStatusName(e.target.value);
                    setCustomStatus('');
                  }}
                  placeholder="e.g., In Transit to JFK Airport"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can include specific details like airport names, cities, etc.
                </p>
              </div>

              <button
                onClick={handleSetCustomStatus}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Set Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}