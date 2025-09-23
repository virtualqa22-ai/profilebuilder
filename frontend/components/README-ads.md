# AdComponent

## Overview

The `AdComponent` is a React component that integrates Google AdSense (AdMob) for displaying advertisements in the CareerVerve application. It implements privacy-focused metrics tracking, lazy loading for performance optimization, and graceful adblock detection with user-friendly fallbacks.

## Features

- **Privacy Protection**: User IDs are anonymized using SHA-256 hashing before metrics tracking
- **Lazy Loading**: Uses IntersectionObserver to load ads only when visible, improving page performance
- **Adblock Detection**: Detects adblockers and displays appropriate fallback messages
- **Metrics Tracking**: Tracks impressions and clicks with backend API integration
- **Accessibility**: Includes proper ARIA labels and semantic HTML
- **Responsive Design**: Supports different ad sizes (banner, rectangle)
- **Error Handling**: Graceful degradation when ads fail to load

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `adUnitId` | `string` | Unique identifier for the advertisement unit (AdSense slot ID) |
| `size` | `string` | Size of the ad ('banner' for 728x90, 'rectangle' for 300x250) |

### Optional Props

| Prop | Type | Description |
|------|------|-------------|
| `onImpression` | `() => void` | Callback function called when ad impression is tracked |
| `onClick` | `() => void` | Callback function called when ad is clicked |

## Usage Examples

### Basic Banner Ad

```tsx
import AdComponent from '../components/AdComponent';

function MyPage() {
  return (
    <div>
      <h1>Welcome to CareerVerve</h1>
      <AdComponent
        adUnitId="ca-pub-1234567890123456/banner-ad-1"
        size="banner"
      />
      <p>Content continues here...</p>
    </div>
  );
}
```

### Rectangle Ad with Callbacks

```tsx
import AdComponent from '../components/AdComponent';

function ResumeBuilder() {
  const handleAdImpression = () => {
    console.log('Ad impression tracked');
  };

  const handleAdClick = () => {
    console.log('Ad clicked');
  };

  return (
    <div>
      <AdComponent
        adUnitId="ca-pub-1234567890123456/rectangle-ad-1"
        size="rectangle"
        onImpression={handleAdImpression}
        onClick={handleAdClick}
      />
    </div>
  );
}
```

### Conditional Rendering Based on Configuration

```tsx
import { useEffect, useState } from 'react';
import AdComponent from '../components/AdComponent';

function DynamicAds() {
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [maxAds, setMaxAds] = useState(0);

  useEffect(() => {
    // Fetch ad configuration from API
    fetch('/api/ads/config')
      .then(res => res.json())
      .then(data => {
        setAdsEnabled(data.data.adsEnabled);
        setMaxAds(data.data.maxAdsPerPage);
      });
  }, []);

  if (!adsEnabled) {
    return null; // Don't render ads if disabled
  }

  return (
    <div>
      {/* Render up to maxAds components */}
      {Array.from({ length: Math.min(maxAds, 3) }, (_, i) => (
        <AdComponent
          key={i}
          adUnitId={`ca-pub-1234567890123456/ad-${i + 1}`}
          size={i % 2 === 0 ? 'banner' : 'rectangle'}
        />
      ))}
    </div>
  );
}
```

## Dependencies

### Required Dependencies

- `react`: ^18.0.0 or higher
- `react-adsense`: ^1.4.0 or higher (Google AdSense integration)
- `fuckadblock`: ^3.2.1 or higher (Adblock detection)

### Environment Variables

- `NEXT_PUBLIC_ADMOB_PUBLISHER_ID`: Your AdMob publisher ID (required for AdSense integration)

## Implementation Details

### User ID Generation

The component generates a unique user identifier for tracking purposes:

```typescript
const [userId] = useState(() => {
  const storedId = sessionStorage.getItem('adUserId');
  if (storedId) return storedId;
  const newId = crypto.randomUUID();
  sessionStorage.setItem('adUserId', newId);
  return newId;
});
```

- Uses `sessionStorage` for persistence within the session
- Falls back to `crypto.randomUUID()` for unique ID generation
- IDs are anonymized via SHA-256 hashing before backend storage

