import { Router } from 'express';
import { SiteContent } from '../models/SiteContent.js';
import { SiteSettings } from '../models/SiteSettings.js';
import { Service } from '../models/Service.js';
import { Portfolio } from '../models/Portfolio.js';
import { BlogPost } from '../models/BlogPost.js';
import { Testimonial } from '../models/Testimonial.js';
import { Faq } from '../models/Faq.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { isDatabaseConnected, memoryStore } from '../utils/memory-store.js';

const router = Router();

// 1. Homepage Content
router.get('/homepage', async (req, res, next) => {
  try {
    let content = null;
    if (isDatabaseConnected()) {
      const record = await SiteContent.findOne({ key: 'homepage' });
      content = record?.data;
    } else {
      content = memoryStore.getContent('homepage');
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Homepage content retrieved',
      data: { content },
    });
  } catch (err) {
    next(err);
  }
});

// 2. Navigation Content
router.get('/navigation', async (req, res, next) => {
  try {
    let navigation = null;
    if (isDatabaseConnected()) {
      const record = await SiteContent.findOne({ key: 'navigation' });
      navigation = record?.data;
    } else {
      navigation = memoryStore.getContent('navigation');
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Navigation retrieved',
      data: { navigation },
    });
  } catch (err) {
    next(err);
  }
});

// 3. Footer Content
router.get('/footer', async (req, res, next) => {
  try {
    let footer = null;
    if (isDatabaseConnected()) {
      const record = await SiteContent.findOne({ key: 'footer' });
      footer = record?.data;
    } else {
      footer = memoryStore.getContent('footer');
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Footer content retrieved',
      data: { footer },
    });
  } catch (err) {
    next(err);
  }
});

// 4. Public Services
router.get('/services', async (req, res, next) => {
  try {
    let services = [];
    if (isDatabaseConnected()) {
      services = await Service.find({ status: 'active', visibility: { $ne: 'hidden' } }).sort({ order: 1 });
    } else {
      services = memoryStore.getAllServices().filter((s) => s.status === 'active' && s.visibility !== 'hidden');
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Published services retrieved',
      data: { services, total: services.length },
    });
  } catch (err) {
    next(err);
  }
});

// 5. Public Portfolio
router.get('/portfolio', async (req, res, next) => {
  try {
    let portfolio = [];
    if (isDatabaseConnected()) {
      portfolio = await Portfolio.find({ status: 'published' }).sort({ order: 1 });
    } else {
      portfolio = memoryStore.getAllPortfolio().filter((p) => p.status === 'published');
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Portfolio items retrieved',
      data: { portfolio, total: portfolio.length },
    });
  } catch (err) {
    next(err);
  }
});

// 6. Public FAQs
router.get('/faqs', async (req, res, next) => {
  try {
    let faqs = [];
    if (isDatabaseConnected()) {
      faqs = await Faq.find({ status: 'published' }).sort({ order: 1 });
    } else {
      faqs = memoryStore.getAllFaqs().filter((f) => f.status === 'published');
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'FAQs retrieved',
      data: { faqs, total: faqs.length },
    });
  } catch (err) {
    next(err);
  }
});

// 7. Public Testimonials
router.get('/testimonials', async (req, res, next) => {
  try {
    let testimonials = [];
    if (isDatabaseConnected()) {
      testimonials = await Testimonial.find({ status: 'published' }).sort({ order: 1 });
    } else {
      testimonials = memoryStore.getAllTestimonials().filter((t) => t.status === 'published');
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Testimonials retrieved',
      data: { testimonials, total: testimonials.length },
    });
  } catch (err) {
    next(err);
  }
});

// 8. Public Blog
router.get('/blog', async (req, res, next) => {
  try {
    let posts = [];
    if (isDatabaseConnected()) {
      posts = await BlogPost.find({ status: 'published' }).sort({ createdAt: -1 });
    } else {
      posts = memoryStore.getAllBlogPosts().filter((p) => p.status === 'published');
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Blog posts retrieved',
      data: { posts, total: posts.length },
    });
  } catch (err) {
    next(err);
  }
});

// 9. Public Settings (brand info, business availability)
router.get('/settings', async (req, res, next) => {
  try {
    let settings = null;
    if (isDatabaseConnected()) {
      settings = await SiteSettings.findOne({ key: 'global_settings' });
    } else {
      settings = memoryStore.getSettings();
    }

    const publicSettings = {
      siteName: settings?.general?.siteName || 'Pravyuk',
      tagline: settings?.general?.tagline || 'Your Vision. Our Build.',
      brandPositioning: settings?.general?.brandPositioning || '',
      logoUrl: settings?.general?.logoUrl || '/assets/images/pravyuk-logo-horizontal.svg',
      contact: settings?.contact || {},
      business: settings?.business || { isAcceptingInquiries: true, pricingVisible: true },
      seo: settings?.seo || {},
    };

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Public site settings retrieved',
      data: { settings: publicSettings },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
