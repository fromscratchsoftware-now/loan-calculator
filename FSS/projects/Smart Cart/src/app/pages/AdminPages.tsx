import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router";
import { LayoutDashboard, Save, ArrowLeft, Image as ImageIcon, Type, AlignLeft, CheckCircle, Chrome, Smartphone, Truck, Package, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

interface HomePageData {
  heroTitle: string;
  heroHighlight: string;
  heroSubtext: string;
  heroBgImage: string;
  howTitle: string;
  how1Title: string;
  how1Desc: string;
  how2Title: string;
  how2Desc: string;
  how3Title: string;
  how3Desc: string;
  whyTitle: string;
  why1Title: string;
  why1Desc: string;
  why2Title: string;
  why2Desc: string;
  why3Title: string;
  why3Desc: string;
  why4Title: string;
  why4Desc: string;
  appsTitle: string;
  extTitle: string;
  extDesc: string;
  extBtn: string;
  appTitle: string;
  appDesc: string;
  appBtn: string;
  ctaTitle: string;
  ctaSubtext: string;
  ctaBtn: string;
}

const DEFAULT_DATA: HomePageData = {
  heroTitle: "Shop From Any Website,",
  heroHighlight: "We Handle the Rest",
  heroSubtext: "Your personal shopping assistant. Add products from any online store to your cart, submit your order, and our team will purchase and deliver everything to your doorstep.",
  heroBgImage: "https://images.unsplash.com/photo-1631010231931-d2c396b444ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaGlwcGluZyUyMHBhY2thZ2VzJTIwZGVsaXZlcnklMjBib3hlcyUyMHNob3BwaW5nfGVufDF8fHx8MTc3MzExNTI3MXww&ixlib=rb-4.1.0&q=80&w=1080",
  howTitle: "How It Works",
  how1Title: "1. Add Products",
  how1Desc: "Browse any online store and add products to your SmartCart. Just paste the product URL, use our browser extension, or tap Share in your phone's browser to push products directly to your cart.",
  how2Title: "2. Submit Order",
  how2Desc: "Review your cart and submit your order. Our team receives your request immediately.",
  how3Title: "3. We Deliver",
  how3Desc: "Sit back and relax. We'll purchase all items and deliver them straight to your door.",
  whyTitle: "Why Choose SmartCart?",
  why1Title: "Shop Anywhere",
  why1Desc: "No restrictions. Add products from any website, any store, anywhere in the world.",
  why2Title: "Save Time",
  why2Desc: "Stop juggling multiple checkouts. One cart, one checkout, all your favorite stores.",
  why3Title: "Personal Service",
  why3Desc: "Our dedicated team handles every purchase with care and attention to detail.",
  why4Title: "Track Everything",
  why4Desc: "Stay updated with real-time order tracking from purchase to delivery.",
  appsTitle: "Get to your cart faster",
  extTitle: "Install Browser Extension",
  extDesc: "Add products directly to SmartCart from any online store with a single click. Available for desktop Chrome, Edge, and Brave.",
  extBtn: "Add to Browser",
  appTitle: "Install Mobile App",
  appDesc: "Share products from any app directly to SmartCart using your phone's native share menu.",
  appBtn: "Install Web App",
  ctaTitle: "Ready to Simplify Your Shopping?",
  ctaSubtext: "Join thousands of happy customers who shop smarter with SmartCart",
  ctaBtn: "Get Started Now"
};

export function AdminPages() {
  const { user } = useOutletContext<{ user: any }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [pageId, setPageId] = useState<string | null>(null);
  const [formData, setFormData] = useState<HomePageData>(DEFAULT_DATA);
  const [privacyPageId, setPrivacyPageId] = useState<string | null>(null);
  const [privacyContent, setPrivacyContent] = useState<string>("");

  useEffect(() => {
    console.log("Token check in AdminPages:", publicAnonKey);
    if (!user || user.role !== "admin") {
      toast.error("Access denied. Admin access required.");
      navigate("/");
      return;
    }
    fetchHomePage();
  }, [user, navigate]);

  const fetchHomePage = async () => {
    try {
      setLoading(true);
      const demoMode = localStorage.getItem('demoMode') === 'true';
      if (demoMode) {
        const demoContent = localStorage.getItem('demo_home_page');
        const demoPrivacy = localStorage.getItem('demo_privacy_page');
        if (demoContent) {
           try {
             setFormData({ ...DEFAULT_DATA, ...JSON.parse(demoContent) });
           } catch (e) {
             console.error("Failed to parse demo home page", e);
           }
        }
        if (demoPrivacy) {
           setPrivacyContent(demoPrivacy);
        }
        setLoading(false);
        return;
      }

      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/custom_pages`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        }
      });
      if (res.ok) {
        const data = await res.json();
        const pages = data.pages || [];
        const homePage = pages.find((p: any) => p.slug === 'home');
        if (homePage && homePage.content) {
          setPageId(homePage.id);
          try {
            const parsed = JSON.parse(homePage.content);
            setFormData({ ...DEFAULT_DATA, ...parsed }); // Merge with defaults
          } catch (e) {
            console.error("Failed to parse home page content", e);
          }
        }
        const privacyPage = pages.find((p: any) => p.slug === 'privacy');
        if (privacyPage && privacyPage.content) {
          setPrivacyPageId(privacyPage.id);
          setPrivacyContent(privacyPage.content);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Error loading home page data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: any = {
        title: "Home Page",
        slug: "home",
        content: JSON.stringify(formData),
      };
      
      const demoMode = localStorage.getItem('demoMode') === 'true';
      if (demoMode) {
        localStorage.setItem('demo_home_page', payload.content);
        localStorage.setItem('demo_privacy_page', privacyContent);
        toast.success("Home and Privacy content saved successfully (Demo Mode)");
        setSaving(false);
        return;
      }
      
      if (pageId) {
        payload.id = pageId;
      }

      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/custom_pages`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.page?.id) {
           setPageId(data.page.id);
        }
        
        // Also save privacy content
        const privacyPayload: any = {
          title: "Privacy Policy",
          slug: "privacy",
          content: privacyContent,
        };
        if (privacyPageId) {
          privacyPayload.id = privacyPageId;
        }
        
        const resPrivacy = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/custom_pages`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(privacyPayload)
        });
        
        if (resPrivacy.ok) {
           const pData = await resPrivacy.json();
           if (pData.page?.id) setPrivacyPageId(pData.page.id);
        }
        
        toast.success("Content saved successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save contents");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error saving page");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof HomePageData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="p-8 text-center min-h-screen">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen pb-24">
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Dashboard
      </button>

      <div className="flex justify-between items-center mb-8 sticky top-0 bg-white/90 backdrop-blur pb-4 pt-4 z-50 shadow-sm px-4 rounded-xl border border-gray-100">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl sm:text-3xl text-gray-900">Home Page Content</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Content'}
        </button>
      </div>

      {/* Hero Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <Type className="text-gray-500 w-5 h-5" />
          <h2 className="text-lg font-medium text-gray-900">Hero Section</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Main Title Line</label>
            <input 
              type="text" 
              value={formData.heroTitle}
              onChange={(e) => handleChange('heroTitle', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Highlighted Title Line</label>
            <input 
              type="text" 
              value={formData.heroHighlight}
              onChange={(e) => handleChange('heroHighlight', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-600 font-medium" 
            />
          </div>
          <div>
            <label className="flex items-center gap-2 block text-sm font-medium text-gray-700 mb-2">
              <AlignLeft className="w-4 h-4 text-gray-500" /> Wait... Subtitle / Description
            </label>
            <textarea 
              rows={4}
              value={formData.heroSubtext}
              onChange={(e) => handleChange('heroSubtext', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="border-t border-gray-100 pt-6">
            <label className="flex items-center gap-2 block text-sm font-medium text-gray-700 mb-2">
              <ImageIcon className="w-4 h-4 text-gray-500" /> Background Image URL
            </label>
            <input 
              type="text" 
              value={formData.heroBgImage}
              onChange={(e) => handleChange('heroBgImage', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
            {formData.heroBgImage && (
              <div className="mt-4 rounded-lg overflow-hidden h-48 relative border border-gray-200">
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${formData.heroBgImage}')`}}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <Truck className="text-gray-500 w-5 h-5" />
          <h2 className="text-lg font-medium text-gray-900">How It Works</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section Title</label>
            <input type="text" value={formData.howTitle} onChange={(e) => handleChange('howTitle', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
          </div>
          <div className="grid md:grid-cols-3 gap-6 pt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 mb-2"><ShoppingCart className="size-5" /> Step 1</div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input type="text" value={formData.how1Title} onChange={(e) => handleChange('how1Title', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea rows={3} value={formData.how1Desc} onChange={(e) => handleChange('how1Desc', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 mb-2"><Package className="size-5" /> Step 2</div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input type="text" value={formData.how2Title} onChange={(e) => handleChange('how2Title', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea rows={3} value={formData.how2Desc} onChange={(e) => handleChange('how2Desc', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 mb-2"><Truck className="size-5" /> Step 3</div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input type="text" value={formData.how3Title} onChange={(e) => handleChange('how3Title', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea rows={3} value={formData.how3Desc} onChange={(e) => handleChange('how3Desc', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose SmartCart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <CheckCircle className="text-gray-500 w-5 h-5" />
          <h2 className="text-lg font-medium text-gray-900">Why Choose Us Section</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section Title</label>
            <input type="text" value={formData.whyTitle} onChange={(e) => handleChange('whyTitle', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
          </div>
          <div className="grid md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-4 border p-4 rounded-lg border-gray-100">
               <div className="font-medium text-green-700 mb-2">Point 1</div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input type="text" value={formData.why1Title} onChange={(e) => handleChange('why1Title', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea rows={2} value={formData.why1Desc} onChange={(e) => handleChange('why1Desc', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
            </div>
            <div className="space-y-4 border p-4 rounded-lg border-gray-100">
               <div className="font-medium text-green-700 mb-2">Point 2</div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input type="text" value={formData.why2Title} onChange={(e) => handleChange('why2Title', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea rows={2} value={formData.why2Desc} onChange={(e) => handleChange('why2Desc', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
            </div>
            <div className="space-y-4 border p-4 rounded-lg border-gray-100">
               <div className="font-medium text-green-700 mb-2">Point 3</div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input type="text" value={formData.why3Title} onChange={(e) => handleChange('why3Title', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea rows={2} value={formData.why3Desc} onChange={(e) => handleChange('why3Desc', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
            </div>
            <div className="space-y-4 border p-4 rounded-lg border-gray-100">
               <div className="font-medium text-green-700 mb-2">Point 4</div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input type="text" value={formData.why4Title} onChange={(e) => handleChange('why4Title', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea rows={2} value={formData.why4Desc} onChange={(e) => handleChange('why4Desc', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Apps & Extensions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <Smartphone className="text-gray-500 w-5 h-5" />
          <h2 className="text-lg font-medium text-gray-900">Apps & Extensions</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section Title</label>
            <input type="text" value={formData.appsTitle} onChange={(e) => handleChange('appsTitle', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
          </div>
          <div className="grid md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-4 border p-4 rounded-lg border-gray-100">
               <div className="font-medium flex items-center gap-2 text-indigo-600 mb-2"><Chrome className="w-4 h-4"/> Browser Extension</div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input type="text" value={formData.extTitle} onChange={(e) => handleChange('extTitle', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea rows={2} value={formData.extDesc} onChange={(e) => handleChange('extDesc', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Button Text</label>
                  <input type="text" value={formData.extBtn} onChange={(e) => handleChange('extBtn', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
            </div>
            <div className="space-y-4 border p-4 rounded-lg border-gray-100">
               <div className="font-medium flex items-center gap-2 text-indigo-600 mb-2"><Smartphone className="w-4 h-4"/> Mobile App</div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input type="text" value={formData.appTitle} onChange={(e) => handleChange('appTitle', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea rows={2} value={formData.appDesc} onChange={(e) => handleChange('appDesc', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Button Text</label>
                  <input type="text" value={formData.appBtn} onChange={(e) => handleChange('appBtn', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <AlignLeft className="text-gray-500 w-5 h-5" />
          <h2 className="text-lg font-medium text-gray-900">Call to Action Area</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input type="text" value={formData.ctaTitle} onChange={(e) => handleChange('ctaTitle', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none font-bold" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle / Subtext</label>
            <textarea rows={2} value={formData.ctaSubtext} onChange={(e) => handleChange('ctaSubtext', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Button Text</label>
            <input type="text" value={formData.ctaBtn} onChange={(e) => handleChange('ctaBtn', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
          </div>
        </div>
      </div>

      {/* Privacy Policy Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <AlignLeft className="text-gray-500 w-5 h-5" />
          <h2 className="text-lg font-medium text-gray-900">Privacy Policy Content</h2>
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">HTML Content</label>
          <textarea 
            rows={15}
            value={privacyContent}
            onChange={(e) => setPrivacyContent(e.target.value)}
            placeholder="<div>Your Privacy Policy Details...</div>"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none font-mono text-sm"
          />
        </div>
      </div>

    </div>
  );
}
