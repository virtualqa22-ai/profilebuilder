import React, { useEffect, useRef, useState } from 'react';
import AdSense from 'react-adsense';
import fuckAdBlock from 'fuckadblock';

/**
 * Props for the AdComponent
 */
interface AdComponentProps {
  /** Unique identifier for the advertisement */
  adUnitId: string;
  /** Size of the ad (e.g., 'rectangle', 'banner') */
  size: string;
  /** Callback function called when ad impression is tracked */
  onImpression?: () => void;
  /** Callback function called when ad is clicked */
  onClick?: () => void;
}

/**
 * AdComponent - Renders AdMob ads with lazy loading, tracking, and accessibility features
 *
 * This component integrates Google AdSense (AdMob equivalent for web) to display ads.
 * It implements lazy loading using IntersectionObserver for performance optimization,
 * tracks impressions and clicks via the backend API with anonymized user data,
 * and ensures non-intrusive placement with graceful error handling.
 */
const AdComponent: React.FC<AdComponentProps> = ({
  adUnitId,
  size,
  onImpression,
  onClick,
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const [isAdblockDetected, setIsAdblockDetected] = useState(false);
  const hasTrackedAdblock = useRef(false);
  const [userId] = useState(() => {
    // Generate or retrieve a unique user identifier for anonymized tracking
    const storedId = sessionStorage.getItem('adUserId');
    if (storedId) return storedId;
    const newId = crypto.randomUUID();
    sessionStorage.setItem('adUserId', newId);
    return newId;
  });

  /**
   * Tracks ad interaction metrics to the backend API
   * @param eventType - Type of interaction (impression, click, etc.)
   * @param metadata - Additional event data
   */
  const trackMetric = async (eventType: string, metadata: Record<string, any> = {}) => {
    try {
      const response = await fetch('/api/ads/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          ad_id: adUnitId,
          event_type: eventType,
          metadata,
        }),
      });

      if (!response.ok) {
        console.warn('Failed to track ad metric:', response.statusText);
      }
    } catch (error) {
      console.warn('Error tracking ad metric:', error);
    }
  };

  /**
   * Handles ad impression tracking
   */
  const handleImpression = () => {
    if (!hasTrackedImpression) {
      setHasTrackedImpression(true);
      trackMetric('impression', { size });
      onImpression?.();
    }
  };

  /**
   * Handles ad click tracking
   */
  const handleClick = () => {
    trackMetric('click', { size });
    onClick?.();
  };

  // Lazy loading with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect(); // Stop observing once visible
          }
        });
      },
      { threshold: 0.1 } // Trigger when 10% of the ad is visible
    );

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Track impression when ad becomes visible
  useEffect(() => {
    if (isVisible) {
      // Small delay to ensure ad is loaded
      const timer = setTimeout(handleImpression, 1000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Adblock detection
  useEffect(() => {
    try {
      fuckAdBlock.onDetected(() => {
        setIsAdblockDetected(true);
        if (!hasTrackedAdblock.current) {
          hasTrackedAdblock.current = true;
          trackMetric('adblock', { adUnitId, size });
        }
      });
      fuckAdBlock.onNotDetected(() => {
        // Adblock not detected, proceed normally
      });
    } catch (error) {
      console.warn('Error initializing adblock detection:', error);
    }
  }, [adUnitId, size]);

  // If adblock is detected, show fallback UI
  if (isAdblockDetected) {
    return (
      <div
        ref={adRef}
        className="ad-fallback flex items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-md"
        style={{ minHeight: size === 'banner' ? '90px' : '250px' }}
        role="region"
        aria-label="Adblock detected message"
      >
        <p className="text-sm text-gray-600 text-center">
          Ads help keep this free - consider disabling adblock
        </p>
      </div>
    );
  }

  if (!isVisible) {
    return (
      <div
        ref={adRef}
        className="ad-placeholder"
        style={{ minHeight: '250px', backgroundColor: '#f0f0f0' }}
        aria-label="Advertisement loading"
      >
        {/* Placeholder to maintain layout */}
      </div>
    );
  }

  return (
    <div
      ref={adRef}
      className="ad-container"
      role="region"
      aria-label="Advertisement"
    >
      <AdSense
        client={process.env.NEXT_PUBLIC_ADMOB_PUBLISHER_ID || ''}
        slot={adUnitId}
        style={{
          display: 'block',
          width: size === 'banner' ? '728px' : '300px',
          height: size === 'banner' ? '90px' : '250px',
        }}
        format=""
        responsive="true"
        onAdLoaded={() => {
          // Ad loaded successfully, impression already handled via visibility
        }}
        onAdFailed={() => {
          console.warn('Ad failed to load for unit:', adUnitId);
        }}
        onAdOpened={handleClick} // Triggered when ad is clicked/opened
        onAdClosed={() => {
          // Optional: track close if needed
        }}
        onAdLeftApplication={handleClick} // Triggered when user leaves app via ad
      />
    </div>
  );
};

export default AdComponent;