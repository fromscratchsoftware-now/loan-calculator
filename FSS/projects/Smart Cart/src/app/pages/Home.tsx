import { ShoppingCart, Package, Truck, CheckCircle, Chrome, Smartphone, ArrowRight } from "lucide-react";
import { Link, useOutletContext } from "react-router";
import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

export function Home() {
  const { user } = useOutletContext<{ user: any }>();
  
  const [homeData, setHomeData] = useState({
    heroTitle: "Shop From Any Website,",
    heroHighlight: "We Handle the Rest",
    heroSubtext: "Your personal shopping assistant. Add products from any online store to your cart, submit your order, and our team will purchase and deliver everything to your doorstep.",
    heroBgImage: "https://images.unsplash.com/photo-1631010231931-d2c396b444ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaGlwcGluZyUyMHBhY2thZ2VzJTIwZGVsaXZlcnklMjBib3hlcyUyMHNob3BwaW5nfGVufDF8fHx8MTc3MzExNTI3MXww&ixlib=rb-4.1.0&q=80&w=1080",
    howTitle: "How It Works",
    how1Title: "1. Add Products",
    how1Desc: "Browse any online store and add products to your SmartCart. Just paste the product URL, image, and details.",
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
    extDesc: "Add products directly from any online store with a single click. Available for desktop Chrome, Edge, and Brave.",
    extBtn: "Add to Browser",
    appTitle: "Install Mobile App",
    appDesc: "Share products from any app directly to SmartCart using your phone's native share menu.",
    appBtn: "Install Web App",
    ctaTitle: "Ready to Simplify Your Shopping?",
    ctaSubtext: "Join thousands of happy customers who shop smarter with SmartCart",
    ctaBtn: "Get Started Now"
  });

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const demoMode = localStorage.getItem('demoMode') === 'true';
        if (demoMode) {
          const demoContent = localStorage.getItem('demo_home_page');
          if (demoContent) {
             const parsed = JSON.parse(demoContent);
             setHomeData(prev => ({ ...prev, ...parsed }));
          }
          return;
        }

        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/custom_pages`, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          }
        });
        if (res.ok) {
          const data = await res.json();
          const p = (data.pages || []).find((page: any) => page.slug === 'home');
          if (p && p.content) {
            const parsed = JSON.parse(p.content);
            setHomeData(prev => ({ ...prev, ...parsed }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch home page data", err);
      }
    };
    fetchHomeData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-20 px-4 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom right, rgba(239, 246, 255, 0.95), rgba(224, 231, 255, 0.95)), url('${homeData.heroBgImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-5xl mb-6 text-gray-900">
            {homeData.heroTitle}
            <br />
            <span className="text-indigo-600">{homeData.heroHighlight}</span>
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            {homeData.heroSubtext}
          </p>
          {!user && (
            <div className="flex gap-4 justify-center">
              <Link
                to="/cart"
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-lg hover:bg-indigo-700 transition-colors text-lg"
              >
                <ShoppingCart className="size-5" />
                Start Shopping
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-white text-indigo-600 border-2 border-indigo-600 px-8 py-4 rounded-lg hover:bg-indigo-50 transition-colors text-lg"
              >
                Sign Up Free
              </Link>
            </div>
          )}
          {user?.role === 'customer' && (
            <Link
              to="/cart"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-lg hover:bg-indigo-700 transition-colors text-lg"
            >
              <ShoppingCart className="size-5" />
              Start Shopping
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors text-lg"
            >
              Manage System
            </Link>
          )}
          {user?.role === 'manager' && (
            <Link
              to="/manager"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 transition-colors text-lg"
            >
              View Orders
            </Link>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl text-center mb-12 text-gray-900">{homeData.howTitle}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-indigo-100 size-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="size-8 text-indigo-600" />
              </div>
              <h3 className="text-xl mb-3 text-gray-900">{homeData.how1Title}</h3>
              <p className="text-gray-600">
                {homeData.how1Desc}
              </p>
            </div>

            <div className="text-center">
              <div className="bg-indigo-100 size-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="size-8 text-indigo-600" />
              </div>
              <h3 className="text-xl mb-3 text-gray-900">{homeData.how2Title}</h3>
              <p className="text-gray-600">
                {homeData.how2Desc}
              </p>
            </div>

            <div className="text-center">
              <div className="bg-indigo-100 size-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="size-8 text-indigo-600" />
              </div>
              <h3 className="text-xl mb-3 text-gray-900">{homeData.how3Title}</h3>
              <p className="text-gray-600">
                {homeData.how3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl text-center mb-12 text-gray-900">{homeData.whyTitle}</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <CheckCircle className="size-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl mb-2 text-gray-900">{homeData.why1Title}</h3>
                <p className="text-gray-600">
                  {homeData.why1Desc}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle className="size-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl mb-2 text-gray-900">{homeData.why2Title}</h3>
                <p className="text-gray-600">
                  {homeData.why2Desc}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle className="size-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl mb-2 text-gray-900">{homeData.why3Title}</h3>
                <p className="text-gray-600">
                  {homeData.why3Desc}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle className="size-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl mb-2 text-gray-900">{homeData.why4Title}</h3>
                <p className="text-gray-600">
                  {homeData.why4Desc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Apps & Extensions */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex justify-between items-center py-5 px-6 border-b border-white/20">
              <h2 className="text-xl font-medium text-white">{homeData.appsTitle}</h2>
            </div>
            <div className="grid md:grid-cols-2">
              <div className="hidden md:block p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/10">
                <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <Chrome className="size-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">{homeData.extTitle}</h3>
                <p className="text-white/80 mb-8 max-w-sm">
                  {homeData.extDesc}
                </p>
                <div className="flex gap-4">
                  <button className="bg-white text-indigo-700 font-medium px-6 py-3 rounded-lg hover:bg-indigo-50 transition-colors inline-flex items-center gap-2">
                    {homeData.extBtn}
                  </button>
                </div>
              </div>

              <div className="p-8 md:p-12">
                <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <Smartphone className="size-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">{homeData.appTitle}</h3>
                <p className="text-white/80 mb-8 max-w-sm">
                  {homeData.appDesc}
                </p>
                <div className="flex gap-4">
                  <button className="bg-indigo-900 border border-indigo-500 text-white font-medium px-6 py-3 rounded-lg hover:bg-indigo-800 transition-colors inline-flex items-center gap-2" onClick={() => {
                        alert("To install the app, tap the Share button in your browser and select 'Add to Home Screen'. Then use the Share sheet from any app to send products to Smart Cart!");
                      }}>
                    {homeData.appBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}