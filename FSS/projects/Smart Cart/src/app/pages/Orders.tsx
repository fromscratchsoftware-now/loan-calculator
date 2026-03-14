import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router";
import { ShoppingCart, ExternalLink, Mail, MessageCircle, Edit2, X, CreditCard } from "lucide-react";
import { Tooltip } from "../components/Tooltip";
import { getStatusColor } from "../utils/orderStatuses";
import { PaymentModal } from "../components/PaymentModal";
import { ExportButtons } from "../components/ExportButtons";
import { ExportColumn } from "../utils/exportUtils";

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: Array<{
    id: string;
    name: string;
    url: string;
    price: number;
    imageUrl: string;
    quantity: number;
    store: string;
    notes?: string;
  }>;
  deliveryAddress: string;
  status: string;
  paymentStatus: string;
  amountPaid: number;
  paymentMethod: string | null;
  paymentLink: string | null;
  cashPaymentRequested?: boolean;
  cashPaymentApproved?: boolean;
  cashPaymentAmount?: number;
  editedByAdmin?: boolean;
  editNotification?: string;
  createdAt: string;
  total: number;
  notes?: string;
}

export function Orders() {
  const { user } = useOutletContext<{ user: any }>();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [serviceFee, setServiceFee] = useState(5.00);
  const [serviceFeeTooltip, setServiceFeeTooltip] = useState("This fee covers our personal shopping service.");
  const [whatsappNumber, setWhatsappNumber] = useState("+1234567890");
  const [businessEmail, setBusinessEmail] = useState("support@smartcart.com");
  const [paymentOptions, setPaymentOptions] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    // Load admin config
    const config = localStorage.getItem("adminConfig");
    if (config) {
      const parsed = JSON.parse(config);
      setServiceFee(parsed.serviceFee || 5.00);
      setServiceFeeTooltip(parsed.serviceFeeTooltip || "This fee covers our personal shopping service.");
      setWhatsappNumber(parsed.whatsappNumber || "+1234567890");
      setBusinessEmail(parsed.businessEmail || "support@smartcart.com");
      setPaymentOptions(parsed.paymentOptions || null);
    }
  }, []);

  useEffect(() => {
    // Load orders from shared 'orders' key
    const saved = localStorage.getItem("orders");
    if (saved) {
      const allOrders = JSON.parse(saved);
      // Filter orders by current user if they're a customer
      if (user?.role === 'customer') {
        const userOrders = allOrders.filter((order: Order) => order.customerId === user.id);
        setOrders(userOrders);
      } else {
        // Admin sees all orders
        setOrders(allOrders);
      }
    }
  }, [user]);

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

  const handleCancelOrder = (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      const saved = localStorage.getItem("orders");
      if (saved) {
        const allOrders = JSON.parse(saved);
        const updatedOrders = allOrders.map((order: Order) => {
          if (order.id === orderId) {
            return { ...order, status: 'Cancelled' };
          }
          return order;
        });
        localStorage.setItem("orders", JSON.stringify(updatedOrders));
        
        // Update local state
        if (user?.role === 'customer') {
          const userOrders = updatedOrders.filter((order: Order) => order.customerId === user.id);
          setOrders(userOrders);
        } else {
          setOrders(updatedOrders);
        }
      }
    }
  };

  const handleEditOrder = (orderId: string) => {
    // Save order ID to localStorage and navigate to cart
    const saved = localStorage.getItem("orders");
    if (saved) {
      const allOrders = JSON.parse(saved);
      const orderToEdit = allOrders.find((order: Order) => order.id === orderId);
      
      if (orderToEdit) {
        // Load the order items into the cart
        localStorage.setItem("cart", JSON.stringify(orderToEdit.items));
        localStorage.setItem("deliveryAddress", orderToEdit.deliveryAddress);
        localStorage.setItem("editingOrderId", orderId);
        
        // Navigate to cart
        navigate("/cart");
      }
    }
  };

  // Check if order can be edited/cancelled (unpaid orders only)
  const canModifyOrder = (order: Order) => {
    return order.paymentStatus !== 'Paid' && order.status !== 'Cancelled';
  };

  const handlePayment = (order: Order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  // Prepare detailed export data with all items
  const getDetailedExportData = () => {
    const detailedData: any[] = [];
    
    orders.forEach(order => {
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

  // Prepare export data
  const exportColumns: ExportColumn[] = [
    { header: 'Order ID', accessor: (row) => `#${row.orderId.slice(0, 8)}`, width: 12 },
    { header: 'Date', accessor: 'orderDate', width: 12 },
    { header: 'Customer', accessor: 'customer', width: 20 },
    { header: 'Item #', accessor: 'itemNumber', width: 8 },
    { header: 'Item Title', accessor: 'itemTitle', width: 30 },
    { header: 'Item URL', accessor: 'itemUrl', width: 30 },
    { header: 'Item Price', accessor: (row) => `$${row.itemPrice.toFixed(2)}`, width: 12 },
    { header: 'Item Notes', accessor: 'itemNotes', width: 25 },
    { header: 'Order Status', accessor: 'orderStatus', width: 18 },
    { header: 'Payment Status', accessor: 'paymentStatus', width: 18 },
    { header: 'Amount Paid', accessor: (row) => `$${row.amountPaid.toFixed(2)}`, width: 12 },
    { header: 'Order Total', accessor: (row) => `$${row.orderTotal.toFixed(2)}`, width: 12 },
    { header: 'Balance', accessor: (row) => `$${row.balance.toFixed(2)}`, width: 12 },
    { header: 'Admin Notes', accessor: 'adminNotes', width: 25 },
  ];

  const exportOptions = {
    filename: user?.role === 'admin' ? 'all-orders-detailed' : 'my-orders-detailed',
    title: user?.role === 'admin' ? 'All Orders - Detailed Report' : 'My Orders - Detailed Report',
    columns: exportColumns,
    data: getDetailedExportData(),
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl text-gray-900">
          {user?.role === 'admin' ? 'All Orders' : 'Your Orders'}
        </h1>
        {orders.length > 0 && (
          <ExportButtons exportOptions={exportOptions} />
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="size-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl text-gray-600 mb-2">No orders yet</h2>
          <p className="text-gray-500">
            Your submitted orders will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              {/* Combined Items Notification */}
              {order.editNotification && order.editNotification.includes('Items added on') && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                  <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-900">Order Updated</p>
                    <p className="text-xs text-green-700 mt-1">{order.editNotification}</p>
                    <p className="text-xs text-green-600 mt-1">
                      New items have been added to this order. All unpaid orders are automatically combined.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Order Header */}
              <div className="flex justify-between items-start mb-4 pb-4 border-b">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order #{order.id.slice(0, 8)}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                  </p>
                  {user?.role === 'admin' && (
                    <p className="text-sm text-gray-600">
                      Customer: {order.customerName}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4 text-sm text-gray-600">
                      <span>Items:</span>
                      <span>${(order.total - serviceFee).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4 items-center text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        Service Fee
                        <Tooltip content={serviceFeeTooltip} />
                      </span>
                      <span>${serviceFee.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-1 mt-1">
                      <p className="text-xs text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-gray-900">${order.total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Order Status</p>
                  <span className={`inline-block px-4 py-2 border rounded-md text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Payment Status</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block px-4 py-2 border rounded-md text-sm font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                      {order.paymentStatus}
                    </span>
                    {user?.role === 'customer' && order.paymentStatus !== 'Paid' && (
                      <button
                        onClick={() => handlePayment(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Make Payment
                      </button>
                    )}
                    {order.amountPaid > 0 && (
                      <p className="text-xs text-gray-600 w-full mt-2">
                        Paid: ${order.amountPaid.toFixed(2)} / ${order.total.toFixed(2)}
                        {order.paymentMethod && ` (${order.paymentMethod})`}
                      </p>
                    )}
                    {order.paymentLink && user?.role === 'customer' && (
                      <a
                        href={order.paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2 w-full"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Pay Now
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Notes - Customer View (Read Only) */}
              {order.notes && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Order Notes</label>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}

              {/* Order Items */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Items</p>
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.store}</p>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Product
                          </a>
                        )}
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                          <p className="text-sm font-medium text-gray-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        {item.notes && (
                          <p className="text-sm text-gray-500 mt-1">Notes: {item.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address */}
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-1">Delivery Address</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.deliveryAddress}</p>
              </div>

              {/* Payment Info for Unpaid Orders */}
              {user?.role === 'customer' && order.paymentStatus !== 'Paid' && paymentOptions && (
                <div className="mt-4 space-y-3">
                  {/* Payment Options */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-gray-900 mb-4">
                      <strong>Payment Required:</strong> Complete payment using one of the following methods
                      {order.amountPaid > 0 && ` (Remaining balance: $${(order.total - order.amountPaid).toFixed(2)})`}
                    </p>

                    <div className="space-y-3">
                      {/* Stripe Link */}
                      {paymentOptions.stripeLink?.enabled && order.paymentLink && (
                        <div className="p-3 bg-white border border-blue-200 rounded-lg">
                          <p className="text-xs font-medium text-gray-700 mb-2">Stripe Payment Link</p>
                          <a
                            href={order.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Pay with Stripe
                          </a>
                        </div>
                      )}

                      {/* Cash */}
                      {paymentOptions.cash?.enabled && (
                        <div className="p-3 bg-white border border-green-200 rounded-lg">
                          <p className="text-xs font-medium text-gray-700 mb-1">💵 Cash</p>
                          <p className="text-xs text-gray-600">{paymentOptions.cash.instructions}</p>
                        </div>
                      )}

                      {/* Zelle */}
                      {paymentOptions.zelle?.enabled && (
                        <div className="p-3 bg-white border border-purple-200 rounded-lg">
                          <p className="text-xs font-medium text-gray-700 mb-2">💳 Zelle</p>
                          <div className="space-y-1 text-xs text-gray-600">
                            <p><strong>Email:</strong> {paymentOptions.zelle.email}</p>
                            <p><strong>Phone:</strong> {paymentOptions.zelle.phone}</p>
                            <p className="text-xs text-gray-500 mt-2">Send payment to either email or phone number above</p>
                          </div>
                        </div>
                      )}

                      {/* Cards */}
                      {paymentOptions.cards?.enabled && (
                        <div className="p-3 bg-white border border-blue-200 rounded-lg">
                          <p className="text-xs font-medium text-gray-700 mb-1">💳 Credit/Debit Cards</p>
                          <p className="text-xs text-gray-600">{paymentOptions.cards.instructions}</p>
                        </div>
                      )}

                      {/* Mobile Money */}
                      {paymentOptions.mobileMoney?.enabled && (
                        <div className="p-3 bg-white border border-orange-200 rounded-lg">
                          <p className="text-xs font-medium text-gray-700 mb-2">📱 Mobile Money ({paymentOptions.mobileMoney.provider})</p>
                          <div className="space-y-1 text-xs text-gray-600">
                            <p><strong>Number:</strong> {paymentOptions.mobileMoney.number}</p>
                            <p className="text-xs text-gray-500 mt-2">{paymentOptions.mobileMoney.instructions}</p>
                          </div>
                        </div>
                      )}

                      {/* Bank Transfer */}
                      {paymentOptions.bankTransfer?.enabled && (
                        <div className="p-3 bg-white border border-gray-300 rounded-lg">
                          <p className="text-xs font-medium text-gray-700 mb-2">🏦 Bank Transfer</p>
                          <div className="space-y-1 text-xs text-gray-600">
                            <p><strong>Bank:</strong> {paymentOptions.bankTransfer.bankName}</p>
                            <p><strong>Account Name:</strong> {paymentOptions.bankTransfer.accountName}</p>
                            <p><strong>Account Number:</strong> {paymentOptions.bankTransfer.accountNumber}</p>
                            <p><strong>Routing Number:</strong> {paymentOptions.bankTransfer.routingNumber}</p>
                            {paymentOptions.bankTransfer.swiftCode && (
                              <p><strong>SWIFT Code:</strong> {paymentOptions.bankTransfer.swiftCode}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">{paymentOptions.bankTransfer.instructions}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Contact Options */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm font-medium text-gray-900 mb-3">Need Help? Contact Our Team</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <a
                        href={`mailto:${businessEmail}?subject=Order%20%23${order.id.slice(0, 8)}%20-%20Payment%20Inquiry&body=Hi,%0D%0A%0D%0AI%20have%20a%20question%20about%20my%20order%20%23${order.id.slice(0, 8)}.%0D%0A%0D%0AOrder%20Total:%20$${order.total.toFixed(2)}%0D%0A`}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        Email Us
                      </a>
                      <a
                        href={`https://wa.me/${whatsappNumber}?text=Hi,%20I%20have%20a%20question%20about%20Order%20%23${order.id.slice(0, 8)}%20(Total:%20$${order.total.toFixed(2)})`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 border border-green-700 rounded-lg text-sm font-medium text-white hover:bg-green-700 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp Chat
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit/Cancel Buttons */}
              {canModifyOrder(order) && (
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={() => handleEditOrder(order.id)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 border border-blue-700 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Order
                  </button>
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 border border-red-700 rounded-lg text-sm font-medium text-white hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel Order
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showPaymentModal && selectedOrder && (
        <PaymentModal
          isOpen={showPaymentModal}
          order={selectedOrder}
          paymentOptions={paymentOptions}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}