export interface OrderStatus {
  id: string;
  name: string;
  color: 'gray' | 'yellow' | 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'indigo';
}

export const DEFAULT_STATUSES: OrderStatus[] = [
  { id: '1', name: 'Order placed by customer', color: 'yellow' },
  { id: '2', name: 'Processing', color: 'blue' },
  { id: '3', name: 'Packed', color: 'indigo' },
  { id: '4', name: 'Shipped', color: 'purple' },
  { id: '5', name: 'Out for Delivery', color: 'orange' },
  { id: '6', name: 'Delivered', color: 'green' },
  { id: '7', name: 'Cancelled', color: 'red' },
];

export function getOrderStatuses(): OrderStatus[] {
  const config = localStorage.getItem('adminConfig');
  if (config) {
    const parsed = JSON.parse(config);
    return parsed.orderStatuses || DEFAULT_STATUSES;
  }
  return DEFAULT_STATUSES;
}

export function getStatusColor(statusName: string): string {
  const statuses = getOrderStatuses();
  const status = statuses.find(s => s.name === statusName);
  const color = status?.color || 'gray';
  
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };

  return colorMap[color] || colorMap.gray;
}