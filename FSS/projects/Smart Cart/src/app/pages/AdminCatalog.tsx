import { useState, useEffect } from 'react';
import { ShoppingBag, ArrowLeft, Trash2, Edit2, LogOut, Settings, Plus, ShoppingCart } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router';
import { toast } from 'sonner';

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

export function AdminCatalog() {
  const context = useOutletContext<{ user: any }>();
  const currentUser = context?.user;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  
  // Editing state
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<CatalogItem>>({});
  const [categoryInput, setCategoryInput] = useState('');

  useEffect(() => {
    // Auth check
    let userToCheck = currentUser;
    if (!userToCheck) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          userToCheck = JSON.parse(storedUser);
        } catch (e) {
          console.error(e);
        }
      }
    }
    
    if (!userToCheck || userToCheck.role !== 'admin') {
      navigate('/');
      return;
    }

    loadData();
  }, [currentUser, navigate]);

  const loadData = () => {
    setLoading(true);
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
      }
      
      setCatalog(parsed);
    } else {
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
      localStorage.setItem('catalog', JSON.stringify(initialDemoCatalog));
    }
    setLoading(false);
  };

  const saveCatalog = (newCatalog: CatalogItem[]) => {
    setCatalog(newCatalog);
    localStorage.setItem('catalog', JSON.stringify(newCatalog));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this item from the catalog?')) {
      const updated = catalog.filter(item => item.id !== id);
      saveCatalog(updated);
      toast.success('Item removed from catalog');
    }
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setFormData(item);
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      url: '',
      price: 0,
      imageUrl: '',
      store: '',
      categories: []
    });
    setCategoryInput('');
    setIsAddingNew(true);
  };

  const autoCategorize = () => {
    const categoriesMap: Record<string, string[]> = {
      // Electronics & Tech
      'jabra': ['Electronics', 'Audio'],
      'speaker': ['Electronics', 'Audio'],
      'headphone': ['Electronics', 'Audio'],
      'earbuds': ['Electronics', 'Audio'],
      'monitor': ['Electronics', 'Computers & Accessories'],
      'laptop': ['Electronics', 'Computers & Accessories'],
      'mouse': ['Electronics', 'Computers & Accessories'],
      'keyboard': ['Electronics', 'Computers & Accessories'],
      'inmo': ['Electronics', 'Wearables'],
      // Watches
      'watch': ['Watches', 'Wrist Watches'],
      'band': ['Watches', 'Watch Bands'],
      'casio': ['Watches', 'Wrist Watches'],
      // Hardware & Tools
      'makita': ['Hardware', 'Tools'],
      'drill': ['Hardware', 'Tools'],
      'router': ['Hardware', 'Tools'],
      'saw': ['Hardware', 'Tools'],
      'wrench': ['Hardware', 'Tools'],
      // Shoes & Apparel
      'hoka': ['Shoes', 'Athletic Shoes'],
      'shoes': ['Shoes'],
      'sneaker': ['Shoes', 'Sneakers'],
      'shirt': ['Clothing', 'Apparel'],
      'dress': ['Clothing', 'Dresses'],
      'pants': ['Clothing', 'Apparel'],
      'jeans': ['Clothing', 'Apparel'],
      'sweater': ['Clothing', 'Sweaters'],
      // Toys & Hobbies
      'card': ['Toys & Hobbies', 'Collectibles'],
      'magic': ['Toys & Hobbies', 'Collectibles'],
      'toy': ['Toys & Hobbies'],
      'lego': ['Toys & Hobbies', 'Building Toys'],
      'game': ['Toys & Hobbies', 'Games'],
      'puzzle': ['Toys & Hobbies', 'Puzzles'],
      // Groceries
      'starbucks': ['Groceries', 'Beverages'],
      'coffee': ['Groceries', 'Beverages'],
      'nespresso': ['Groceries', 'Beverages'],
      'snack': ['Groceries', 'Pantry'],
      // Pharmacy
      'shampoo': ['Pharmacy', 'Personal Care'],
      'nizoral': ['Pharmacy', 'Personal Care'],
      'vitamin': ['Pharmacy', 'Vitamins'],
      'complex': ['Pharmacy', 'Vitamins'],
      'calcium': ['Pharmacy', 'Minerals'],
      'magnesium': ['Pharmacy', 'Minerals'],
      'zinc': ['Pharmacy', 'Minerals'],
      // Beauty & Skincare
      'cleanser': ['Beauty', 'Skincare'],
      'wash': ['Beauty', 'Skincare'],
      'gel': ['Beauty', 'Skincare'],
      'treatment': ['Beauty', 'Skincare'],
      'lotion': ['Beauty', 'Skincare'],
      'niacinamide': ['Beauty', 'Skincare'],
      'retinol': ['Beauty', 'Skincare'],
      'hyaluronic': ['Beauty', 'Skincare'],
      'moisturizer': ['Beauty', 'Skincare'],
      'serum': ['Beauty', 'Skincare'],
      'cream': ['Beauty', 'Skincare'],
      'sunscreen': ['Beauty', 'Skincare'],
      'spf': ['Beauty', 'Skincare'],
      'makeup': ['Beauty', 'Makeup'],
      // Home & Kitchen
      'blender': ['Home & Kitchen', 'Appliances'],
      'vacuum': ['Home & Kitchen', 'Appliances'],
      'towel': ['Home & Kitchen', 'Bath'],
      'book': ['Books & Media'],
    };

    let updatedCount = 0;
    const updatedCatalog = catalog.map(item => {
      const titleLower = item.name.toLowerCase();
      const newCategories: string[] = [];
      
      for (const [key, categoryArray] of Object.entries(categoriesMap)) {
        if (titleLower.includes(key)) {
          newCategories.push(...categoryArray);
        }
      }

      if (newCategories.length === 0) {
        newCategories.push('Miscellaneous');
      }

      // Deduplicate categories
      let uniqueCats = Array.from(new Set(newCategories));
      
      // Dynamic Demographic Tagging for Apparel & Shoes
      if (uniqueCats.includes('Clothing') || uniqueCats.includes('Shoes') || uniqueCats.includes('Apparel')) {
         const hasWomen = /\b(women\'?s?|ladies|womens)\b/.test(titleLower);
         const hasMen = /\b(men\'?s?|mens)\b/.test(titleLower);
         const hasKids = /\b(kid\'?s?|boy\'?s?|girl\'?s?|toddler)\b/.test(titleLower);

         // Prevent 'women' from triggering 'men' due to regex overlap, though word boundaries (\b) usually handle this.
         if (hasWomen) {
            uniqueCats.unshift('Women');
         } else if (hasMen) {
            uniqueCats.unshift('Men');
         } else if (hasKids) {
            uniqueCats.unshift('Kids');
         }
      }
      
      // Filter out overlapping impossible categories
      if (uniqueCats.includes('Watches') && uniqueCats.includes('Shoes')) {
        // Assume whatever matches highest fidelity, or just drop one safely
        // But since this is specific to our bug, let's keep it to whatever the main word was
        if (titleLower.includes('watch') || titleLower.includes('casio')) {
           const idx = uniqueCats.indexOf('Shoes');
           if (idx > -1) uniqueCats.splice(idx, 1);
        } else if (titleLower.includes('hoka') || titleLower.includes('sneaker')) {
           const idx = uniqueCats.indexOf('Watches');
           if (idx > -1) uniqueCats.splice(idx, 1);
        } else {
           // Default to Watch over Shoes if ambiguously tagged
           const idx = uniqueCats.indexOf('Shoes');
           if (idx > -1) uniqueCats.splice(idx, 1);
        }
      }

      // Also clean up stray generic tags that sneak in
      if (uniqueCats.includes('Watches') && uniqueCats.includes('Wrist Watches')) {
         // Good
      }
      
      const currentCatsStr = JSON.stringify(item.categories || []);
      const newCatsStr = JSON.stringify(uniqueCats);
      
      if (currentCatsStr !== newCatsStr) {
        item.categories = uniqueCats;
        updatedCount++;
      }
      
      return item;
    });

    if (updatedCount > 0) {
      saveCatalog(updatedCatalog);
      toast.success(`Auto-categorized ${updatedCount} items!`);
    } else {
      toast.info('No uncategorized items needed updating.');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.url || !formData.price || !formData.store) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Process categories input if it hasn't been added yet
    let itemCategories = formData.categories || [];
    if (categoryInput.trim()) {
      const newCats = categoryInput.split(',').map(c => c.trim()).filter(c => c && !itemCategories.includes(c));
      itemCategories = [...itemCategories, ...newCats];
    }

    const itemToSave: CatalogItem = {
      id: isAddingNew ? Date.now().toString() : (formData.id as string),
      name: formData.name,
      url: formData.url,
      price: Number(formData.price),
      imageUrl: formData.imageUrl || '',
      store: formData.store,
      categories: itemCategories,
      addedAt: isAddingNew ? new Date().toISOString() : (formData.addedAt || new Date().toISOString())
    };

    if (isAddingNew) {
      saveCatalog([itemToSave, ...catalog]);
      toast.success('New item added to catalog');
    } else {
      const updated = catalog.map(item => item.id === itemToSave.id ? itemToSave : item);
      saveCatalog(updated);
      toast.success('Catalog item updated');
    }

    setEditingItem(null);
    setIsAddingNew(false);
    setFormData({});
    setCategoryInput('');
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Catalog Management</h1>
              <p className="text-sm text-gray-600">Manage the public 'What Others Have Purchased' catalog</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={autoCategorize}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-indigo-600 font-medium"
              >
                Auto Categorize
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </button>
            </div>
          </div>
        </header>

        {(editingItem || isAddingNew) ? (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">{isAddingNew ? 'Add New Catalog Item' : 'Edit Catalog Item'}</h2>
            <form onSubmit={handleSaveEdit} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Store *</label>
                  <input
                    type="text"
                    required
                    value={formData.store || ''}
                    onChange={e => setFormData({...formData, store: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price || ''}
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Product URL *</label>
                <input
                  type="url"
                  required
                  value={formData.url || ''}
                  onChange={e => setFormData({...formData, url: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl || ''}
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Categories (comma separated)</label>
                <input
                  type="text"
                  value={isAddingNew ? categoryInput : (formData.categories?.join(', ') || categoryInput)}
                  onChange={e => {
                    if (isAddingNew) {
                      setCategoryInput(e.target.value);
                    } else {
                      setFormData({...formData, categories: e.target.value.split(',').map(c => c.trim()).filter(Boolean)});
                    }
                  }}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g. Electronics, Clothing"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Save Item
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingItem(null);
                    setIsAddingNew(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow px-6 py-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-600" />
                Catalog Items ({catalog.length})
              </h2>
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store & Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categories</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {catalog.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4" onClick={() => navigate('/catalog')}>
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt="" className="h-10 w-10 object-cover" />
                            ) : (
                              <ShoppingCart className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="ml-4 max-w-[300px]">
                            <div className="text-sm font-medium text-gray-900 truncate" title={item.name}>{item.name}</div>
                            <div className="text-xs text-gray-500">Added {new Date(item.addedAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">${item.price.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{item.store}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {item.categories?.length > 0 ? (
                            item.categories.map((cat, i) => (
                              <span key={i} className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                {cat}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">Miscellaneous</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button type="button" onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }} 
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {catalog.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No items in catalog yet. They will appear here when customers make purchases.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
