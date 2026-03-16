import { useState, useEffect } from "react";
import { ExternalLink, Trash2, Plus, Minus } from "lucide-react";
import type { CartItem } from "../pages/Cart";
import { ProxiedImageWithPlaceholder } from "./ProxiedImage";

interface ProductCardProps {
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  onSaveForLater?: (id: string) => void;
}

export function ProductCard({ item, onRemove, onUpdateQuantity, onUpdateNotes, onSaveForLater }: ProductCardProps) {
  const [localNotes, setLocalNotes] = useState(item.notes || "");

  useEffect(() => {
    if (item.notes !== undefined && item.notes !== localNotes) {
      setLocalNotes(item.notes);
    }
  }, [item.notes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onUpdateNotes && localNotes !== (item.notes || "")) {
        onUpdateNotes(item.id, localNotes);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localNotes, item.id, item.notes, onUpdateNotes]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row gap-3 hover:shadow-md transition-shadow group/card w-full min-w-0">
      {/* Product Image */}
      <div className="size-20 flex-shrink-0 overflow-hidden relative rounded-lg bg-white mx-auto sm:mx-0">
        <ProxiedImageWithPlaceholder
          src={item.imageUrl}
          alt={item.name}
          className="size-full object-contain p-1 rounded-lg group-hover/card:scale-110 transition-transform duration-500 ease-in-out"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium text-gray-900 truncate">{item.name}</h3>
            <p className="text-xs text-gray-500">{item.store}</p>
          </div>
          <div className="flex items-center gap-2">
            {onSaveForLater && (
              <button
                onClick={() => onSaveForLater(item.id)}
                className="text-gray-400 hover:text-indigo-600 transition-colors flex-shrink-0 text-[10px] flex flex-col items-center"
                aria-label="Save for later"
                title="Save for Later"
              >
                Save
              </button>
            )}
            <button
              onClick={() => onRemove(item.id)}
              className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
              aria-label="Remove item"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        {onUpdateNotes && (
          <div className="w-full mb-2 min-w-0 flex-1">
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder={"Add your notes here, such as size, color,\nconfigurations, or special instructions."}
              rows={1}
              className="w-full text-sm text-gray-900 border border-gray-200 sm:border-transparent hover:border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md bg-transparent px-2 py-1 transition-all resize-none placeholder:text-gray-400"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap mt-auto">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
          >
            View Product
            <ExternalLink className="size-3" />
          </a>

          <div className="flex items-center gap-3">
            {/* Quantity Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                className="size-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus className="size-3" />
              </button>
              <span className="text-sm text-gray-900 min-w-[1.5rem] text-center">
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="size-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
              >
                <Plus className="size-3" />
              </button>
            </div>

            {/* Price */}
            <div className="text-right min-w-[4rem]">
              <div className="text-base text-gray-900 font-medium">
                ${(item.price * item.quantity).toFixed(2)}
              </div>
              {item.quantity > 1 && (
                <div className="text-[10px] text-gray-500 mt-0.5">
                  ${item.price.toFixed(2)} ea
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}