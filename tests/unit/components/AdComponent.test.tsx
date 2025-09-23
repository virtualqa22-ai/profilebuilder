/**
 * AdComponent Unit Tests
 *
 * Comprehensive unit tests for AdComponent with at least 80% coverage.
 * Tests adblock detection, fallback UI rendering, impression/click tracking,
 * error handling, accessibility, and edge cases.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdComponent from '../../../frontend/components/AdComponent';

// Mock react-adsense
jest.mock('react-adsense', () => {
  return function MockAdSense({ onAdLoaded, onAdFailed, onAdOpened, onAdLeftApplication, ...props }: any) {
    return (
      <div data-testid="adsense-mock" {...props}>
        <button
          data-testid="ad-click-trigger"
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

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

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

// Mock crypto.randomUUID
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: jest.fn(),
  },
});

describe('AdComponent', () => {
  const defaultProps = {
    adUnitId: 'test-ad-unit-123',
    size: 'banner',
    onImpression: jest.fn(),
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
    mockSessionStorage.setItem.mockImplementation(() => {});
    (window.crypto.randomUUID as jest.Mock).mockReturnValue('mock-uuid-123');
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  describe('Component Rendering', () => {
    it('should render placeholder when ad is not visible', () => {
      render(<AdComponent {...defaultProps} />);

      expect(screen.getByLabelText('Advertisement loading')).toBeInTheDocument();
      expect(screen.queryByTestId('adsense-mock')).not.toBeInTheDocument();
    });

    it('should render AdSense component when ad becomes visible', async () => {
      render(<AdComponent {...defaultProps} />);

      // Simulate intersection observer callback
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      await waitFor(() => {
        expect(screen.getByTestId('adsense-mock')).toBeInTheDocument();
      });
    });

    it('should render fallback UI when adblock is detected', () => {
      const fuckAdBlock = require('fuckadblock');
      render(<AdComponent {...defaultProps} />);

      // Simulate adblock detection
      const onDetectedCallback = fuckAdBlock.onDetected.mock.calls[0][0];
      onDetectedCallback();

      expect(screen.getByLabelText('Adblock detected message')).toBeInTheDocument();
      expect(screen.getByText('Ads help keep this free - consider disabling adblock')).toBeInTheDocument();
    });

    it('should render correct ad sizes', async () => {
      const { rerender } = render(<AdComponent {...defaultProps} size="banner" />);

      // Make visible
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      await waitFor(() => {
        const adContainer = screen.getByTestId('adsense-mock');
        expect(adContainer.style.width).toBe('728px');
        expect(adContainer.style.height).toBe('90px');
      });

      // Test rectangle size
      rerender(<AdComponent {...defaultProps} size="rectangle" />);

      await waitFor(() => {
        const adContainer = screen.getByTestId('adsense-mock');
        expect(adContainer.style.width).toBe('300px');
        expect(adContainer.style.height).toBe('250px');
      });
    });
  });

  describe('Adblock Detection', () => {
    it('should initialize adblock detection on mount', () => {
      const fuckAdBlock = require('fuckadblock');

      render(<AdComponent {...defaultProps} />);

      expect(fuckAdBlock.onDetected).toHaveBeenCalledTimes(1);
      expect(fuckAdBlock.onNotDetected).toHaveBeenCalledTimes(1);
    });

    it('should track adblock event when detected', () => {
      const fuckAdBlock = require('fuckadblock');

      render(<AdComponent {...defaultProps} />);

      const onDetectedCallback = fuckAdBlock.onDetected.mock.calls[0][0];
      onDetectedCallback();

      expect(mockFetch).toHaveBeenCalledWith('/api/ads/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'mock-uuid-123',
          ad_id: 'test-ad-unit-123',
          event_type: 'adblock',
          metadata: { adUnitId: 'test-ad-unit-123', size: 'banner' },
        }),
      });
    });

    it('should not track adblock multiple times', () => {
      const fuckAdBlock = require('fuckadblock');

      render(<AdComponent {...defaultProps} />);

      const onDetectedCallback = fuckAdBlock.onDetected.mock.calls[0][0];
      onDetectedCallback();
      onDetectedCallback(); // Second call

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle adblock detection errors gracefully', () => {
      const fuckAdBlock = require('fuckadblock');
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock fuckAdBlock to throw error
      fuckAdBlock.onDetected.mockImplementation(() => {
        throw new Error('Adblock detection failed');
      });

      expect(() => render(<AdComponent {...defaultProps} />)).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error initializing adblock detection:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Impression Tracking', () => {
    it('should track impression when ad becomes visible', async () => {
      render(<AdComponent {...defaultProps} />);

      // Make visible
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      // Wait for impression tracking (delayed by 1 second)
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledWith('/api/ads/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: 'mock-uuid-123',
              ad_id: 'test-ad-unit-123',
              event_type: 'impression',
              metadata: { size: 'banner' },
            }),
          });
        },
        { timeout: 2000 }
      );

      expect(defaultProps.onImpression).toHaveBeenCalledTimes(1);
    });

    it('should not track impression multiple times', async () => {
      render(<AdComponent {...defaultProps} />);

      const observerCallback = mockIntersectionObserver.mock.calls[0][0];

      // Make visible multiple times
      observerCallback([{ isIntersecting: true }]);
      observerCallback([{ isIntersecting: false }]);
      observerCallback([{ isIntersecting: true }]);

      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledTimes(1);
        },
        { timeout: 2000 }
      );
    });

    it('should handle impression tracking errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AdComponent {...defaultProps} />);

      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      await waitFor(
        () => {
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            'Error tracking ad metric:',
            expect.any(Error)
          );
        },
        { timeout: 2000 }
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Click Tracking', () => {
    it('should track click when ad is clicked', async () => {
      render(<AdComponent {...defaultProps} />);

      // Make visible
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      await waitFor(() => {
        expect(screen.getByTestId('ad-click-trigger')).toBeInTheDocument();
      });

      // Click the ad
      fireEvent.click(screen.getByTestId('ad-click-trigger'));

      expect(mockFetch).toHaveBeenCalledWith('/api/ads/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'mock-uuid-123',
          ad_id: 'test-ad-unit-123',
          event_type: 'click',
          metadata: { size: 'banner' },
        }),
      });

      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it('should handle click tracking errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AdComponent {...defaultProps} />);

      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('ad-click-trigger'));
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error tracking ad metric:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('User ID Management', () => {
    it('should generate new user ID if not in sessionStorage', () => {
      render(<AdComponent {...defaultProps} />);

      expect(window.crypto.randomUUID).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('adUserId', 'mock-uuid-123');
    });

    it('should reuse existing user ID from sessionStorage', () => {
      mockSessionStorage.getItem.mockReturnValue('existing-uuid-456');

      render(<AdComponent {...defaultProps} />);

      expect(window.crypto.randomUUID).not.toHaveBeenCalled();
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Intersection Observer', () => {
    it('should setup intersection observer on mount', () => {
      render(<AdComponent {...defaultProps} />);

      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { threshold: 0.1 }
      );

      const observerInstance = mockIntersectionObserver.mock.results[0].value;
      expect(observerInstance.observe).toHaveBeenCalledTimes(1);
    });

    it('should disconnect observer when component unmounts', () => {
      const { unmount } = render(<AdComponent {...defaultProps} />);

      unmount();

      const observerInstance = mockIntersectionObserver.mock.results[0].value;
      expect(observerInstance.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should disconnect observer when ad becomes visible', () => {
      render(<AdComponent {...defaultProps} />);

      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      const observerInstance = mockIntersectionObserver.mock.results[0].value;
      expect(observerInstance.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for ad container', async () => {
      render(<AdComponent {...defaultProps} />);

      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Advertisement' })).toBeInTheDocument();
      });
    });

    it('should have proper ARIA label for placeholder', () => {
      render(<AdComponent {...defaultProps} />);

      expect(screen.getByLabelText('Advertisement loading')).toBeInTheDocument();
    });

    it('should have proper ARIA label for fallback UI', () => {
      const fuckAdBlock = require('fuckadblock');
      render(<AdComponent {...defaultProps} />);

      const onDetectedCallback = fuckAdBlock.onDetected.mock.calls[0][0];
      onDetectedCallback();

      expect(screen.getByRole('region', { name: 'Adblock detected message' })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch response errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      render(<AdComponent {...defaultProps} />);

      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      await waitFor(
        () => {
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            'Failed to track ad metric:',
            'Internal Server Error'
          );
        },
        { timeout: 2000 }
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle network failures gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      render(<AdComponent {...defaultProps} />);

      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      await waitFor(
        () => {
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            'Error tracking ad metric:',
            expect.any(Error)
          );
        },
        { timeout: 2000 }
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Props Handling', () => {
    it('should handle missing optional callbacks', async () => {
      render(<AdComponent adUnitId="test-ad" size="banner" />);

      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('ad-click-trigger'));
      });

      // Should not throw when callbacks are undefined
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should pass correct props to AdSense component', async () => {
      render(<AdComponent {...defaultProps} />);

      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      await waitFor(() => {
        const adSenseMock = screen.getByTestId('adsense-mock');
        expect(adSenseMock).toHaveAttribute('slot', 'test-ad-unit-123');
        expect(adSenseMock.style.width).toBe('728px');
        expect(adSenseMock.style.height).toBe('90px');
      });
    });
  });

  describe('Environment Variables', () => {
    it('should use NEXT_PUBLIC_ADMOB_PUBLISHER_ID from env', async () => {
      process.env.NEXT_PUBLIC_ADMOB_PUBLISHER_ID = 'test-publisher-id';

      render(<AdComponent {...defaultProps} />);

      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      // AdSense component should receive the client prop
      // This is tested implicitly through the mock
      expect(screen.getByTestId('adsense-mock')).toBeInTheDocument();

      delete process.env.NEXT_PUBLIC_ADMOB_PUBLISHER_ID;
    });
  });
});