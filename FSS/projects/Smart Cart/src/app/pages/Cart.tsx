import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Plus, Trash2, ShoppingBag, List, BookmarkPlus, CheckSquare, Square, CornerUpLeft } from "lucide-react";
import { AddProductDialog } from "../components/AddProductDialog";
import { ProductCard } from "../components/ProductCard";
import { Tooltip } from "../components/Tooltip";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  name: string;
  url: string;
  price: number;
  imageUrl: string;
  quantity: number;
  store: string;
  notes?: string;
}

export function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialUrl, setInitialUrl] = useState("");
  const [initialPreDom, setInitialPreDom] = useState("");
  const [initialData, setInitialData] = useState<{name?: string, price?: number, image?: string}>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [serviceFee, setServiceFee] = useState(5.00);
  const [serviceFeeTooltip, setServiceFeeTooltip] = useState("This fee covers our personal shopping service.");

  // Get current user
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // Check if customer has unpaid orders
  const [hasUnpaidOrders, setHasUnpaidOrders] = useState(false);

  // Saved for later state
  const [savedItems, setSavedItems] = useState<CartItem[]>([]);
  const [selectedSavedItems, setSelectedSavedItems] = useState<string[]>([]);

  // Load saved items
  const loadSavedItems = () => {
    const saved = localStorage.getItem('smartcart_saved_items');
    if (saved) {
      setSavedItems(JSON.parse(saved));
    }
  };

  useEffect(() => {
    loadSavedItems();
    const handleSavedItemsUpdate = () => loadSavedItems();
    window.addEventListener('savedItemsUpdated', handleSavedItemsUpdate);
    return () => window.removeEventListener('savedItemsUpdated', handleSavedItemsUpdate);
  }, []);

  // Check for shared URL
  useEffect(() => {
    const addUrl = searchParams.get('add_url');
    const preDom = searchParams.get('pre_dom');
    const name = searchParams.get('name');
    const price = searchParams.get('price');
    const image = searchParams.get('image');
    
    if (addUrl) {
      setInitialUrl(addUrl);
      if (preDom) setInitialPreDom(preDom);
      
      const newInitialData: any = {};
      if (name) newInitialData.name = name;
      if (price) newInitialData.price = parseFloat(price);
      if (image) newInitialData.image = image;
      setInitialData(newInitialData);
      
      setIsDialogOpen(true);
      
      // Clean up URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('add_url');
      newSearchParams.delete('pre_dom');
      newSearchParams.delete('name');
      newSearchParams.delete('price');
      newSearchParams.delete('image');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Load admin config
  useEffect(() => {
    const config = localStorage.getItem("adminConfig");
    if (config) {
      const { serviceFee: fee, serviceFeeTooltip: tooltip } = JSON.parse(config);
      setServiceFee(fee || 5.00);
      setServiceFeeTooltip(tooltip || "This fee covers our personal shopping service.");
    }
    
    // Check for unpaid orders
    if (currentUser?.id) {
      const existingOrders = localStorage.getItem("orders");
      const orders = existingOrders ? JSON.parse(existingOrders) : [];
      const unpaidOrder = orders.find((order: any) => 
        order.customerId === currentUser.id && 
        order.paymentStatus === "Unpaid"
      );
      setHasUnpaidOrders(!!unpaidOrder);
    }
  }, []);

  // Load cart from localStorage
  useEffect(() => {
    // Check if we're editing an order
    const editOrderId = localStorage.getItem("editingOrderId");
    if (editOrderId) {
      setIsEditingOrder(true);
      setEditingOrderId(editOrderId);
      
      // Load cart items from the editing session
      const savedCart = localStorage.getItem("cart");
      const savedAddress = localStorage.getItem("deliveryAddress");
      
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
      if (savedAddress) {
        setDeliveryAddress(savedAddress);
      }
    } else {
      // Normal cart loading
      const saved = localStorage.getItem("smartcart_items");
      if (saved) {
        setCartItems(JSON.parse(saved));
      }
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (isEditingOrder) {
      localStorage.setItem("cart", JSON.stringify(cartItems));
      if (deliveryAddress) {
        localStorage.setItem("deliveryAddress", deliveryAddress);
      }
    } else {
      localStorage.setItem("smartcart_items", JSON.stringify(cartItems));
      window.dispatchEvent(new Event("cartUpdated"));
    }
  }, [cartItems, deliveryAddress, isEditingOrder]);

  const addProduct = (product: Omit<CartItem, "id">) => {
    const newItem: CartItem = {
      ...product,
      id: Date.now().toString(),
    };
    setCartItems(prev => [...prev, newItem]);
    toast.success("Product added to cart");
  };

  const removeProduct = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
    toast.success("Product removed from cart");
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setCartItems(
      cartItems.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const updateNotes = (id: string, notes: string) => {
    setCartItems(
      cartItems.map((item) => (item.id === id ? { ...item, notes } : item))
    );
  };

  const handleSaveForLater = (product: Omit<CartItem, "id">) => {
    const savedItemsStr = localStorage.getItem('smartcart_saved_items');
    const localSavedItems = savedItemsStr ? JSON.parse(savedItemsStr) : [];
    
    // Check if it already exists
    const existingIndex = localSavedItems.findIndex((si: any) => si.url === product.url);
    if (existingIndex < 0) {
      localSavedItems.push({
        ...product,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      });
      localStorage.setItem('smartcart_saved_items', JSON.stringify(localSavedItems));
      window.dispatchEvent(new Event('savedItemsUpdated'));
      toast.success('Saved for later!');
    } else {
      toast.info('Item is already in your saved list');
    }
  };

  const handleMoveToCart = (ids: string[]) => {
    const itemsToMove = savedItems.filter(item => ids.includes(item.id));
    if (itemsToMove.length === 0) return;

    setCartItems(prev => {
      const newCart = [...prev];
      itemsToMove.forEach(item => {
        const existingIndex = newCart.findIndex(c => c.url === item.url);
        if (existingIndex >= 0) {
          newCart[existingIndex].quantity += item.quantity || 1;
        } else {
          newCart.push({ ...item, id: Date.now().toString() + Math.random().toString(36).substring(2, 9) });
        }
      });
      return newCart;
    });

    const newSavedItems = savedItems.filter(item => !ids.includes(item.id));
    setSavedItems(newSavedItems);
    localStorage.setItem('smartcart_saved_items', JSON.stringify(newSavedItems));
    setSelectedSavedItems([]);
    toast.success(`${itemsToMove.length} item(s) moved to cart`);
  };

  const handleRemoveSavedItems = (ids: string[]) => {
    const newSavedItems = savedItems.filter(item => !ids.includes(item.id));
    setSavedItems(newSavedItems);
    localStorage.setItem('smartcart_saved_items', JSON.stringify(newSavedItems));
    setSelectedSavedItems(prev => prev.filter(id => !ids.includes(id)));
    toast.success(`${ids.length} item(s) removed`);
  };

  const toggleSelectSavedItem = (id: string) => {
    setSelectedSavedItems(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllSaved = () => {
    if (selectedSavedItems.length === savedItems.length && savedItems.length > 0) {
      setSelectedSavedItems([]);
    } else {
      setSelectedSavedItems(savedItems.map(item => item.id));
    }
  };

  const handleSaveCartItemForLater = (id: string) => {
    const itemToSave = cartItems.find(item => item.id === id);
    if (!itemToSave) return;
    
    handleSaveForLater(itemToSave);
    removeProduct(id);
  };

  const submitOrder = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Check if user is logged in
    if (!currentUser) {
      toast.error("Please log in to checkout");
      navigate("/login");
      return;
    }

    if (!deliveryAddress.trim()) {
      toast.error("Please enter a delivery address");
      return;
    }

    if (isEditingOrder && editingOrderId) {
      // Update existing order
      const existingOrders = localStorage.getItem("orders");
      if (existingOrders) {
        const orders = JSON.parse(existingOrders);
        const updatedOrders = orders.map((order: any) => {
          if (order.id === editingOrderId) {
            return {
              ...order,
              items: cartItems,
              deliveryAddress,
              total: totalPrice,
              editedByAdmin: false,
              editNotification: `Order updated by customer on ${new Date().toLocaleString()}`,
            };
          }
          return order;
        });
        localStorage.setItem("orders", JSON.stringify(updatedOrders));
        
        // Clear editing session
        localStorage.removeItem("editingOrderId");
        localStorage.removeItem("cart");
        localStorage.removeItem("deliveryAddress");
        
        toast.success("Order updated successfully!");
        navigate("/orders");
      }
    } else {
      // Check if customer has any existing unpaid orders
      const existingOrders = localStorage.getItem("orders");
      const orders = existingOrders ? JSON.parse(existingOrders) : [];
      
      // Find the most recent unpaid order for this customer
      const unpaidOrder = orders.find((order: any) => 
        order.customerId === currentUser.id && 
        order.paymentStatus === "Unpaid"
      );
      
      if (unpaidOrder) {
        // Combine with existing unpaid order
        const updatedOrders = orders.map((order: any) => {
          if (order.id === unpaidOrder.id) {
            // Merge items - check if item already exists, if so update quantity, else add new item
            const mergedItems = [...order.items];
            
            cartItems.forEach((newItem: any) => {
              const existingItemIndex = mergedItems.findIndex(
                (item: any) => item.url === newItem.url
              );
              
              if (existingItemIndex >= 0) {
                // Item already exists, increase quantity
                mergedItems[existingItemIndex].quantity += newItem.quantity;
              } else {
                // New item, add to list
                mergedItems.push(newItem);
              }
            });
            
            // Recalculate total
            const newSubtotal = mergedItems.reduce(
              (sum: number, item: any) => sum + item.price * item.quantity,
              0
            );
            const serviceFee = 5.00;
            const newTotal = newSubtotal + serviceFee;
            
            return {
              ...order,
              items: mergedItems,
              deliveryAddress: deliveryAddress || order.deliveryAddress,
              total: newTotal,
              editNotification: `Items added on ${new Date().toLocaleString()}`,
            };
          }
          return order;
        });
        
        localStorage.setItem("orders", JSON.stringify(updatedOrders));
        
        // Clear cart
        setCartItems([]);
        setDeliveryAddress("");
        localStorage.removeItem("cart");
        localStorage.removeItem("deliveryAddress");
        
        toast.success("Items added to your existing unpaid order!");
        navigate("/orders");
      } else {
        // Create new order - no unpaid orders exist
        const order = {
          id: Date.now().toString(),
          customerId: currentUser.id,
          customerName: currentUser.name,
          items: cartItems,
          deliveryAddress,
          status: "Order placed by customer",
          paymentStatus: "Unpaid",
          amountPaid: 0,
          paymentMethod: null,
          paymentLink: null,
          cashPaymentRequested: false,
          cashPaymentApproved: false,
          editedByAdmin: false,
          createdAt: new Date().toISOString(),
          total: totalPrice,
        };

        // Save to orders
        orders.unshift(order);
        localStorage.setItem("orders", JSON.stringify(orders));

        // Clear cart
        setCartItems([]);
        setDeliveryAddress("");
        localStorage.removeItem("cart");
        localStorage.removeItem("deliveryAddress");
        
        toast.success("Order submitted successfully! Our team will contact you for payment.");

        // Redirect to orders page
        navigate("/orders");
      }
    }
  };

  const cancelEdit = () => {
    if (confirm("Are you sure you want to cancel editing? Your changes will be lost.")) {
      // Clear editing session
      localStorage.removeItem("editingOrderId");
      localStorage.removeItem("cart");
      localStorage.removeItem("deliveryAddress");
      
      // Redirect to orders page
      navigate("/orders");
    }
  };

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {isEditingOrder && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">Editing Order #{editingOrderId?.slice(0, 8)}</p>
            <p className="text-xs text-blue-700 mt-1">Make your changes and click "Update Order" to save</p>
          </div>
          <button
            onClick={cancelEdit}
            className="px-4 py-2 text-sm text-blue-700 hover:text-blue-900 font-medium"
          >
            Cancel Edit
          </button>
        </div>
      )}
      
      {!isEditingOrder && hasUnpaidOrders && cartItems.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-white text-xs font-bold">ℹ</span>
            </div>
            <div>
              <p className="text-sm font-medium text-green-900">Smart Order Combining Enabled</p>
              <p className="text-xs text-green-700 mt-1">
                You have an existing unpaid order. When you submit this cart, these items will be automatically combined with your unpaid order. 
                This helps you avoid multiple payments and consolidates everything into one order.
              </p>
              <p className="text-xs text-green-600 mt-2">
                💡 Once you complete payment on an order, any new items will create a separate order.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl text-gray-900">Your SmartCart</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate("/catalog")}
            className="flex items-center justify-center gap-2 bg-purple-100 text-purple-700 px-4 py-3 rounded-lg hover:bg-purple-200 transition-colors font-medium w-full sm:w-auto"
          >
            <List className="size-5" />
            Add from Catalog
          </button>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors w-full sm:w-auto"
          >
            <Plus className="size-5" />
            {cartItems.length > 0 ? 'Add Another Product' : 'Add Product'}
          </button>
        </div>
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="size-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl text-gray-600 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">
            Start adding products from any online store
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full px-4 sm:px-0">
            <button
              onClick={() => setIsDialogOpen(true)}
              className="inline-flex justify-center items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors w-full sm:w-auto"
            >
              <Plus className="size-5" />
              Add Your First Product
            </button>
            <button
              onClick={() => navigate("/catalog")}
              className="inline-flex justify-center items-center gap-2 bg-purple-100 text-purple-700 px-6 py-3 rounded-lg hover:bg-purple-200 transition-colors font-medium w-full sm:w-auto"
            >
              <List className="size-5" />
              Browse Catalog
            </button>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8 w-full max-w-full">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4 min-w-0 w-full">
            {cartItems.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onRemove={removeProduct}
                  onUpdateQuantity={updateQuantity}
                  onUpdateNotes={updateNotes}
                  onSaveForLater={handleSaveCartItemForLater}
                />
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-6 sticky top-4">
              <h2 className="text-xl mb-4 text-gray-900">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Items ({cartItems.length})</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="flex items-center gap-1">
                    Service Fee
                    <Tooltip content={serviceFeeTooltip} />
                  </span>
                  <span>${serviceFee.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-gray-900">
                  <span>Estimated Total</span>
                  <span>${(totalPrice + serviceFee).toFixed(2)}</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-2">
                  Delivery Address *
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter your delivery address"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={submitOrder}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {isEditingOrder ? "Update Order" : "Submit Order"}
              </button>

              <p className="text-xs text-gray-500 mt-4">
                {isEditingOrder 
                  ? "Your order will be updated with the new items and delivery address."
                  : "Our team will review your order and contact you with payment details."}
              </p>
            </div>
          </div>
        </div>
      )}

      {savedItems.length > 0 && (
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl text-gray-900 border-b-2 border-indigo-600 pb-1 inline-block">Saved for Later ({savedItems.length})</h2>
            
            {savedItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={toggleSelectAllSaved}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {selectedSavedItems.length === savedItems.length ? (
                    <><CheckSquare className="size-4 text-indigo-600" /> Deselect All</>
                  ) : (
                    <><Square className="size-4 text-gray-500" /> Select All</>
                  )}
                </button>
                
                {selectedSavedItems.length > 0 && (
                  <>
                    <button
                      onClick={() => handleMoveToCart(selectedSavedItems)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                    >
                      <CornerUpLeft className="size-4" /> Move Selected to Cart
                    </button>
                    <button
                      onClick={() => handleRemoveSavedItems(selectedSavedItems)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                    >
                      <Trash2 className="size-4" /> Delete Selected
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedItems.map(item => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-4 relative hover:shadow-md transition-shadow">
                <div className="absolute top-4 left-4 z-10">
                  <button 
                    onClick={() => toggleSelectSavedItem(item.id)}
                    className="bg-white rounded p-0.5 shadow-sm"
                  >
                    {selectedSavedItems.includes(item.id) ? (
                      <CheckSquare className="size-5 text-indigo-600" />
                    ) : (
                      <Square className="size-5 text-gray-300" />
                    )}
                  </button>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="size-20 flex-shrink-0 relative rounded bg-gray-50 overflow-hidden ml-6">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="size-full object-contain p-1"
                      onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2" title={item.name}>{item.name}</h3>
                    <p className="text-sm font-bold text-gray-900 mt-1">${item.price.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.store}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleRemoveSavedItems([item.id])}
                    className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => handleMoveToCart([item.id])}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                  >
                    <CornerUpLeft className="size-3" /> Move to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddProductDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onAdd={addProduct}
        initialUrl={initialUrl}
        initialPreDom={initialPreDom}
        initialData={initialData}
      />
    </div>
  );
}