import { useState, useEffect } from "react";
import { useOutletContext } from "react-router";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_PRIVACY_POLICY = `
<p class="text-lg">
  Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
</p>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mb-4 mt-8">1. Introduction</h2>
  <p>
    Welcome to the Shopping Assistant extension, powered by UgUnlocked. Your privacy is of the utmost importance to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Chrome Extension ("Shopping Assistant").
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mb-4 mt-8">2. Information We Collect</h2>
  <p>
    Our extension is designed with privacy in mind. We only collect the minimum amount of information necessary to provide our service (adding products to your cart):
  </p>
  <ul class="list-disc pl-6 mt-2 space-y-2">
    <li><strong>Product Information:</strong> When you click the extension to add a product to your cart, we extract the Name, Price, Image URL, and Page URL of the e-commerce product you are currently viewing.</li>
    <li><strong>No Personal Tracking:</strong> We do not track your browsing history. The extension only activates and reads page data when you explicitly click the extension icon.</li>
    <li><strong>No Background Data Collection:</strong> We do not collect analytics or background data while you browse the web.</li>
  </ul>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mb-4 mt-8">3. How We Use Your Information</h2>
  <p>
    The information collected is used for a single, specific purpose: bridging external e-commerce products into your UgUnlocked shopping cart. Specifically, we use it to:
  </p>
  <ul class="list-disc pl-6 mt-2 space-y-2">
    <li>Populate your "Add Product" form in the UgUnlocked application.</li>
    <li>Allow you to quickly submit orders to our purchasing team.</li>
  </ul>
  <p class="mt-4 font-medium italic">
    We do not sell, rent, or trade your data to any third parties for marketing or advertising purposes.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mb-4 mt-8">4. Data Security</h2>
  <p>
    We implement standard security measures to protect the product links and information you send from the extension to your cart. All data transfers are done over secure connections (HTTPS).
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mb-4 mt-8">5. Limited Use Certification</h2>
  <p>
    Our use of data complies with the Chrome Web Store Developer Program Policies, including the Limited Use policy. The extension only asks for permissions necessary to execute its primary function (extracting product metadata upon user click) and nothing more.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mb-4 mt-8">6. Changes to This Privacy Policy</h2>
  <p>
    We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mb-4 mt-8">7. Contact Us</h2>
  <p>
    If you have any questions about this Privacy Policy, please contact us at via the email provided in the website footer or admin dashboard.
  </p>
</section>
`;

export function PrivacyPolicy() {
  const { user } = useOutletContext<{ user: any }>() || { user: null };
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<string>("");
  const [pageId, setPageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPrivacyPolicy = async () => {
      try {
        const demoMode = localStorage.getItem('demoMode') === 'true';
        if (demoMode) {
          const cached = localStorage.getItem('demo_privacy_page');
          if (cached) setContent(cached);
          setLoading(false);
          return;
        }

        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/custom_pages`, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          const pages = data.pages || [];
          const privacyPage = pages.find((p: any) => p.slug === 'privacy');
          if (privacyPage) {
             setPageId(privacyPage.id);
             if (privacyPage.content) {
               setContent(privacyPage.content);
             }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrivacyPolicy();
  }, []);
  const handleSave = async () => {
    try {
      setSaving(true);
      const demoMode = localStorage.getItem('demoMode') === 'true';
      if (demoMode) {
        localStorage.setItem('demo_privacy_page', editContent);
        setContent(editContent);
        setIsEditing(false);
        toast.success("Privacy Policy saved successfully (Demo Mode)");
        return;
      }

      const payload: any = {
        title: "Privacy Policy",
        slug: "privacy",
        content: editContent,
      };
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
        if (data.page?.id) setPageId(data.page.id);
        setContent(editContent);
        setIsEditing(false);
        toast.success("Privacy Policy saved successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save privacy policy");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error saving privacy policy");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    // If we have content use it, otherwise use the default policy template
    setEditContent(content || DEFAULT_PRIVACY_POLICY);
    setIsEditing(true);
  };

  if (loading) return <div className="p-12 text-center text-gray-500 min-h-screen">Loading Privacy Policy...</div>;

  const isAdmin = user?.role === 'admin';

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 bg-white min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Edit Privacy Policy</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditing(false)}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">HTML Content</label>
          <textarea 
            rows={20}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none font-mono text-sm"
          />
          <p className="mt-2 text-sm text-gray-500">You can use standard HTML tags like &lt;h1&gt;, &lt;p&gt;, &lt;ul&gt;, and &lt;strong&gt;.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 bg-white min-h-screen relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
        {isAdmin && (
          <button
            onClick={startEditing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg font-medium transition-colors"
          >
            <Edit2 className="w-4 h-4" /> Edit Policy
          </button>
        )}
      </div>
      <div 
        className="prose prose-indigo max-w-none text-gray-700 space-y-6"
        dangerouslySetInnerHTML={{ __html: content || DEFAULT_PRIVACY_POLICY }}
      />
    </div>
  );
}
