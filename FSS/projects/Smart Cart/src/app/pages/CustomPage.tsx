import { useEffect, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

interface PageContent {
  id: string;
  slug: string;
  title: string;
  content: string;
}

export function CustomPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const demoMode = localStorage.getItem('demoMode') === 'true';
        if (demoMode) {
          // In demo mode, we don't have custom pages populated basically, unless it's the home page,
          // which is handled in Home.tsx. Just set loading false.
          setLoading(false);
          return;
        }

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/custom_pages`, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          }
        });
        if (response.ok) {
          const data = await response.json();
          const pages: PageContent[] = data.pages || [];
          const found = pages.find((p) => p.slug === slug);
          if (found) {
            setPage(found);
          }
        }
      } catch (error) {
        console.error("Error fetching custom pages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  if (loading) return <div className="min-h-screen pt-24 pb-16 px-4 max-w-7xl mx-auto flex items-center justify-center">Loading page content...</div>;

  if (!page) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Basic Hero */}
      <section className="relative bg-gradient-to-br from-blue-900 to-blue-700 text-white py-16">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold">{page.title}</h1>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg prose-blue">
          <div dangerouslySetInnerHTML={{ __html: page.content }} />
        </div>
      </section>
    </div>
  );
}
