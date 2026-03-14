import { Package, MapPin, Calendar } from "lucide-react";
import type { Order } from "../pages/Orders";
import { ProxiedImageWithPlaceholder } from "./ProxiedImage";

interface OrderCardProps {
  order: Order;
}

const statusConfig = {
  pending: {
    label: "Pending Review",
    color: "bg-yellow-100 text-yellow-800",
  },
  processing: {
    label: "Processing",
    color: "bg-blue-100 text-blue-800",
  },
  purchased: {
    label: "Items Purchased",
    color: "bg-purple-100 text-purple-800",
  },
  shipped: {
    label: "Shipped",
    color: "bg-indigo-100 text-indigo-800",
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-800",
  },
};

export function OrderCard({ order }: OrderCardProps) {
  const status = statusConfig[order.status];

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Order Header */}
      <div className="bg-gray-50 px-6 py-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="size-4" />
            <span className="text-sm">
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Order #{order.id.slice(-8)}
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm ${status.color}`}>
          {status.label}
        </div>
      </div>

      {/* Order Details */}
      <div className="px-6 py-4">
        {/* Items */}
        <div className="mb-4">
          <h3 className="text-sm text-gray-700 mb-3">Items ({order.items.length})</h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <ProxiedImageWithPlaceholder
                  src={item.imageUrl}
                  alt={item.name}
                  className="size-16 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.store}</p>
                  <p className="text-sm text-gray-600">
                    Qty: {item.quantity} × ${item.price.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="border-t pt-4 mb-4">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="size-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-500 mb-1">Delivery Address</p>
              <p className="text-gray-900 whitespace-pre-line">{order.deliveryAddress}</p>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="border-t pt-4 flex items-center justify-between">
          <span className="text-gray-700">Total</span>
          <span className="text-xl text-gray-900">${order.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}