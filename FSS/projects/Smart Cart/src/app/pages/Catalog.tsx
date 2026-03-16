import { useState, useEffect } from 'react';
import { ShoppingCart, Search, ExternalLink, Filter, BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';
import Select from 'react-select';
import { DatabaseSync } from '../utils/databaseSync';

interface CatalogItem {
  id: string;
  name: string;
  url: string;
  price: number;
  imageUrl: string;
  store: string;
  categories: string[];
  addedAt: string;
}

export function Catalog() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const loadCatalogData = () => {
      // Load catalog from localStorage
      const savedCatalog = localStorage.getItem('catalog');
      if (savedCatalog && JSON.parse(savedCatalog).length > 0) {
        let parsed = JSON.parse(savedCatalog);
      
      // Auto-migrate broken amazon image URLs from older sessions
      let modified = false;
      parsed = parsed.map((item: CatalogItem) => {
        if (item.imageUrl === 'https://m.media-amazon.com/images/I/71u-mB6o11L._AC_SX679_.jpg') {
          modified = true;
          return { ...item, imageUrl: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&q=80' };
        }
        if (item.imageUrl === 'https://m.media-amazon.com/images/I/61tA1n0vVqL._AC_SX679_.jpg') {
          modified = true;
          return { ...item, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80' };
        }
        return item;
      });

      if (modified) {
        localStorage.setItem('catalog', JSON.stringify(parsed));
      } else {
        // Automatically sync any valid locally scraped products up to the Edge Function's new array-merger!
        // This rescues stranded local data from before the RLS fix was deployed.
        const hasRealProducts = parsed.some((p: CatalogItem) => !p.id.startsWith('demo'));
        if (hasRealProducts) {
          DatabaseSync.persistToDB('catalog', JSON.stringify(parsed));
        }
      }

      // Sort parsed catalog items to show latest first based on addedAt
      parsed.sort((a: CatalogItem, b: CatalogItem) => {
         const timeA = new Date(a.addedAt || 0).getTime();
         const timeB = new Date(b.addedAt || 0).getTime();
         return timeB - timeA;
      });

      setCatalog(parsed);
      
      // Extract unique categories
      const allCategories = new Set<string>();
      parsed.forEach((item: CatalogItem) => {
        if (item.categories) {
          item.categories.forEach(c => allCategories.add(c));
        }
      });
      setCategories(Array.from(allCategories).sort());
    } else {
      // Initial demo data for empty state
      const initialDemoCatalog: CatalogItem[] = [
        {
          id: 'demo1',
          name: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
          url: 'https://www.amazon.com/dp/B09XS7JWHH',
          price: 398.00,
          imageUrl: 'https://m.media-amazon.com/images/I/51aXvjzcukL._AC_SX679_.jpg',
          store: 'Amazon',
          categories: ['Electronics', 'Audio'],
          addedAt: new Date().toISOString()
        },
        {
          id: 'demo2',
          name: 'Apple Watch Series 9 (GPS 41mm)',
          url: 'https://www.amazon.com/dp/B0CHX4NMF4',
          price: 389.00,
          imageUrl: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&q=80',
          store: 'Amazon',
          categories: ['Electronics', 'Wearables'],
          addedAt: new Date().toISOString()
        },
        {
          id: 'demo3',
          name: 'YETI Rambler 20 oz Tumbler',
          url: 'https://www.yeti.com/drinkware/tumblers/21071501138.html',
          price: 35.00,
          imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80',
          store: 'YETI',
          categories: ['Home', 'Accessories'],
          addedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 'demo4',
          name: 'Nike Air Force 1 \'07',
          url: 'https://www.nike.com/t/air-force-1-07-mens-shoes-jBrhbr/CW2288-111',
          price: 115.00,
          imageUrl: 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/b7d9211c-26e7-431a-ac24-b0540fb3c00f/air-force-1-07-mens-shoes-jBrhbr.png',
          store: 'Nike',
          categories: ['Apparel', 'Shoes'],
          addedAt: new Date(Date.now() - 172800000).toISOString()
        }
      ];
      setCatalog(initialDemoCatalog);
      // DO NOT write to localStorage here to avoid overwriting global cloud database on new clients
      // localStorage.setItem('catalog', JSON.stringify(initialDemoCatalog));
      const allCategories = new Set<string>();
      initialDemoCatalog.forEach(item => {
        item.categories.forEach(c => allCategories.add(c));
      });
      setCategories(Array.from(allCategories).sort());
    }
  };

  loadCatalogData();

  // Listen for Database Sync hydration
    const handleDbHydrated = () => {
      loadCatalogData();
    };
    window.addEventListener('db_hydrated', handleDbHydrated);
    
    return () => {
      window.removeEventListener('db_hydrated', handleDbHydrated);
    };
  }, []);

  const handleAddToCart = (item: CatalogItem) => {
    const currentCartStr = localStorage.getItem('smartcart_items');
    const currentCart = currentCartStr ? JSON.parse(currentCartStr) : [];
    
    // Check if it already exists to increment quantity instead
    const existingIndex = currentCart.findIndex((cartItem: any) => cartItem.url === item.url);
    if (existingIndex >= 0) {
      currentCart[existingIndex].quantity += 1;
    } else {
      currentCart.push({
        id: Date.now().toString(),
        name: item.name,
        url: item.url,
        price: item.price,
        imageUrl: item.imageUrl,
        store: item.store,
        quantity: 1,
        notes: ''
      });
    }

    localStorage.setItem('smartcart_items', JSON.stringify(currentCart));
    window.dispatchEvent(new Event('cartUpdated'));
    toast.success('Added to cart!');
  };

  const handleSaveForLater = (item: CatalogItem) => {
    const savedItemsStr = localStorage.getItem('smartcart_saved_items');
    const savedItems = savedItemsStr ? JSON.parse(savedItemsStr) : [];
    
    // Check if it already exists
    const existingIndex = savedItems.findIndex((savedItem: any) => savedItem.url === item.url);
    if (existingIndex < 0) {
      savedItems.push({
        id: Date.now().toString(),
        name: item.name,
        url: item.url,
        price: item.price,
        imageUrl: item.imageUrl,
        store: item.store,
        quantity: 1,
        notes: ''
      });
      localStorage.setItem('smartcart_saved_items', JSON.stringify(savedItems));
      toast.success('Saved for later!');
    } else {
      toast.info('Item is already in your saved list');
    }
  };

  // Filter items
  const filteredCatalog = catalog.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.store.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'all' || 
      (item.categories && item.categories.includes(selectedCategory));

    return matchesSearch && matchesCategory;
  });

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map(c => ({ value: c, label: c }))
  ];

  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: '#f9fafb',
      border: 'none',
      boxShadow: state.isFocused ? '0 0 0 2px #6366f1' : 'none',
      borderRadius: '0.5rem',
      minHeight: '48px',
      paddingLeft: '32px',
      cursor: 'pointer',
    }),
    valueContainer: (base: any) => ({
      ...base,
      padding: '0 8px',
    }),
    placeholder: (base: any) => ({
      ...base,
      color: '#374151',
      fontWeight: '500',
    }),
    singleValue: (base: any) => ({
      ...base,
      color: '#374151',
      fontWeight: '500',
    }),
    dropdownIndicator: (base: any) => ({
      ...base,
      color: '#9ca3af',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: '0.5rem',
      overflow: 'hidden',
      zIndex: 50,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    })
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">What Others Have Purchased</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Browse items recently purchased by our customers. Add these popular products directly to your cart!
          </p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products or stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>
          {categories.length > 0 && (
            <div className="relative min-w-[250px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
              <Select
                value={categoryOptions.find(opt => opt.value === selectedCategory) || categoryOptions[0]}
                onChange={(option) => setSelectedCategory(option?.value || 'all')}
                options={categoryOptions}
                styles={selectStyles}
                isSearchable={true}
                placeholder="All Categories"
              />
            </div>
          )}
        </div>

        {/* Catalog Grid */}
        {filteredCatalog.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No items found</h2>
            <p className="text-gray-500">
              {catalog.length === 0 
                ? "The catalog is currently empty. Items will appear here as customers make purchases."
                : "Try adjusting your search or category filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {filteredCatalog.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow group">
                {/* Image */}
                <div className="relative h-36 bg-white flex-shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-500 ease-in-out"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ShoppingCart className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                  {/* Category badging */}
                  {item.categories && item.categories.length > 0 && (
                    <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                      {item.categories.slice(0, 2).map((cat, idx) => (
                         <span key={idx} className="bg-white/90 backdrop-blur text-indigo-700 text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Store Badge */}
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow-sm">
                    {item.store}
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2" title={item.name}>
                    {item.name}
                  </h3>
                  
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      ${item.price.toFixed(2)}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                      title="View original product"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  
                  {/* Action */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="flex-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 group-hover:bg-indigo-600 group-hover:text-white"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>
                    <button
                      onClick={() => handleSaveForLater(item)}
                      className="bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white"
                      title="Save for later"
                    >
                      <BookmarkPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
