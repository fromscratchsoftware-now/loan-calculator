export function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
      
      <div className="prose prose-indigo max-w-none text-gray-700 space-y-6">
        <p className="text-lg">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-8">1. Introduction</h2>
          <p>
            Welcome to the Shopping Assistant extension, powered by UgUnlocked. Your privacy is of the utmost importance to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Chrome Extension ("Shopping Assistant").
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-8">2. Information We Collect</h2>
          <p>
            Our extension is designed with privacy in mind. We only collect the minimum amount of information necessary to provide our service (adding products to your cart):
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li><strong>Product Information:</strong> When you click the extension to add a product to your cart, we extract the Name, Price, Image URL, and Page URL of the e-commerce product you are currently viewing.</li>
            <li><strong>No Personal Tracking:</strong> We do not track your browsing history. The extension only activates and reads page data when you explicitly click the extension icon.</li>
            <li><strong>No Background Data Collection:</strong> We do not collect analytics or background data while you browse the web.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-8">3. How We Use Your Information</h2>
          <p>
            The information collected is used for a single, specific purpose: bridging external e-commerce products into your UgUnlocked shopping cart. Specifically, we use it to:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Populate your "Add Product" form in the UgUnlocked application.</li>
            <li>Allow you to quickly submit orders to our purchasing team.</li>
          </ul>
          <p className="mt-4 font-medium italic">
            We do not sell, rent, or trade your data to any third parties for marketing or advertising purposes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-8">4. Data Security</h2>
          <p>
            We implement standard security measures to protect the product links and information you send from the extension to your cart. All data transfers are done over secure connections (HTTPS).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-8">5. Limited Use Certification</h2>
          <p>
            Our use of data complies with the Chrome Web Store Developer Program Policies, including the Limited Use policy. The extension only asks for permissions necessary to execute its primary function (extracting product metadata upon user click) and nothing more.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-8">6. Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-8">7. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at via the email provided in the website footer or admin dashboard.
          </p>
        </section>
      </div>
    </div>
  );
}
