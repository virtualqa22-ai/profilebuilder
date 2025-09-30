import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdComponent from '../../../frontend/components/AdComponent';

// Mock react-adsense
jest.mock('react-adsense', () => {
  return function MockAdSense({ onAdLoaded, onAdFailed, onAdOpened, onAdClosed, onAdLeftApplication, ...props }: any) {
    // Simulate ad failure on mount
    React.useEffect(() => {
      onAdFailed?.();
    }, []);

    return (
      <div data-testid="adsense-mock" {...props}>
        <button
          data-testid="ad-opened-btn"
          onClick={() => {
            onAdOpened?.();
            onAdLeftApplication?.();
          }}
        >
          Mock Ad
        </button>
      </div>
    );
  };
});

// Mock fuckadblock
jest.mock('fuckadblock', () => ({
  onDetected: jest.fn(),
  onNotDetected: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
const mockRandomUUID = jest.fn();
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: mockRandomUUID,
  },
});

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
});
global.IntersectionObserver = mockIntersectionObserver;

// Mock process.env
process.env.NEXT_PUBLIC_ADMOB_PUBLISHER_ID = 'test-publisher-id';

describe('AdComponent', () => {
  const defaultProps = {
    adUnitId: 'test-ad-unit',
    size: 'rectangle',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockFetch.mockResolvedValue({ ok: true });
    mockRandomUUID.mockReturnValue('test-uuid');
    mockSessionStorage.getItem.mockReturnValue(null);
    mockSessionStorage.setItem.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders placeholder when not visible', () => {
      render(<AdComponent {...defaultProps} />);
      expect(screen.getByLabelText('Advertisement loading')).toBeInTheDocument();
      expect(screen.queryByTestId('adsense-mock')).not.toBeInTheDocument();
    });

    it('renders AdSense when visible', () => {
      render(<AdComponent {...defaultProps} />);

      // Trigger visibility
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      expect(screen.getByTestId('adsense-mock')).toBeInTheDocument();
    });

    it('renders adblock fallback when adblock detected', () => {
      const fuckAdBlock = require('fuckadblock');
      render(<AdComponent {...defaultProps} />);

      // Trigger adblock detection
      const detectedCallback = fuckAdBlock.onDetected.mock.calls[0][0];
      act(() => {
        detectedCallback();
      });

      expect(screen.getByLabelText('Adblock detected message')).toBeInTheDocument();
      expect(screen.getByText('Ads help keep this free - consider disabling adblock')).toBeInTheDocument();
    });
  });

  describe('Size Variations', () => {
    it('applies banner styles for size="banner"', () => {
      render(<AdComponent {...defaultProps} size="banner" />);

      // Trigger visibility
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      const adContainer = screen.getByTestId('adsense-mock');
      expect(adContainer).toHaveStyle({ width: '728px', height: '90px' });
    });

    it('applies rectangle styles for size="rectangle"', () => {
      render(<AdComponent {...defaultProps} size="rectangle" />);

      // Trigger visibility
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      const adContainer = screen.getByTestId('adsense-mock');
      expect(adContainer).toHaveStyle({ width: '300px', height: '250px' });
    });

    it('applies fallback banner height for adblock and size="banner"', () => {
      const fuckAdBlock = require('fuckadblock');
      render(<AdComponent {...defaultProps} size="banner" />);

      // Trigger adblock detection
      const detectedCallback = fuckAdBlock.onDetected.mock.calls[0][0];
      act(() => {
        detectedCallback();
      });

      const fallback = screen.getByLabelText('Adblock detected message');
      expect(fallback).toHaveStyle({ minHeight: '90px' });
    });

    it('applies fallback rectangle height for adblock and size="rectangle"', () => {
      const fuckAdBlock = require('fuckadblock');
      render(<AdComponent {...defaultProps} size="rectangle" />);

      // Trigger adblock detection
      const detectedCallback = fuckAdBlock.onDetected.mock.calls[0][0];
      act(() => {
        detectedCallback();
      });

      const fallback = screen.getByLabelText('Adblock detected message');
      expect(fallback).toHaveStyle({ minHeight: '250px' });
    });
  });

  describe('Callback Functions', () => {
    it('calls onImpression when ad becomes visible', () => {
      const mockOnImpression = jest.fn();
      render(<AdComponent {...defaultProps} onImpression={mockOnImpression} />);

      // Trigger visibility
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockOnImpression).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when ad is clicked', () => {
      const mockOnClick = jest.fn();
      render(<AdComponent {...defaultProps} onClick={mockOnClick} />);

      // Trigger visibility
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      // Click the ad
      act(() => {
        screen.getByTestId('ad-opened-btn').click();
      });

      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });

    it('does not call onImpression multiple times', () => {
      const mockOnImpression = jest.fn();
      render(<AdComponent {...defaultProps} onImpression={mockOnImpression} />);

      // Trigger visibility multiple times
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
        observerCallback([{ isIntersecting: true }]);
      });

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockOnImpression).toHaveBeenCalledTimes(1);
    });
  });

  describe('Track Metric Functionality', () => {
    it('tracks impression metric on visibility', () => {
      render(<AdComponent {...defaultProps} />);

      // Trigger visibility
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/ads/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'test-uuid',
          ad_id: 'test-ad-unit',
          event_type: 'impression',
          metadata: { size: 'rectangle' },
        }),
      });
    });

    it('tracks click metric on ad click', () => {
      render(<AdComponent {...defaultProps} />);

      // Trigger visibility
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      // Click the ad
      act(() => {
        screen.getByTestId('ad-opened-btn').click();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/ads/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'test-uuid',
          ad_id: 'test-ad-unit',
          event_type: 'click',
          metadata: { size: 'rectangle' },
        }),
      });
    });

    it('tracks adblock metric when adblock detected', () => {
      const fuckAdBlock = require('fuckadblock');
      render(<AdComponent {...defaultProps} />);

      // Trigger adblock detection
      const detectedCallback = fuckAdBlock.onDetected.mock.calls[0][0];
      act(() => {
        detectedCallback();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/ads/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'test-uuid',
          ad_id: 'test-ad-unit',
          event_type: 'adblock',
          metadata: { adUnitId: 'test-ad-unit', size: 'rectangle' },
        }),
      });
    });

    it('handles trackMetric fetch failure gracefully', () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      render(<AdComponent {...defaultProps} />);

      // Trigger visibility
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('Error tracking ad metric:', expect.any(Error));
      consoleWarnSpy.mockRestore();
    });

    it('handles trackMetric non-ok response gracefully', () => {
      mockFetch.mockResolvedValueOnce({ ok: false, statusText: 'Bad Request' });
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      render(<AdComponent {...defaultProps} />);

      // Trigger visibility
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to track ad metric:', 'Bad Request');
      consoleWarnSpy.mockRestore();
    });
  });

  describe('IntersectionObserver Behavior', () => {
    it('sets up IntersectionObserver on mount', () => {
      render(<AdComponent {...defaultProps} />);
      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { threshold: 0.1 }
      );
    });

    it('observes the ad ref element', () => {
      render(<AdComponent {...defaultProps} />);
      const observerInstance = mockIntersectionObserver.mock.results[0].value;
      expect(observerInstance.observe).toHaveBeenCalled();
    });

    it('disconnects observer on unmount', () => {
      const { unmount } = render(<AdComponent {...defaultProps} />);
      const observerInstance = mockIntersectionObserver.mock.results[0].value;
      unmount();
      expect(observerInstance.disconnect).toHaveBeenCalled();
    });

    it('does not set visible if not intersecting', () => {
      render(<AdComponent {...defaultProps} />);
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: false }]);
      });
      expect(screen.getByLabelText('Advertisement loading')).toBeInTheDocument();
    });
  });

  describe('User ID Generation', () => {
    it('generates new userId when none in sessionStorage', () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      render(<AdComponent {...defaultProps} />);
      expect(mockRandomUUID).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('adUserId', 'test-uuid');
    });

    it('uses existing userId from sessionStorage', () => {
      mockSessionStorage.getItem.mockReturnValue('existing-uuid');
      render(<AdComponent {...defaultProps} />);
      expect(mockRandomUUID).not.toHaveBeenCalled();
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Adblock Detection', () => {
    it('sets up adblock detection on mount', () => {
      const fuckAdBlock = require('fuckadblock');
      render(<AdComponent {...defaultProps} />);
      expect(fuckAdBlock.onDetected).toHaveBeenCalledWith(expect.any(Function));
      expect(fuckAdBlock.onNotDetected).toHaveBeenCalledWith(expect.any(Function));
    });

    it('only tracks adblock once even if detected multiple times', () => {
      const fuckAdBlock = require('fuckadblock');
      render(<AdComponent {...defaultProps} />);

      const detectedCallback = fuckAdBlock.onDetected.mock.calls[0][0];
      act(() => {
        detectedCallback();
        detectedCallback();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('handles adblock detection error gracefully', () => {
      const fuckAdBlock = require('fuckadblock');
      fuckAdBlock.onDetected.mockImplementation(() => {
        throw new Error('Adblock error');
      });
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      render(<AdComponent {...defaultProps} />);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Error initializing adblock detection:', expect.any(Error));
      consoleWarnSpy.mockRestore();
    });
  });
});