/**
 * Pravyuk Privacy-Conscious Analytics Event Helper
 * Dispatches key conversion events without transmitting sensitive customer details.
 */
(function () {
  'use strict';

  const analytics = {
    /**
     * Dispatch generic event to GA4 / Plausible if configured
     */
    track: function (eventName, eventParams) {
      eventParams = eventParams || {};
      
      // Google Analytics 4 (gtag.js)
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, eventParams);
      }

      // Plausible Analytics
      if (typeof window.plausible === 'function') {
        window.plausible(eventName, { props: eventParams });
      }
    },

    /**
     * Track Project Inquiry Submission
     */
    trackInquirySubmitted: function (service, timelineBucket) {
      this.track('inquiry_submitted', {
        service_category: service || 'general',
        target_timeline: timelineBucket || 'standard'
      });
    },

    /**
     * Track Quote Acceptance
     */
    trackQuoteAccepted: function (quoteReference) {
      this.track('quote_accepted', {
        quote_ref: quoteReference || 'direct'
      });
    },

    /**
     * Track Razorpay Checkout Initiation
     */
    trackCheckoutInitiated: function (orderType, amountInInr) {
      this.track('checkout_initiated', {
        order_type: orderType,
        value: amountInInr,
        currency: 'INR'
      });
    },

    /**
     * Track Successful Payment Capture
     */
    trackPaymentCompleted: function (orderReference, amountInInr) {
      this.track('purchase', {
        transaction_id: orderReference,
        value: amountInInr,
        currency: 'INR'
      });
    }
  };

  window.pravyukAnalytics = analytics;
  // Backward compatibility alias
  window.xevruniqAnalytics = analytics;
})();
