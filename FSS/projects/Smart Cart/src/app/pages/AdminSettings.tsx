import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router";
import { Save, Settings, Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface OrderStatus {
  id: string;
  name: string;
  color: 'gray' | 'yellow' | 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'indigo';
}

interface AdminConfig {
  serviceFee: number;
  serviceFeeTooltip: string;
  whatsappNumber: string;
  showWhatsapp: boolean;
  businessEmail: string;
  showEmail: boolean;
  orderStatuses: OrderStatus[];
  paymentOptions: {
    paypal: {
      enabled: boolean;
      username: string;
    };
    cash: {
      enabled: boolean;
      instructions: string;
    };
    zelle: {
      enabled: boolean;
      email: string;
      phone: string;
    };
    stripeLink: {
      enabled: boolean;
      // Link will be set per-order by admin/manager
    };
    cards: {
      enabled: boolean;
      instructions: string;
    };
    mobileMoney: {
      enabled: boolean;
      provider: string;
      number: string;
      instructions: string;
    };
    bankTransfer: {
      enabled: boolean;
      bankName: string;
      accountName: string;
      accountNumber: string;
      routingNumber: string;
      swiftCode: string;
      instructions: string;
    };
  };
}

const DEFAULT_CONFIG: AdminConfig = {
  serviceFee: 5.00,
  serviceFeeTooltip: "This fee covers our personal shopping service, including product verification, secure purchasing, and delivery coordination.",
  whatsappNumber: "+1234567890",
  showWhatsapp: true,
  businessEmail: "support@smartcart.com",
  showEmail: true,
  orderStatuses: [
    { id: '1', name: 'Order placed by customer', color: 'yellow' },
    { id: '2', name: 'Processing', color: 'blue' },
    { id: '3', name: 'Packed', color: 'indigo' },
    { id: '4', name: 'Shipped', color: 'purple' },
    { id: '5', name: 'Out for Delivery', color: 'orange' },
    { id: '6', name: 'Delivered', color: 'green' },
    { id: '7', name: 'Cancelled', color: 'red' },
  ],
  paymentOptions: {
    paypal: {
      enabled: false,
      username: "your_paypal_username"
    },
    cash: {
      enabled: true,
      instructions: "Pay cash on delivery. Our delivery team will collect payment when your order arrives."
    },
    zelle: {
      enabled: true,
      email: "payments@smartcart.com",
      phone: "+1234567890"
    },
    stripeLink: {
      enabled: true
    },
    cards: {
      enabled: false,
      instructions: "We accept Visa, MasterCard, and American Express. Contact us to process your payment."
    },
    mobileMoney: {
      enabled: false,
      provider: "M-Pesa",
      number: "+254700000000",
      instructions: "Send payment to the number above and share the confirmation code."
    },
    bankTransfer: {
      enabled: false,
      bankName: "Example Bank",
      accountName: "SmartCart Inc",
      accountNumber: "1234567890",
      routingNumber: "021000021",
      swiftCode: "EXAMPLEXXX",
      instructions: "Use your Order ID as the payment reference."
    }
  }
};

export function AdminSettings() {
  const { user } = useOutletContext<{ user: any }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<AdminConfig>(DEFAULT_CONFIG);

  // Check if user is admin
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      toast.error("Access denied. Admin or Manager access required.");
      navigate("/");
      return;
    }

    // Load saved config
    const saved = localStorage.getItem("adminConfig");
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  }, [user, navigate]);

  const handleSave = () => {
    // Validate inputs
    if (config.serviceFee < 0) {
      toast.error("Service fee cannot be negative");
      return;
    }

    if (!config.serviceFeeTooltip.trim()) {
      toast.error("Service fee tooltip cannot be empty");
      return;
    }

    if (!config.whatsappNumber.trim()) {
      toast.error("WhatsApp number cannot be empty");
      return;
    }

    if (!config.businessEmail.trim()) {
      toast.error("Business email cannot be empty");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(config.businessEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Save to localStorage
    localStorage.setItem("adminConfig", JSON.stringify(config));
    window.dispatchEvent(new Event('configUpdated'));
    toast.success("Settings saved successfully!");
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to default values?")) {
      setConfig(DEFAULT_CONFIG);
      localStorage.setItem("adminConfig", JSON.stringify(DEFAULT_CONFIG));
      window.dispatchEvent(new Event('configUpdated'));
      toast.success("Settings reset to defaults");
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-indigo-600" />
        <h1 className="text-3xl text-gray-900">Admin Settings</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Service Fee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Service Fee (USD)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={config.serviceFee}
            onChange={(e) => setConfig({ ...config, serviceFee: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="5.00"
          />
          <p className="text-xs text-gray-500 mt-1">
            This fee will be added to all orders
          </p>
        </div>

        {/* Service Fee Tooltip */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Service Fee Tooltip
          </label>
          <textarea
            value={config.serviceFeeTooltip}
            onChange={(e) => setConfig({ ...config, serviceFeeTooltip: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Explain what the service fee covers..."
          />
          <p className="text-xs text-gray-500 mt-1">
            This message will be shown when customers hover over the service fee
          </p>
        </div>

        {/* WhatsApp Number */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="showWhatsapp"
              checked={config.showWhatsapp ?? true}
              onChange={(e) => setConfig({ ...config, showWhatsapp: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="showWhatsapp" className="text-sm font-medium text-gray-900">
              Show WhatsApp Contact in Header
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp Business Number
            </label>
            <input
              type="text"
              value={config.whatsappNumber}
              onChange={(e) => setConfig({ ...config, whatsappNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="+1234567890"
            />
            <p className="text-xs text-gray-500 mt-1">
              Include country code (e.g., +1 for US). This will be used for WhatsApp contact links.
            </p>
          </div>
        </div>

        {/* Business Email */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="showEmail"
              checked={config.showEmail ?? true}
              onChange={(e) => setConfig({ ...config, showEmail: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="showEmail" className="text-sm font-medium text-gray-900">
              Show Email Contact in Header
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Email
            </label>
            <input
              type="email"
              value={config.businessEmail}
              onChange={(e) => setConfig({ ...config, businessEmail: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="support@smartcart.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              This email will be used for customer contact links
            </p>
          </div>
        </div>

        {/* Order Statuses */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Order Statuses</h3>
          <p className="text-sm text-gray-600 mb-6">Configure order statuses and their colors</p>

          <div className="space-y-6">
            {config.orderStatuses.map((status, index) => (
              <div key={status.id} className="p-4 border border-gray-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={status.name}
                    onChange={(e) => {
                      const newStatuses = [...config.orderStatuses];
                      newStatuses[index].name = e.target.value;
                      setConfig({ ...config, orderStatuses: newStatuses });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Status name..."
                  />
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={status.color}
                    onChange={(e) => {
                      const newStatuses = [...config.orderStatuses];
                      newStatuses[index].color = e.target.value as 'gray' | 'yellow' | 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'indigo';
                      setConfig({ ...config, orderStatuses: newStatuses });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="gray">Gray</option>
                    <option value="yellow">Yellow</option>
                    <option value="blue">Blue</option>
                    <option value="purple">Purple</option>
                    <option value="green">Green</option>
                    <option value="red">Red</option>
                    <option value="orange">Orange</option>
                    <option value="indigo">Indigo</option>
                  </select>
                  <button
                    onClick={() => {
                      const newStatuses = [...config.orderStatuses];
                      newStatuses.splice(index, 1);
                      setConfig({ ...config, orderStatuses: newStatuses });
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                const newStatuses = [...config.orderStatuses];
                newStatuses.push({ id: (newStatuses.length + 1).toString(), name: 'New Status', color: 'gray' });
                setConfig({ ...config, orderStatuses: newStatuses });
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Status
            </button>
          </div>
        </div>

        {/* Payment Options */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Options</h3>
          <p className="text-sm text-gray-600 mb-6">Configure available payment methods for customers</p>

          <div className="space-y-6">
            {/* PayPal */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={config.paymentOptions.paypal.enabled}
                  onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, paypal: { ...config.paymentOptions.paypal, enabled: e.target.checked } } })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-900">PayPal</label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">PayPal.me Username</label>
                <input
                  type="text"
                  value={config.paymentOptions.paypal.username}
                  onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, paypal: { ...config.paymentOptions.paypal, username: e.target.value } } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="ugunlocked"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your PayPal.me username (e.g., "ugunlocked" for paypal.me/ugunlocked). Amount will be automatically prefilled.
                </p>
              </div>
            </div>

            {/* Cash */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={config.paymentOptions.cash.enabled}
                  onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, cash: { ...config.paymentOptions.cash, enabled: e.target.checked } } })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-900">Cash</label>
              </div>
              <textarea
                value={config.paymentOptions.cash.instructions}
                onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, cash: { ...config.paymentOptions.cash, instructions: e.target.value } } })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Instructions for cash payment..."
              />
            </div>

            {/* Zelle */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={config.paymentOptions.zelle.enabled}
                  onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, zelle: { ...config.paymentOptions.zelle, enabled: e.target.checked } } })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-900">Zelle</label>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={config.paymentOptions.zelle.email}
                    onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, zelle: { ...config.paymentOptions.zelle, email: e.target.value } } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="payments@smartcart.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={config.paymentOptions.zelle.phone}
                    onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, zelle: { ...config.paymentOptions.zelle, phone: e.target.value } } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="+1234567890"
                  />
                </div>
              </div>
            </div>

            {/* Stripe Link */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="checkbox"
                  checked={config.paymentOptions.stripeLink.enabled}
                  onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, stripeLink: { ...config.paymentOptions.stripeLink, enabled: e.target.checked } } })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-900">Stripe Payment Link</label>
              </div>
              <p className="text-xs text-gray-500 ml-7">
                Payment links will be set per-order by admin/manager
              </p>
            </div>

            {/* Cards */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={config.paymentOptions.cards.enabled}
                  onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, cards: { ...config.paymentOptions.cards, enabled: e.target.checked } } })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-900">Credit/Debit Cards</label>
              </div>
              <textarea
                value={config.paymentOptions.cards.instructions}
                onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, cards: { ...config.paymentOptions.cards, instructions: e.target.value } } })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Instructions for card payment..."
              />
            </div>

            {/* Mobile Money */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={config.paymentOptions.mobileMoney.enabled}
                  onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, mobileMoney: { ...config.paymentOptions.mobileMoney, enabled: e.target.checked } } })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-900">Mobile Money</label>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
                  <input
                    type="text"
                    value={config.paymentOptions.mobileMoney.provider}
                    onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, mobileMoney: { ...config.paymentOptions.mobileMoney, provider: e.target.value } } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="M-Pesa, MTN, etc."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Number</label>
                  <input
                    type="text"
                    value={config.paymentOptions.mobileMoney.number}
                    onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, mobileMoney: { ...config.paymentOptions.mobileMoney, number: e.target.value } } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="+254700000000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
                  <textarea
                    value={config.paymentOptions.mobileMoney.instructions}
                    onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, mobileMoney: { ...config.paymentOptions.mobileMoney, instructions: e.target.value } } })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Payment instructions..."
                  />
                </div>
              </div>
            </div>

            {/* Bank Transfer */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={config.paymentOptions.bankTransfer.enabled}
                  onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, bankTransfer: { ...config.paymentOptions.bankTransfer, enabled: e.target.checked } } })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-900">Bank Transfer</label>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={config.paymentOptions.bankTransfer.bankName}
                      onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, bankTransfer: { ...config.paymentOptions.bankTransfer, bankName: e.target.value } } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Bank name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={config.paymentOptions.bankTransfer.accountName}
                      onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, bankTransfer: { ...config.paymentOptions.bankTransfer, accountName: e.target.value } } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Account holder name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={config.paymentOptions.bankTransfer.accountNumber}
                      onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, bankTransfer: { ...config.paymentOptions.bankTransfer, accountNumber: e.target.value } } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Account number"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Routing Number</label>
                    <input
                      type="text"
                      value={config.paymentOptions.bankTransfer.routingNumber}
                      onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, bankTransfer: { ...config.paymentOptions.bankTransfer, routingNumber: e.target.value } } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Routing number"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">SWIFT Code (Optional)</label>
                  <input
                    type="text"
                    value={config.paymentOptions.bankTransfer.swiftCode}
                    onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, bankTransfer: { ...config.paymentOptions.bankTransfer, swiftCode: e.target.value } } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="SWIFT code for international transfers"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
                  <textarea
                    value={config.paymentOptions.bankTransfer.instructions}
                    onChange={(e) => setConfig({ ...config, paymentOptions: { ...config.paymentOptions, bankTransfer: { ...config.paymentOptions.bankTransfer, instructions: e.target.value } } })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Additional instructions..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-blue-900 mb-4">Preview</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-blue-900">Service Fee:</span>
            <span className="font-medium text-blue-900">${config.serviceFee.toFixed(2)}</span>
          </div>
          <div className="bg-white p-3 rounded border border-blue-200">
            <p className="text-xs text-gray-600 italic">"{config.serviceFeeTooltip}"</p>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-blue-900">WhatsApp:</span>
            <span className="font-medium text-blue-900">{config.whatsappNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-blue-900">Email:</span>
            <span className="font-medium text-blue-900">{config.businessEmail}</span>
          </div>
        </div>
      </div>
    </div>
  );
}