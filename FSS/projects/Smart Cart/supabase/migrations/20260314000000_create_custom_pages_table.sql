CREATE TABLE IF NOT EXISTS public.custom_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.custom_pages ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow public read access on custom_pages"
ON public.custom_pages FOR SELECT
TO public
USING (true);

-- Allow all operations for authenticated users (or you could restrict to admin if you set up roles)
CREATE POLICY "Allow all operations for authenticated users on custom_pages"
ON public.custom_pages FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow anon all operations on custom_pages (dev edge function)
CREATE POLICY "Allow anon all operations on custom_pages (dev)"
ON public.custom_pages FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_custom_pages_modtime
BEFORE UPDATE ON public.custom_pages
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
