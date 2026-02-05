"use client";

import { useEffect, useRef, useState } from "react";

interface BunnyStreamPlayerProps {
  videoId: string;
  libraryId: string;
  token?: string;
  className?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  autoplay?: boolean;
  controls?: boolean;
}

export const BunnyStreamPlayer = ({
  videoId,
  libraryId,
  token,
  className,
  onEnded,
  onTimeUpdate,
  autoplay = false,
  controls = true,
}: BunnyStreamPlayerProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if script is already loaded
    const existingScript = document.querySelector('script[src="https://iframe.mediadelivery.net/embed/iframe_api.js"]');
    
    if (existingScript) {
      setIsLoaded(true);
      return;
    }

    // Load Bunny Stream player script
    const script = document.createElement("script");
    script.src = "https://iframe.mediadelivery.net/embed/iframe_api.js";
    script.async = true;
    
    script.onload = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      // Don't log error - the iframe will still work without the API script
      // The API script is optional and only needed for advanced player controls
      setIsLoaded(true); // Still render the iframe even if script fails
    };

    document.body.appendChild(script);

    return () => {
      // Don't remove script on unmount as it might be used by other instances
      // The script will be reused if component remounts
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !iframeRef.current) return;

    const iframe = iframeRef.current;
    
    // Listen for messages from the iframe
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (!event.origin.includes('mediadelivery.net')) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data.type === 'ended' && onEnded) {
          onEnded();
        }
        
        if (data.type === 'timeupdate' && onTimeUpdate && data.currentTime !== undefined) {
          onTimeUpdate(data.currentTime);
        }
      } catch (error) {
        // Ignore parsing errors
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isLoaded, onEnded, onTimeUpdate]);

  const embedUrl = token
    ? `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&autoplay=${autoplay ? '1' : '0'}&controls=${controls ? '1' : '0'}`
    : `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=${autoplay ? '1' : '0'}&controls=${controls ? '1' : '0'}`;

  return (
    <div className={`aspect-video ${className || ""}`}>
      <iframe
        ref={iframeRef}
        src={embedUrl}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        className="w-full h-full border-0 rounded-lg"
        style={{ minHeight: '400px' }}
        title="Video Player"
      />
    </div>
  );
};

