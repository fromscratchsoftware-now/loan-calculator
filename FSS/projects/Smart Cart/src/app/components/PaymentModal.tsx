import { X, ExternalLink, Check } from "lucide-react";
import { useState } from "react";

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  action?: () => void;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    total: number;
    amountPaid: number;
  };
  paymentOptions: any;
}

export function PaymentModal({ isOpen, onClose, order, paymentOptions }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const remainingBalance = order.total - order.amountPaid;

  if (!isOpen || !paymentOptions) return null;

  const availableMethods: PaymentMethod[] = [];

  // PayPal
  if (paymentOptions.paypal?.enabled) {
    availableMethods.push({
      id: 'paypal',
      name: 'PayPal',
      icon: '💳',
      description: `Send $${remainingBalance.toFixed(2)} via PayPal`,
      action: () => {
        const paypalUrl = `https://paypal.me/${paymentOptions.paypal.username}/${remainingBalance.toFixed(2)}`;
        window.open(paypalUrl, '_blank');
      }
    });
  }

  // Zelle
  if (paymentOptions.zelle?.enabled) {
    availableMethods.push({
      id: 'zelle',
      name: 'Zelle',
      icon: '💸',
      description: `Email: ${paymentOptions.zelle.email} | Phone: ${paymentOptions.zelle.phone}`
    });
  }

  // Bank Transfer
  if (paymentOptions.bankTransfer?.enabled) {
    availableMethods.push({
      id: 'bankTransfer',
      name: 'Bank Transfer',
      icon: '🏦',
      description: `${paymentOptions.bankTransfer.bankName} - ${paymentOptions.bankTransfer.accountNumber}`
    });
  }

  // Cash
  if (paymentOptions.cash?.enabled) {
    availableMethods.push({
      id: 'cash',
      name: 'Cash',
      icon: '💵',
      description: paymentOptions.cash.instructions
    });
  }

  // Cards
  if (paymentOptions.cards?.enabled) {
    availableMethods.push({
      id: 'cards',
      name: 'Credit/Debit Card',
      icon: '💳',
      description: paymentOptions.cards.instructions
    });
  }

  // Mobile Money
  if (paymentOptions.mobileMoney?.enabled) {
    availableMethods.push({
      id: 'mobileMoney',
      name: `Mobile Money (${paymentOptions.mobileMoney.provider})`,
      icon: '📱',
      description: `${paymentOptions.mobileMoney.number}`
    });
  }

  const handleMethodClick = (method: PaymentMethod) => {
    setSelectedMethod(method.id);
    if (method.action) {
      method.action();
    }
  };

  const renderMethodDetails = () => {
    if (!selectedMethod) return null;

    switch (selectedMethod) {
      case 'zelle':
        return (
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Zelle Payment Details</h4>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Send to:</strong></p>
              <p className="ml-4">Email: {paymentOptions.zelle.email}</p>
              <p className="ml-4">Phone: {paymentOptions.zelle.phone}</p>
              <p className="mt-3"><strong>Amount:</strong> ${remainingBalance.toFixed(2)}</p>
              <p className="mt-3 text-xs text-gray-600">After sending payment, please allow a few minutes for processing.</p>
            </div>
          </div>
        );

      case 'bankTransfer':
        return (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Bank Transfer Details</h4>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Bank Name:</strong> {paymentOptions.bankTransfer.bankName}</p>
              <p><strong>Account Name:</strong> {paymentOptions.bankTransfer.accountName}</p>
              <p><strong>Account Number:</strong> {paymentOptions.bankTransfer.accountNumber}</p>
              <p><strong>Routing Number:</strong> {paymentOptions.bankTransfer.routingNumber}</p>
              {paymentOptions.bankTransfer.swiftCode && (
                <p><strong>SWIFT Code:</strong> {paymentOptions.bankTransfer.swiftCode}</p>
              )}
              <p className="mt-3"><strong>Amount:</strong> ${remainingBalance.toFixed(2)}</p>
              <p className="mt-3"><strong>Reference:</strong> Order #{order.id.slice(0, 8)}</p>
              <p className="mt-3 text-xs text-gray-600">{paymentOptions.bankTransfer.instructions}</p>
            </div>
          </div>
        );

      case 'cash':
        return (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Cash Payment</h4>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Amount:</strong> ${remainingBalance.toFixed(2)}</p>
              <p className="mt-3 text-xs text-gray-600">{paymentOptions.cash.instructions}</p>
            </div>
          </div>
        );

      case 'cards':
        return (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Card Payment</h4>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Amount:</strong> ${remainingBalance.toFixed(2)}</p>
              <p className="mt-3 text-xs text-gray-600">{paymentOptions.cards.instructions}</p>
            </div>
          </div>
        );

      case 'mobileMoney':
        return (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Mobile Money Payment</h4>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Provider:</strong> {paymentOptions.mobileMoney.provider}</p>
              <p><strong>Number:</strong> {paymentOptions.mobileMoney.number}</p>
              <p className="mt-3"><strong>Amount:</strong> ${remainingBalance.toFixed(2)}</p>
              <p className="mt-3 text-xs text-gray-600">{paymentOptions.mobileMoney.instructions}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Make Payment</h2>
            <p className="text-sm text-gray-600 mt-1">
              Order #{order.id.slice(0, 8)} - ${remainingBalance.toFixed(2)} due
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-700 mb-4">
            Select your preferred payment method:
          </p>

          {/* Payment Methods Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => handleMethodClick(method)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  selectedMethod === method.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{method.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">{method.name}</h3>
                        {selectedMethod === method.id && (
                          <Check className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{method.description}</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Selected Method Details */}
          {renderMethodDetails()}

          {/* Amount Summary */}
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Order Total:</span>
                <span className="font-medium text-gray-900">${order.total.toFixed(2)}</span>
              </div>
              {order.amountPaid > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Already Paid:</span>
                  <span className="font-medium text-green-600">-${order.amountPaid.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="font-medium text-gray-900">Amount Due:</span>
                <span className="font-bold text-lg text-indigo-600">${remainingBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Note */}
          <p className="mt-4 text-xs text-gray-500 text-center">
            After completing your payment, it may take a few minutes to reflect in your order status.
            For immediate assistance, contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}
