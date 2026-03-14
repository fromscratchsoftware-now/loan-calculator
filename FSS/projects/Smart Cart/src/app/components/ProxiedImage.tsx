import { useState } from "react";
import { ImageIcon } from "lucide-react";

interface ProxiedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

export function ProxiedImage({ src, alt, className = "", fallbackSrc }: ProxiedImageProps) {
  const [error, setError] = useState(false);

  // Default fallback image
  const defaultFallback = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400";

  const handleError = () => {
    setError(true);
  };

  // If error or no src, show fallback
  if (error || !src) {
    const finalFallback = fallbackSrc || defaultFallback;
    return (
      <img
        src={finalFallback}
        alt={alt}
        className={className}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
}

interface ProxiedImageWithPlaceholderProps {
  src: string;
  alt: string;
  className?: string;
}

export function ProxiedImageWithPlaceholder({ src, alt, className = "" }: ProxiedImageWithPlaceholderProps) {
  const [error, setError] = useState(false);

  const handleError = () => {
    setError(true);
  };

  if (error || !src) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <ImageIcon className="size-8 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
}