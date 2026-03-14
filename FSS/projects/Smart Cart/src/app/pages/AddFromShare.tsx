import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

export function AddFromShare() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Recover and save any draft product before we overwrite the dialog
    const draftStr = localStorage.getItem('draft_product');
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft && draft.url) {
          console.log("Saving previous product draft to cart!", draft.name);
          const savedCart = localStorage.getItem('smartcart_items');
          const cart = savedCart ? JSON.parse(savedCart) : [];
          
          cart.push({
            id: Date.now().toString(),
            name: draft.name || "Unknown Product",
            url: draft.url,
            price: Number(draft.price) || 0,
            imageUrl: draft.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
            quantity: parseInt(draft.quantity) || 1,
            store: draft.store || "Unknown",
            notes: draft.notes || "",
          });
          
          localStorage.setItem('smartcart_items', JSON.stringify(cart));
          window.dispatchEvent(new Event("cartUpdated"));
        }
      } catch (e) {
        console.error("Error saving draft product:", e);
      }
      localStorage.removeItem('draft_product');
    }

    // The Web Share target usually sends url or text
    const sharedUrl = searchParams.get('url') || searchParams.get('text');
    
    // Check if what was shared contains an actual URL
    let extractedUrl = '';
    if (sharedUrl) {
      // Basic regex to find a URL in a string if they shared text + url together
      const urlMatch = sharedUrl.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        extractedUrl = urlMatch[0];
      }
    }

    let extraParams = '';
    ['pre_dom', 'name', 'price', 'image'].forEach(key => {
      if (searchParams.get(key)) {
        extraParams += `&${key}=${encodeURIComponent(searchParams.get(key)!)}`;
      }
    });

    if (extractedUrl) {
      // Redirect to cart with the pre-filled URL query
      navigate(`/cart?add_url=${encodeURIComponent(extractedUrl)}${extraParams}`, { replace: true });
    } else {
      // Just fallback to cart if nothing useful was shared
      navigate('/cart', { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Processing shared item...</p>
      </div>
    </div>
  );
}