### Metrics Tracking

Ad interactions are tracked via POST requests to `/api/ads/metrics`:

```typescript
const trackMetric = async (eventType: string, metadata: Record<string, any> = {}) => {
  try {
    const response = await fetch('/api/ads/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        ad_id: adUnitId,
        event_type: eventType,
        metadata,
      }),
    });
    // Handle response...
  } catch (error) {
    console.warn('Error tracking ad metric:', error);
  }
};
```

### Lazy Loading Mechanism

Uses `IntersectionObserver` for performance optimization:

```typescript
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      });
    },
    { threshold: 0.1 }
  );

  if (adRef.current) {
    observer.observe(adRef.current);
  }

  return () => observer.disconnect();
}, []);
```

### Adblock Detection

Integrates `fuckadblock` library for adblock detection:

```typescript
useEffect(() => {
  fuckAdBlock.onDetected(() => {
    setIsAdblockDetected(true);
    // Track adblock event
  });
}, []);
```

## Limitations

### Browser Compatibility

- Requires modern browsers with `IntersectionObserver` support (IE 11+)
- `crypto.randomUUID()` requires secure contexts (HTTPS)
- AdSense may have additional browser requirements

### Ad Serving Limitations

- Ad display depends on AdSense account status and ad inventory
- Ads may not display in development environments
- Geographic restrictions may apply based on AdSense policies

### Performance Considerations

- Lazy loading adds small delay to ad visibility
- Metrics tracking requires network requests
- Adblock detection may impact initial load time

### Privacy Limitations

- Session-based user ID may not persist across devices
- Anonymization prevents user-level analytics
- No cross-site tracking capabilities

## Ethical Considerations

### Privacy Protection

- **Data Minimization**: Only collects essential metrics (impressions, clicks)
- **Anonymization**: User IDs are hashed with salt before storage
- **No Personal Data**: Does not collect PII or browsing history
- **Transparent Tracking**: Users are informed about metrics collection

### User Experience

- **Non-Intrusive**: Lazy loading prevents layout shifts and performance impact
- **Graceful Degradation**: Adblock users see helpful messages instead of broken layouts
- **Accessibility**: Proper ARIA labels and semantic HTML
- **Consent Respect**: Ads only load when globally enabled

### Fairness and Transparency

- **No Discriminatory Targeting**: Ads served based on context, not user characteristics
- **Clear Communication**: Adblock messages educate users about ad-supported model
- **Performance Priority**: Ads never block critical application functionality

## Testing

### Unit Tests

```typescript
import { render, screen } from '@testing-library/react';
import AdComponent from './AdComponent';

describe('AdComponent', () => {
  it('renders placeholder initially', () => {
    render(<AdComponent adUnitId="test-id" size="banner" />);
    expect(screen.getByLabelText('Advertisement loading')).toBeInTheDocument();
  });

  it('calls onImpression callback', () => {
    const mockCallback = jest.fn();
    render(
      <AdComponent
        adUnitId="test-id"
        size="banner"
        onImpression={mockCallback}
      />
    );
    // Trigger intersection observer...
    expect(mockCallback).toHaveBeenCalled();
  });
});
```

### Integration Tests

- Test metrics API integration
- Verify adblock detection behavior
- Check lazy loading functionality
- Validate accessibility compliance

## Troubleshooting

### Common Issues

1. **Ads not loading**: Check `NEXT_PUBLIC_ADMOB_PUBLISHER_ID` environment variable
2. **Metrics not tracking**: Verify `/api/ads/metrics` endpoint is accessible
3. **Adblock detection not working**: Ensure `fuckadblock` library is properly loaded
4. **Performance issues**: Check IntersectionObserver browser support

### Debug Mode

Enable debug logging by setting `localStorage.debug = 'AdComponent'` in browser console.

## Related Documentation

- [API Reference - Ads](../docs/api-reference.md#ads)
- [Architecture Overview - Ad Service](../docs/architecture-overview.md)
- [Google AdSense Documentation](https://support.google.com/adsense)
- [AdMob Integration Guide](https://developers.google.com/admob)