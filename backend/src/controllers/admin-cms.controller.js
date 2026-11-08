import fs from 'node:fs';
import path from 'node:path';
import { SiteContent } from '../models/SiteContent.js';
import { SiteSettings } from '../models/SiteSettings.js';
import { Service } from '../models/Service.js';
import { Portfolio } from '../models/Portfolio.js';
import { BlogPost } from '../models/BlogPost.js';
import { Testimonial } from '../models/Testimonial.js';
import { Faq } from '../models/Faq.js';
import { Media } from '../models/Media.js';
import { User } from '../models/User.js';
import { ProjectInquiry } from '../models/ProjectInquiry.js';
import { Quote } from '../models/Quote.js';
import { Project } from '../models/Project.js';
import { Milestone } from '../models/Milestone.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Refund } from '../models/Refund.js';
import { AuditLog } from '../models/AuditLog.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { recordAuditLog } from '../utils/audit-logger.js';
import { isDatabaseConnected, memoryStore } from '../utils/memory-store.js';
import { hashPassword, verifyPassword } from '../utils/security.js';
import { generateReferenceId } from '../utils/generate-reference.js';

// ==========================================
// 1. WEBSITE CONTENT MANAGEMENT (CMS)
// ==========================================

export const handleGetContent = async (req, res, next) => {
  try {
    const { section } = req.params;
    let content = null;

    if (isDatabaseConnected()) {
      const record = await SiteContent.findOne({ key: section });
      content = record ? record.data : null;
    } else {
      content = memoryStore.getContent(section);
    }

    if (!content) {
      return sendError(res, { statusCode: 404, message: `CMS section '${section}' not found` });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: `Content for '${section}' retrieved successfully`,
      data: { section, content },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateContent = async (req, res, next) => {
  try {
    const { section } = req.params;
    const { data } = req.body;

    if (!data || typeof data !== 'object') {
      return sendError(res, { statusCode: 400, message: 'Valid content data object is required' });
    }

    let updatedContent = null;
    const actorEmail = req.user?.email || 'admin@pravyuk.com';

    if (isDatabaseConnected()) {
      const record = await SiteContent.findOneAndUpdate(
        { key: section },
        { data, lastUpdatedBy: actorEmail },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      updatedContent = record.data;
    } else {
      const saved = memoryStore.saveContent(section, data, actorEmail);
      updatedContent = saved.data;
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'content.update',
      resourceType: 'site_content',
      resourceId: section,
      details: { section, keysUpdated: Object.keys(data) },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `CMS section '${section}' updated successfully`,
      data: { section, content: updatedContent },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 2. SERVICES & PACKAGES MANAGEMENT
// ==========================================

export const handleGetServicesList = async (req, res, next) => {
  try {
    let services = [];
    if (isDatabaseConnected()) {
      services = await Service.find().sort({ order: 1, createdAt: -1 });
    } else {
      services = memoryStore.getAllServices();
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Services retrieved successfully',
      data: { services, total: services.length },
    });
  } catch (err) {
    next(err);
  }
};

export const handleCreateService = async (req, res, next) => {
  try {
    const {
      name,
      slug,
      shortDescription,
      fullDescription,
      startingPrice,
      estimatedDelivery,
      features,
      deliverables,
      category,
      isPopular,
      isFeatured,
      visibility,
      status,
      seoTitle,
      seoDescription,
      faqs,
      image,
    } = req.body;

    if (!name || !startingPrice) {
      return sendError(res, { statusCode: 400, message: 'Service name and starting price are required' });
    }

    const calculatedSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const serviceData = {
      name: name.trim(),
      slug: calculatedSlug,
      shortDescription: shortDescription || '',
      fullDescription: fullDescription || '',
      startingPrice: Number(startingPrice),
      currency: 'INR',
      estimatedDelivery: estimatedDelivery || '3-7 business days',
      features: Array.isArray(features) ? features : [],
      deliverables: Array.isArray(deliverables) ? deliverables : [],
      category: category || 'Websites',
      isPopular: Boolean(isPopular),
      isFeatured: Boolean(isFeatured),
      visibility: visibility || 'public',
      status: status || 'active',
      seoTitle: seoTitle || `${name} | Pravyuk`,
      seoDescription: seoDescription || shortDescription || '',
      faqs: Array.isArray(faqs) ? faqs : [],
      image: image || '',
    };

    let service = null;
    if (isDatabaseConnected()) {
      service = await Service.create(serviceData);
    } else {
      service = memoryStore.saveService(serviceData);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'service.create',
      resourceType: 'service',
      resourceId: service._id || service.id,
      details: { name: service.name, startingPrice: service.startingPrice },
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: `Service '${service.name}' created successfully`,
      data: { service },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    let service = null;

    if (isDatabaseConnected()) {
      service = await Service.findById(id);
      if (!service) service = await Service.findOne({ slug: id.toLowerCase() });
      if (!service) return sendError(res, { statusCode: 404, message: 'Service not found' });

      Object.assign(service, req.body);
      if (req.body.startingPrice) service.startingPrice = Number(req.body.startingPrice);
      await service.save();
    } else {
      service = memoryStore.getServiceById(id) || memoryStore.getServiceBySlug(id);
      if (!service) return sendError(res, { statusCode: 404, message: 'Service not found' });

      Object.assign(service, req.body);
      if (req.body.startingPrice) service.startingPrice = Number(req.body.startingPrice);
      memoryStore.saveService(service);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'service.update',
      resourceType: 'service',
      resourceId: id,
      details: { updatedFields: Object.keys(req.body) },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Service '${service.name}' updated successfully`,
      data: { service },
    });
  } catch (err) {
    next(err);
  }
};

export const handleDeleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    let deletedName = '';

    if (isDatabaseConnected()) {
      const service = await Service.findById(id);
      if (!service) return sendError(res, { statusCode: 404, message: 'Service not found' });
      deletedName = service.name;
      await Service.findByIdAndDelete(id);
    } else {
      const service = memoryStore.getServiceById(id) || memoryStore.getServiceBySlug(id);
      if (!service) return sendError(res, { statusCode: 404, message: 'Service not found' });
      deletedName = service.name;
      memoryStore.deleteService(service.id || service._id);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'service.delete',
      resourceType: 'service',
      resourceId: id,
      details: { name: deletedName },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Service '${deletedName}' deleted successfully`,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 3. PORTFOLIO SHOWCASE MANAGEMENT
// ==========================================

export const handleGetPortfolioList = async (req, res, next) => {
  try {
    let portfolio = [];
    if (isDatabaseConnected()) {
      portfolio = await Portfolio.find().sort({ order: 1, createdAt: -1 });
    } else {
      portfolio = memoryStore.getAllPortfolio();
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Portfolio items retrieved',
      data: { portfolio, total: portfolio.length },
    });
  } catch (err) {
    next(err);
  }
};

export const handleCreatePortfolioItem = async (req, res, next) => {
  try {
    const {
      title,
      slug,
      category,
      clientName,
      tagline,
      description,
      techStack,
      thumbnail,
      liveUrl,
      caseStudy,
      isFeatured,
      status,
      order,
    } = req.body;

    if (!title || !description || !category) {
      return sendError(res, { statusCode: 400, message: 'Title, category, and description are required' });
    }

    const calculatedSlug = (slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const itemData = {
      title: title.trim(),
      slug: calculatedSlug,
      category: category.trim(),
      clientName: clientName || '',
      tagline: tagline || '',
      description: description.trim(),
      techStack: Array.isArray(techStack) ? techStack : (techStack ? String(techStack).split(',').map((s) => s.trim()) : []),
      thumbnail: thumbnail || '',
      liveUrl: liveUrl || '',
      caseStudy: caseStudy || {},
      isFeatured: Boolean(isFeatured),
      status: status || 'published',
      order: Number(order) || 0,
    };

    let item = null;
    if (isDatabaseConnected()) {
      item = await Portfolio.create(itemData);
    } else {
      item = memoryStore.savePortfolio(itemData);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'portfolio.create',
      resourceType: 'portfolio',
      resourceId: item._id || item.id,
      details: { title: item.title, category: item.category },
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: `Portfolio item '${item.title}' created`,
      data: { item },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdatePortfolioItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    let item = null;

    if (isDatabaseConnected()) {
      item = await Portfolio.findById(id);
      if (!item) return sendError(res, { statusCode: 404, message: 'Portfolio item not found' });
      Object.assign(item, req.body);
      if (req.body.techStack && typeof req.body.techStack === 'string') {
        item.techStack = req.body.techStack.split(',').map((s) => s.trim());
      }
      await item.save();
    } else {
      item = memoryStore.getPortfolioById(id);
      if (!item) return sendError(res, { statusCode: 404, message: 'Portfolio item not found' });
      Object.assign(item, req.body);
      if (req.body.techStack && typeof req.body.techStack === 'string') {
        item.techStack = req.body.techStack.split(',').map((s) => s.trim());
      }
      memoryStore.savePortfolio(item);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'portfolio.update',
      resourceType: 'portfolio',
      resourceId: id,
      details: { updatedFields: Object.keys(req.body) },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Portfolio item '${item.title}' updated`,
      data: { item },
    });
  } catch (err) {
    next(err);
  }
};

export const handleDeletePortfolioItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    let deletedTitle = '';

    if (isDatabaseConnected()) {
      const item = await Portfolio.findById(id);
      if (!item) return sendError(res, { statusCode: 404, message: 'Portfolio item not found' });
      deletedTitle = item.title;
      await Portfolio.findByIdAndDelete(id);
    } else {
      const item = memoryStore.getPortfolioById(id);
      if (!item) return sendError(res, { statusCode: 404, message: 'Portfolio item not found' });
      deletedTitle = item.title;
      memoryStore.deletePortfolio(id);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'portfolio.delete',
      resourceType: 'portfolio',
      resourceId: id,
      details: { title: deletedTitle },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Portfolio item '${deletedTitle}' deleted`,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 4. BLOG & ARTICLES MANAGEMENT
// ==========================================

export const handleGetBlogList = async (req, res, next) => {
  try {
    let posts = [];
    if (isDatabaseConnected()) {
      posts = await BlogPost.find().sort({ createdAt: -1 });
    } else {
      posts = memoryStore.getAllBlogPosts();
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Blog posts retrieved',
      data: { posts, total: posts.length },
    });
  } catch (err) {
    next(err);
  }
};

export const handleCreateBlogPost = async (req, res, next) => {
  try {
    const { title, slug, category, excerpt, content, coverImage, tags, readTime, isFeatured, status, seoTitle, seoDescription } = req.body;

    if (!title || !excerpt || !content) {
      return sendError(res, { statusCode: 400, message: 'Title, excerpt, and content are required' });
    }

    const calculatedSlug = (slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const postData = {
      title: title.trim(),
      slug: calculatedSlug,
      category: category || 'Engineering',
      author: {
        name: req.user?.name || 'Pravyuk Editorial Team',
        role: 'Technical Architect',
      },
      excerpt: excerpt.trim(),
      content,
      coverImage: coverImage || '',
      tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map((t) => t.trim()) : []),
      readTime: readTime || '5 min read',
      isFeatured: Boolean(isFeatured),
      status: status || 'published',
      publishedAt: status === 'published' ? new Date() : null,
      seoTitle: seoTitle || `${title} | Pravyuk Insights`,
      seoDescription: seoDescription || excerpt.trim(),
    };

    let post = null;
    if (isDatabaseConnected()) {
      post = await BlogPost.create(postData);
    } else {
      post = memoryStore.saveBlogPost(postData);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'blog.create',
      resourceType: 'blog',
      resourceId: post._id || post.id,
      details: { title: post.title, category: post.category },
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: `Blog post '${post.title}' created`,
      data: { post },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateBlogPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    let post = null;

    if (isDatabaseConnected()) {
      post = await BlogPost.findById(id);
      if (!post) return sendError(res, { statusCode: 404, message: 'Blog post not found' });
      Object.assign(post, req.body);
      if (req.body.status === 'published' && !post.publishedAt) post.publishedAt = new Date();
      await post.save();
    } else {
      post = memoryStore.getBlogPostById(id);
      if (!post) return sendError(res, { statusCode: 404, message: 'Blog post not found' });
      Object.assign(post, req.body);
      if (req.body.status === 'published' && !post.publishedAt) post.publishedAt = new Date();
      memoryStore.saveBlogPost(post);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'blog.update',
      resourceType: 'blog',
      resourceId: id,
      details: { updatedFields: Object.keys(req.body) },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Blog post '${post.title}' updated`,
      data: { post },
    });
  } catch (err) {
    next(err);
  }
};

export const handleDeleteBlogPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    let deletedTitle = '';

    if (isDatabaseConnected()) {
      const post = await BlogPost.findById(id);
      if (!post) return sendError(res, { statusCode: 404, message: 'Blog post not found' });
      deletedTitle = post.title;
      await BlogPost.findByIdAndDelete(id);
    } else {
      const post = memoryStore.getBlogPostById(id);
      if (!post) return sendError(res, { statusCode: 404, message: 'Blog post not found' });
      deletedTitle = post.title;
      memoryStore.deleteBlogPost(id);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'blog.delete',
      resourceType: 'blog',
      resourceId: id,
      details: { title: deletedTitle },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Blog post '${deletedTitle}' deleted`,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 5. TESTIMONIALS & FAQS MANAGEMENT
// ==========================================

export const handleGetTestimonialsList = async (req, res, next) => {
  try {
    let testimonials = [];
    if (isDatabaseConnected()) {
      testimonials = await Testimonial.find().sort({ order: 1, createdAt: -1 });
    } else {
      testimonials = memoryStore.getAllTestimonials();
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Testimonials retrieved',
      data: { testimonials, total: testimonials.length },
    });
  } catch (err) {
    next(err);
  }
};

export const handleCreateTestimonial = async (req, res, next) => {
  try {
    const { clientName, clientRole, clientCompany, clientAvatar, quote, rating, projectTitle, isFeatured, status, order } = req.body;

    if (!clientName || !quote) {
      return sendError(res, { statusCode: 400, message: 'Client name and quote are required' });
    }

    const testData = {
      clientName: clientName.trim(),
      clientRole: clientRole || '',
      clientCompany: clientCompany || '',
      clientAvatar: clientAvatar || '',
      quote: quote.trim(),
      rating: Number(rating) || 5,
      projectTitle: projectTitle || '',
      isFeatured: Boolean(isFeatured),
      status: status || 'published',
      order: Number(order) || 0,
    };

    let item = null;
    if (isDatabaseConnected()) {
      item = await Testimonial.create(testData);
    } else {
      item = memoryStore.saveTestimonial(testData);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'testimonial.create',
      resourceType: 'testimonial',
      resourceId: item._id || item.id,
      details: { clientName: item.clientName },
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: `Testimonial from '${item.clientName}' created`,
      data: { testimonial: item },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    let item = null;

    if (isDatabaseConnected()) {
      item = await Testimonial.findById(id);
      if (!item) return sendError(res, { statusCode: 404, message: 'Testimonial not found' });
      Object.assign(item, req.body);
      await item.save();
    } else {
      item = memoryStore.testimonials.get(String(id));
      if (!item) return sendError(res, { statusCode: 404, message: 'Testimonial not found' });
      Object.assign(item, req.body);
      memoryStore.saveTestimonial(item);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'testimonial.update',
      resourceType: 'testimonial',
      resourceId: id,
      details: { updatedFields: Object.keys(req.body) },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Testimonial updated successfully`,
      data: { testimonial: item },
    });
  } catch (err) {
    next(err);
  }
};

export const handleDeleteTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected()) {
      await Testimonial.findByIdAndDelete(id);
    } else {
      memoryStore.deleteTestimonial(id);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'testimonial.delete',
      resourceType: 'testimonial',
      resourceId: id,
    });

    return sendSuccess(res, { statusCode: 200, message: 'Testimonial deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const handleGetFaqsList = async (req, res, next) => {
  try {
    let faqs = [];
    if (isDatabaseConnected()) {
      faqs = await Faq.find().sort({ order: 1, createdAt: -1 });
    } else {
      faqs = memoryStore.getAllFaqs();
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'FAQs retrieved',
      data: { faqs, total: faqs.length },
    });
  } catch (err) {
    next(err);
  }
};

export const handleCreateFaq = async (req, res, next) => {
  try {
    const { question, answer, category, status, order } = req.body;
    if (!question || !answer) {
      return sendError(res, { statusCode: 400, message: 'Question and answer are required' });
    }

    const faqData = {
      question: question.trim(),
      answer: answer.trim(),
      category: category || 'General',
      status: status || 'published',
      order: Number(order) || 0,
    };

    let faq = null;
    if (isDatabaseConnected()) {
      faq = await Faq.create(faqData);
    } else {
      faq = memoryStore.saveFaq(faqData);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'faq.create',
      resourceType: 'faq',
      resourceId: faq._id || faq.id,
      details: { question: faq.question },
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'FAQ item created successfully',
      data: { faq },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateFaq = async (req, res, next) => {
  try {
    const { id } = req.params;
    let faq = null;

    if (isDatabaseConnected()) {
      faq = await Faq.findById(id);
      if (!faq) return sendError(res, { statusCode: 404, message: 'FAQ not found' });
      Object.assign(faq, req.body);
      await faq.save();
    } else {
      faq = memoryStore.faqs.get(String(id));
      if (!faq) return sendError(res, { statusCode: 404, message: 'FAQ not found' });
      Object.assign(faq, req.body);
      memoryStore.saveFaq(faq);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'faq.update',
      resourceType: 'faq',
      resourceId: id,
      details: { updatedFields: Object.keys(req.body) },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'FAQ updated successfully',
      data: { faq },
    });
  } catch (err) {
    next(err);
  }
};

export const handleDeleteFaq = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected()) {
      await Faq.findByIdAndDelete(id);
    } else {
      memoryStore.deleteFaq(id);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'faq.delete',
      resourceType: 'faq',
      resourceId: id,
    });

    return sendSuccess(res, { statusCode: 200, message: 'FAQ deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 6. CUSTOMER MANAGEMENT
// ==========================================

export const handleGetCustomers = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    let customers = [];

    if (isDatabaseConnected()) {
      const query = { role: 'client' };
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
        ];
      }
      customers = await User.find(query).select('-password').sort({ createdAt: -1 });
    } else {
      customers = memoryStore.getAllUsers().filter((u) => u.role === 'client');
      if (status) customers = customers.filter((c) => c.status === status);
      if (search) {
        const s = search.toLowerCase();
        customers = customers.filter(
          (c) => c.name?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) || c.company?.toLowerCase().includes(s)
        );
      }
    }

    // Attach basic stats (project count, total orders)
    const enriched = customers.map((c) => {
      const customerId = c._id ? String(c._id) : String(c.id);
      let customerInquiries = 0;
      let customerProjects = 0;
      let customerSpent = 0;

      if (!isDatabaseConnected()) {
        customerInquiries = memoryStore.findInquiriesByEmail(c.email).length;
        customerProjects = memoryStore.findProjectsByCustomer(customerId).length;
        customerSpent = memoryStore.findPaymentsByCustomer(customerId).reduce((acc, p) => acc + (p.amount || 0), 0);
      }

      return {
        id: customerId,
        _id: customerId,
        name: c.name,
        email: c.email,
        phone: c.phone || '',
        company: c.company || '',
        status: c.status || 'active',
        createdAt: c.createdAt,
        lastLoginAt: c.lastLoginAt,
        inquiryCount: customerInquiries,
        projectCount: customerProjects,
        totalSpent: customerSpent,
      };
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Customers retrieved successfully',
      data: { customers: enriched, total: enriched.length },
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetCustomerDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    let customer = null;
    let inquiries = [];
    let quotes = [];
    let projects = [];
    let orders = [];

    if (isDatabaseConnected()) {
      customer = await User.findById(id).select('-password');
      if (!customer) return sendError(res, { statusCode: 404, message: 'Customer not found' });

      inquiries = await ProjectInquiry.find({ email: customer.email }).sort({ createdAt: -1 });
      quotes = await Quote.find({ customerId: customer._id }).sort({ createdAt: -1 });
      projects = await Project.find({ customerId: customer._id }).sort({ createdAt: -1 });
      orders = await Order.find({ customerId: customer._id }).sort({ createdAt: -1 });
    } else {
      customer = memoryStore.findUserById(id);
      if (!customer) return sendError(res, { statusCode: 404, message: 'Customer not found' });

      inquiries = memoryStore.findInquiriesByEmail(customer.email);
      quotes = memoryStore.findQuotesByCustomer(customer.id || customer._id);
      projects = memoryStore.findProjectsByCustomer(customer.id || customer._id);
      orders = Array.from(memoryStore.orders.values()).filter((o) => String(o.customerId) === String(customer.id || customer._id));
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Customer profile and activity retrieved',
      data: {
        customer: customer.toSafeJSON ? customer.toSafeJSON() : customer,
        inquiries,
        quotes,
        projects,
        orders,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateCustomerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body; // 'active' | 'suspended'

    if (!['active', 'suspended'].includes(status)) {
      return sendError(res, { statusCode: 400, message: "Status must be 'active' or 'suspended'" });
    }

    let customer = null;
    if (isDatabaseConnected()) {
      customer = await User.findById(id);
      if (!customer) return sendError(res, { statusCode: 404, message: 'Customer not found' });
      customer.status = status;
      await customer.save();
    } else {
      customer = memoryStore.findUserById(id);
      if (!customer) return sendError(res, { statusCode: 404, message: 'Customer not found' });
      customer.status = status;
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: status === 'suspended' ? 'customer.suspend' : 'customer.reactivate',
      resourceType: 'user',
      resourceId: id,
      details: { email: customer.email, status, reason: reason || 'Administrative decision' },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Customer account ${status === 'suspended' ? 'suspended' : 'reactivated'} successfully`,
      data: { customer: customer.toSafeJSON ? customer.toSafeJSON() : customer },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 7. PROJECT INQUIRY ASSIGNMENT & NOTES
// ==========================================

export const handleGetInquiryDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    let inquiry = null;

    if (isDatabaseConnected()) {
      inquiry = id.match(/^[0-9a-fA-F]{24}$/)
        ? await ProjectInquiry.findById(id).populate('assignedQuoteId')
        : await ProjectInquiry.findOne({ referenceId: id.toUpperCase().trim() }).populate('assignedQuoteId');
    } else {
      inquiry = memoryStore.findInquiryById(id) || memoryStore.findInquiryByReference(id);
    }

    if (!inquiry) {
      return sendError(res, { statusCode: 404, message: 'Inquiry not found' });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Inquiry detail retrieved',
      data: { inquiry },
    });
  } catch (err) {
    next(err);
  }
};

export const handleAssignInquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedStaffId, assignedStaffName } = req.body;

    let inquiry = null;
    if (isDatabaseConnected()) {
      inquiry = id.match(/^[0-9a-fA-F]{24}$/)
        ? await ProjectInquiry.findById(id)
        : await ProjectInquiry.findOne({ referenceId: id.toUpperCase().trim() });
      if (!inquiry) return sendError(res, { statusCode: 404, message: 'Inquiry not found' });

      inquiry.assignedStaffId = assignedStaffId || null;
      inquiry.assignedStaffName = assignedStaffName || '';
      inquiry.status = inquiry.status === 'submitted' ? 'under_review' : inquiry.status;
      await inquiry.save();
    } else {
      inquiry = memoryStore.findInquiryById(id) || memoryStore.findInquiryByReference(id);
      if (!inquiry) return sendError(res, { statusCode: 404, message: 'Inquiry not found' });

      inquiry.assignedStaffId = assignedStaffId || null;
      inquiry.assignedStaffName = assignedStaffName || '';
      inquiry.status = inquiry.status === 'submitted' ? 'under_review' : inquiry.status;
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'inquiry.assign',
      resourceType: 'inquiry',
      resourceId: id,
      details: { assignedStaffName, referenceId: inquiry.referenceId },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Inquiry assigned to ${assignedStaffName || 'staff member'}`,
      data: { inquiry },
    });
  } catch (err) {
    next(err);
  }
};

export const handleAddInquiryNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || note.trim().length < 2) {
      return sendError(res, { statusCode: 400, message: 'Note message is required' });
    }

    let inquiry = null;
    const noteEntry = {
      author: req.user?.name || 'Admin',
      authorRole: req.user?.role || 'admin',
      note: note.trim(),
      createdAt: new Date(),
    };

    if (isDatabaseConnected()) {
      inquiry = id.match(/^[0-9a-fA-F]{24}$/)
        ? await ProjectInquiry.findById(id)
        : await ProjectInquiry.findOne({ referenceId: id.toUpperCase().trim() });
      if (!inquiry) return sendError(res, { statusCode: 404, message: 'Inquiry not found' });

      inquiry.internalNotes = inquiry.internalNotes || [];
      inquiry.internalNotes.push(noteEntry);
      await inquiry.save();
    } else {
      inquiry = memoryStore.findInquiryById(id) || memoryStore.findInquiryByReference(id);
      if (!inquiry) return sendError(res, { statusCode: 404, message: 'Inquiry not found' });

      inquiry.internalNotes = inquiry.internalNotes || [];
      inquiry.internalNotes.push(noteEntry);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'inquiry.add_note',
      resourceType: 'inquiry',
      resourceId: id,
      details: { noteLength: note.length },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Internal note added to inquiry',
      data: { inquiry, note: noteEntry },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 8. QUOTATIONS & PROPOSALS
// ==========================================

export const handleGetAdminQuotes = async (req, res, next) => {
  try {
    let quotes = [];
    if (isDatabaseConnected()) {
      quotes = await Quote.find().sort({ createdAt: -1 }).populate('customerId', 'name email company');
    } else {
      quotes = memoryStore.getAllQuotes();
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Agency quotations retrieved',
      data: { quotes, total: quotes.length },
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetQuoteDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    let quote = null;

    if (isDatabaseConnected()) {
      quote = id.match(/^[0-9a-fA-F]{24}$/)
        ? await Quote.findById(id).populate('customerId', 'name email phone company')
        : await Quote.findOne({ referenceId: id.toUpperCase().trim() }).populate('customerId', 'name email phone company');
    } else {
      quote = memoryStore.findQuoteById(id) || memoryStore.findQuoteByReference(id);
    }

    if (!quote) {
      return sendError(res, { statusCode: 404, message: 'Quote not found' });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Quote details retrieved',
      data: { quote },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateQuote = async (req, res, next) => {
  try {
    const { id } = req.params;
    let quote = null;

    if (isDatabaseConnected()) {
      quote = id.match(/^[0-9a-fA-F]{24}$/)
        ? await Quote.findById(id)
        : await Quote.findOne({ referenceId: id.toUpperCase().trim() });
      if (!quote) return sendError(res, { statusCode: 404, message: 'Quote not found' });

      if (['accepted', 'converted'].includes(quote.status)) {
        return sendError(res, { statusCode: 400, message: 'Accepted quotations are locked and cannot be edited' });
      }

      Object.assign(quote, req.body);
      if (req.body.lineItems && Array.isArray(req.body.lineItems)) {
        const total = req.body.lineItems.reduce((acc, item) => acc + (Number(item.totalPrice) || 0), 0);
        quote.totalAmount = total;
        quote.advanceAmount = Math.round(total * ((quote.advancePercentage || 50) / 100));
      }
      await quote.save();
    } else {
      quote = memoryStore.findQuoteById(id) || memoryStore.findQuoteByReference(id);
      if (!quote) return sendError(res, { statusCode: 404, message: 'Quote not found' });

      if (['accepted', 'converted'].includes(quote.status)) {
        return sendError(res, { statusCode: 400, message: 'Accepted quotations are locked and cannot be edited' });
      }

      Object.assign(quote, req.body);
      if (req.body.lineItems && Array.isArray(req.body.lineItems)) {
        const total = req.body.lineItems.reduce((acc, item) => acc + (Number(item.totalPrice) || 0), 0);
        quote.totalAmount = total;
        quote.advanceAmount = Math.round(total * ((quote.advancePercentage || 50) / 100));
      }
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'quote.update',
      resourceType: 'quote',
      resourceId: id,
      details: { referenceId: quote.referenceId, totalAmount: quote.totalAmount },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Quote '${quote.referenceId}' updated successfully`,
      data: { quote },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 9. PROJECTS & MILESTONES EXTENSIONS
// ==========================================

export const handleCreateAdminProject = async (req, res, next) => {
  try {
    const { title, customerEmail, customerName, totalBudget, deliverables, notes, initialMilestone } = req.body;

    if (!title || !customerEmail) {
      return sendError(res, { statusCode: 400, message: 'Project title and customer email are required' });
    }

    // Find or create customer
    let customer = null;
    if (isDatabaseConnected()) {
      customer = await User.findOne({ email: customerEmail.toLowerCase().trim() });
    } else {
      customer = memoryStore.findUserByEmail(customerEmail);
    }

    if (!customer) {
      const tempPassword = `Pravyuk#${Math.floor(1000 + Math.random() * 9000)}`;
      const customerData = {
        name: customerName || customerEmail.split('@')[0],
        email: customerEmail.toLowerCase().trim(),
        role: 'client',
        status: 'active',
        password: await hashPassword(tempPassword),
      };

      if (isDatabaseConnected()) {
        customer = await User.create(customerData);
      } else {
        customer = memoryStore.saveUser(customerData);
      }
    }

    const projectReference = generateReferenceId('PRJ');
    const projectData = {
      projectReference,
      customerId: customer._id || customer.id,
      title: title.trim(),
      totalBudget: Number(totalBudget) || 0,
      currency: 'INR',
      stage: 'brief_review',
      status: 'active',
      startDate: new Date(),
      deliverables: Array.isArray(deliverables) ? deliverables : (deliverables ? [deliverables] : []),
      notes: notes || '',
    };

    let project = null;
    if (isDatabaseConnected()) {
      project = await Project.create(projectData);
    } else {
      project = memoryStore.saveProject(projectData);
    }

    // If initial milestone is provided, create it
    if (initialMilestone && initialMilestone.title && initialMilestone.amount) {
      const milestoneReference = generateReferenceId('MLS');
      const mlsData = {
        milestoneReference,
        projectId: project._id || project.id,
        customerId: customer._id || customer.id,
        title: initialMilestone.title.trim(),
        amount: Number(initialMilestone.amount),
        currency: 'INR',
        approvalState: 'pending',
        paymentState: 'unbilled',
      };

      if (isDatabaseConnected()) {
        await Milestone.create(mlsData);
      } else {
        memoryStore.saveMilestone(mlsData);
      }
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'project.create',
      resourceType: 'project',
      resourceId: project._id || project.id,
      details: { projectReference, title: project.title },
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: `Project '${project.title}' (${projectReference}) provisioned successfully`,
      data: { project },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateMilestoneStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvalState, paymentState, deliverableUrl, notes } = req.body;

    let milestone = null;
    if (isDatabaseConnected()) {
      milestone = id.match(/^[0-9a-fA-F]{24}$/)
        ? await Milestone.findById(id)
        : await Milestone.findOne({ milestoneReference: id.toUpperCase().trim() });
      if (!milestone) return sendError(res, { statusCode: 404, message: 'Milestone not found' });

      if (approvalState) milestone.approvalState = approvalState;
      if (paymentState) milestone.paymentState = paymentState;
      if (deliverableUrl) milestone.deliverableUrl = deliverableUrl;
      if (notes) milestone.notes = notes;
      await milestone.save();
    } else {
      milestone = memoryStore.findMilestoneById(id) || memoryStore.milestones.get(id);
      if (!milestone) return sendError(res, { statusCode: 404, message: 'Milestone not found' });

      if (approvalState) milestone.approvalState = approvalState;
      if (paymentState) milestone.paymentState = paymentState;
      if (deliverableUrl) milestone.deliverableUrl = deliverableUrl;
      if (notes) milestone.notes = notes;
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'milestone.update',
      resourceType: 'milestone',
      resourceId: id,
      details: { approvalState, paymentState },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Milestone status updated`,
      data: { milestone },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 10. PAYMENTS, MANUAL ENTRIES & REFUNDS
// ==========================================

export const handleInitiateRefund = async (req, res, next) => {
  try {
    const { orderReference, amount, reason } = req.body;

    if (!orderReference || !amount || !reason) {
      return sendError(res, { statusCode: 400, message: 'Order reference, amount, and reason are required' });
    }

    let order = null;
    if (isDatabaseConnected()) {
      order = await Order.findOne({ orderReference: orderReference.toUpperCase().trim() });
    } else {
      order = memoryStore.findOrderByReference(orderReference);
    }

    if (!order) {
      return sendError(res, { statusCode: 404, message: `Order '${orderReference}' not found` });
    }

    const refundReference = generateReferenceId('RFD');
    const refundData = {
      refundReference,
      orderId: order._id || order.id,
      customerId: order.customerId,
      amount: Number(amount),
      currency: order.currency || 'INR',
      reason: reason.trim(),
      status: 'processed',
      providerRefundId: `rfnd_mock_${Date.now()}`,
      processedAt: new Date(),
    };

    let refund = null;
    if (isDatabaseConnected()) {
      refund = await Refund.create(refundData);
      order.paymentStatus = 'refunded';
      await order.save();
    } else {
      refund = memoryStore.saveRefund(refundData);
      order.paymentStatus = 'refunded';
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'refund.initiate',
      resourceType: 'refund',
      resourceId: refund._id || refund.id,
      details: { refundReference, orderReference, amount },
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: `Refund of ₹${amount} for order ${orderReference} initiated successfully`,
      data: { refund },
    });
  } catch (err) {
    next(err);
  }
};

export const handleRecordManualPayment = async (req, res, next) => {
  try {
    const { customerEmail, amount, paymentMethod, referenceNote, projectId } = req.body;

    if (!customerEmail || !amount) {
      return sendError(res, { statusCode: 400, message: 'Customer email and amount are required' });
    }

    let customer = null;
    if (isDatabaseConnected()) {
      customer = await User.findOne({ email: customerEmail.toLowerCase().trim() });
    } else {
      customer = memoryStore.findUserByEmail(customerEmail);
    }

    const orderReference = generateReferenceId('ORD');
    const orderData = {
      orderReference,
      customerId: customer ? (customer._id || customer.id) : null,
      amount: Number(amount),
      currency: 'INR',
      orderType: 'direct_invoice',
      paymentStatus: 'paid',
      razorpayOrderId: `manual_${Date.now()}`,
      metadata: {
        method: paymentMethod || 'NEFT/RTGS Bank Transfer',
        referenceNote: referenceNote || 'Direct agency settlement',
        projectId: projectId || null,
      },
    };

    let order = null;
    if (isDatabaseConnected()) {
      order = await Order.create(orderData);
    } else {
      order = memoryStore.saveOrder(orderData);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'payment.record_manual',
      resourceType: 'order',
      resourceId: order._id || order.id,
      details: { orderReference, amount, customerEmail },
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: `Manual payment of ₹${amount} recorded successfully`,
      data: { order },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 11. MEDIA LIBRARY
// ==========================================

export const handleGetMediaList = async (req, res, next) => {
  try {
    let media = [];
    if (isDatabaseConnected()) {
      media = await Media.find().sort({ createdAt: -1 });
    } else {
      media = memoryStore.getAllMedia();
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Media files retrieved',
      data: { media, total: media.length },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUploadMedia = async (req, res, next) => {
  try {
    const { title, url, mimeType, altText, category, size } = req.body;

    if (!url || !title) {
      return sendError(res, { statusCode: 400, message: 'Media title and URL are required' });
    }

    // MIME Validation
    const allowedMime = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp', 'image/gif', 'application/pdf'];
    if (mimeType && !allowedMime.includes(mimeType)) {
      return sendError(res, { statusCode: 400, message: `Unsupported media format. Allowed: ${allowedMime.join(', ')}` });
    }

    const mediaData = {
      title: title.trim(),
      url: url.trim(),
      mimeType: mimeType || 'image/jpeg',
      altText: altText || title.trim(),
      category: category || 'General',
      size: Number(size) || 1024,
      uploadedBy: req.user?.name || 'Admin',
    };

    let item = null;
    if (isDatabaseConnected()) {
      item = await Media.create(mediaData);
    } else {
      item = memoryStore.saveMedia(mediaData);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'media.upload',
      resourceType: 'media',
      resourceId: item._id || item.id,
      details: { title: item.title, url: item.url },
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: `Media '${item.title}' registered successfully`,
      data: { media: item },
    });
  } catch (err) {
    next(err);
  }
};

export const handleDeleteMedia = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected()) {
      await Media.findByIdAndDelete(id);
    } else {
      memoryStore.deleteMedia(id);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'media.delete',
      resourceType: 'media',
      resourceId: id,
    });

    return sendSuccess(res, { statusCode: 200, message: 'Media asset deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 12. SEO CONTROL CENTER & SITEMAP REGENERATION
// ==========================================

export const handleGetSeo = async (req, res, next) => {
  try {
    let settings = null;
    if (isDatabaseConnected()) {
      settings = await SiteSettings.findOne({ key: 'global_settings' });
    } else {
      settings = memoryStore.getSettings();
    }

    const seo = settings?.seo || {
      globalTitle: 'Pravyuk | Professional Website Design & Development Agency',
      globalDescription: 'Pravyuk helps businesses, startups, and creators build professional websites, e-commerce stores, landing pages, and custom web applications. Your Vision. Our Build.',
      canonicalUrl: 'https://pravyuk.com',
      ogImage: '/assets/images/pravyuk-og.jpg',
    };

    return sendSuccess(res, {
      statusCode: 200,
      message: 'SEO configuration retrieved',
      data: { seo },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateSeo = async (req, res, next) => {
  try {
    const { globalTitle, globalDescription, canonicalUrl, ogImage, robotsTxtContent } = req.body;

    let updatedSeo = null;
    const actorEmail = req.user?.email || 'admin@pravyuk.com';

    if (isDatabaseConnected()) {
      const record = await SiteSettings.findOneAndUpdate(
        { key: 'global_settings' },
        {
          $set: {
            'seo.globalTitle': globalTitle,
            'seo.globalDescription': globalDescription,
            'seo.canonicalUrl': canonicalUrl,
            'seo.ogImage': ogImage,
            'seo.robotsTxtContent': robotsTxtContent,
            lastUpdatedBy: actorEmail,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      updatedSeo = record.seo;
    } else {
      const settings = memoryStore.getSettings();
      settings.seo = {
        ...settings.seo,
        globalTitle: globalTitle || settings.seo.globalTitle,
        globalDescription: globalDescription || settings.seo.globalDescription,
        canonicalUrl: canonicalUrl || settings.seo.canonicalUrl,
        ogImage: ogImage || settings.seo.ogImage,
        robotsTxtContent: robotsTxtContent !== undefined ? robotsTxtContent : settings.seo.robotsTxtContent,
      };
      memoryStore.saveSettings(settings, actorEmail);
      updatedSeo = settings.seo;
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'seo.update',
      resourceType: 'seo',
      resourceId: 'global_settings',
      details: { globalTitle, canonicalUrl },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'SEO settings updated successfully',
      data: { seo: updatedSeo },
    });
  } catch (err) {
    next(err);
  }
};

export const handleRegenerateSitemap = async (req, res, next) => {
  try {
    const baseUrl = 'https://pravyuk.com';
    const staticUrls = [
      '',
      '/pages/how-it-works.html',
      '/pages/services.html',
      '/pages/pricing.html',
      '/pages/projects.html',
      '/pages/about.html',
      '/pages/contact.html',
      '/pages/start-project.html',
      '/pages/faq.html',
      '/pages/blog.html',
      '/pages/privacy.html',
      '/pages/terms.html',
    ];

    let blogSlugs = [];
    if (isDatabaseConnected()) {
      const posts = await BlogPost.find({ status: 'published' }).select('slug updatedAt');
      blogSlugs = posts.map((p) => `/pages/blog-${p.slug}.html`);
    } else {
      blogSlugs = memoryStore.getAllBlogPosts().filter((p) => p.status === 'published').map((p) => `/pages/blog-${p.slug}.html`);
    }

    const allUrls = [...staticUrls, ...blogSlugs];
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    allUrls.forEach((urlPath) => {
      const priority = urlPath === '' ? '1.0' : (urlPath.includes('pricing') || urlPath.includes('start-project') ? '0.9' : '0.8');
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${urlPath}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>${priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>\n`;

    // Attempt to write to frontend sitemap.xml
    try {
      const sitemapPath = path.resolve('frontend/sitemap.xml');
      fs.writeFileSync(sitemapPath, xml, 'utf8');
    } catch (e) {
      // In tests or sandbox where disk write may be mocked
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'seo.sitemap_regenerate',
      resourceType: 'sitemap',
      resourceId: 'frontend/sitemap.xml',
      details: { totalUrls: allUrls.length },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `XML Sitemap regenerated with ${allUrls.length} pages`,
      data: { totalUrls: allUrls.length, urls: allUrls },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 13. WEBSITE SETTINGS & CONFIGURATION
// ==========================================

export const handleGetSettings = async (req, res, next) => {
  try {
    let settings = null;
    if (isDatabaseConnected()) {
      settings = await SiteSettings.findOne({ key: 'global_settings' });
    } else {
      settings = memoryStore.getSettings();
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Website settings retrieved',
      data: { settings: settings || memoryStore.getSettings() },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateSettings = async (req, res, next) => {
  try {
    const { general, contact, business, seo } = req.body;
    const actorEmail = req.user?.email || 'admin@pravyuk.com';
    let updated = null;

    if (isDatabaseConnected()) {
      const current = (await SiteSettings.findOne({ key: 'global_settings' })) || new SiteSettings();
      if (general) Object.assign(current.general, general);
      if (contact) Object.assign(current.contact, contact);
      if (business) Object.assign(current.business, business);
      if (seo) Object.assign(current.seo, seo);
      current.lastUpdatedBy = actorEmail;
      await current.save();
      updated = current;
    } else {
      updated = memoryStore.saveSettings({ general, contact, business, seo }, actorEmail);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'settings.update',
      resourceType: 'settings',
      resourceId: 'global_settings',
      details: { sectionsUpdated: Object.keys(req.body) },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Website settings updated successfully',
      data: { settings: updated },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 14. ADMIN USERS & PERMISSIONS
// ==========================================

export const handleGetAdminUsers = async (req, res, next) => {
  try {
    let users = [];
    if (isDatabaseConnected()) {
      users = await User.find({ role: { $in: ['admin', 'super_admin', 'staff'] } })
        .select('-password')
        .sort({ createdAt: -1 });
    } else {
      users = memoryStore.getAllAdminUsers();
    }

    const safeUsers = users.map((u) => (u.toSafeJSON ? u.toSafeJSON() : u));

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Admin team members retrieved',
      data: { users: safeUsers, total: safeUsers.length },
    });
  } catch (err) {
    next(err);
  }
};

export const handleInviteAdminUser = async (req, res, next) => {
  try {
    const { name, email, password, role, permissions } = req.body;

    if (!name || !email || !password) {
      return sendError(res, { statusCode: 400, message: 'Name, email, and initial password are required' });
    }

    if (!['admin', 'staff'].includes(role)) {
      return sendError(res, { statusCode: 400, message: "Invited role must be 'admin' or 'staff'. Super Admin cannot be created publicly." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check collision
    let existing = null;
    if (isDatabaseConnected()) {
      existing = await User.findOne({ email: normalizedEmail });
    } else {
      existing = memoryStore.findUserByEmail(normalizedEmail);
    }

    if (existing) {
      return sendError(res, { statusCode: 409, message: `An account with email '${normalizedEmail}' already exists` });
    }

    const hashedPassword = await hashPassword(password);
    const userData = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      permissions: Array.isArray(permissions) ? permissions : (role === 'admin' ? ['dashboard.read', 'services.manage', 'inquiries.manage', 'projects.manage', 'content.manage'] : ['dashboard.read', 'inquiries.manage']),
      status: 'active',
    };

    let newUser = null;
    if (isDatabaseConnected()) {
      newUser = await User.create(userData);
    } else {
      newUser = memoryStore.saveUser(userData);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'user.invite_admin',
      resourceType: 'user',
      resourceId: newUser._id || newUser.id,
      details: { email: normalizedEmail, role },
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: `Administrative user '${name}' created with role '${role}'`,
      data: { user: newUser.toSafeJSON ? newUser.toSafeJSON() : newUser },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateUserPermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permissions, role } = req.body;

    let targetUser = null;
    if (isDatabaseConnected()) {
      targetUser = await User.findById(id);
      if (!targetUser) return sendError(res, { statusCode: 404, message: 'User not found' });

      if (targetUser.role === 'super_admin' && req.user.id !== String(targetUser._id)) {
        return sendError(res, { statusCode: 403, message: 'Super Admin permissions cannot be modified by other users' });
      }

      if (permissions && Array.isArray(permissions)) targetUser.permissions = permissions;
      if (role && ['admin', 'staff'].includes(role) && targetUser.role !== 'super_admin') {
        targetUser.role = role;
      }
      await targetUser.save();
    } else {
      targetUser = memoryStore.findUserById(id);
      if (!targetUser) return sendError(res, { statusCode: 404, message: 'User not found' });

      if (targetUser.role === 'super_admin' && req.user.id !== String(targetUser.id)) {
        return sendError(res, { statusCode: 403, message: 'Super Admin permissions cannot be modified by other users' });
      }

      if (permissions && Array.isArray(permissions)) targetUser.permissions = permissions;
      if (role && ['admin', 'staff'].includes(role) && targetUser.role !== 'super_admin') {
        targetUser.role = role;
      }
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'user.permissions_update',
      resourceType: 'user',
      resourceId: id,
      details: { email: targetUser.email, newRole: targetUser.role, permissionsCount: targetUser.permissions?.length },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Permissions updated for user '${targetUser.name}'`,
      data: { user: targetUser.toSafeJSON ? targetUser.toSafeJSON() : targetUser },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return sendError(res, { statusCode: 400, message: "Status must be 'active' or 'suspended'" });
    }

    let targetUser = null;
    if (isDatabaseConnected()) {
      targetUser = await User.findById(id);
      if (!targetUser) return sendError(res, { statusCode: 404, message: 'User not found' });
      if (targetUser.role === 'super_admin') {
        return sendError(res, { statusCode: 403, message: 'Super Admin account cannot be suspended' });
      }
      targetUser.status = status;
      await targetUser.save();
    } else {
      targetUser = memoryStore.findUserById(id);
      if (!targetUser) return sendError(res, { statusCode: 404, message: 'User not found' });
      if (targetUser.role === 'super_admin') {
        return sendError(res, { statusCode: 403, message: 'Super Admin account cannot be suspended' });
      }
      targetUser.status = status;
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: status === 'suspended' ? 'user.suspend' : 'user.activate',
      resourceType: 'user',
      resourceId: id,
      details: { email: targetUser.email, status },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `User '${targetUser.name}' account status set to ${status}`,
      data: { user: targetUser.toSafeJSON ? targetUser.toSafeJSON() : targetUser },
    });
  } catch (err) {
    next(err);
  }
};

export const handleDeleteAdminUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    let targetUser = null;
    if (isDatabaseConnected()) {
      targetUser = await User.findById(id);
      if (!targetUser) return sendError(res, { statusCode: 404, message: 'User not found' });
      if (targetUser.role === 'super_admin') {
        return sendError(res, { statusCode: 403, message: 'Super Admin account cannot be deleted' });
      }
      await User.findByIdAndDelete(id);
    } else {
      targetUser = memoryStore.findUserById(id);
      if (!targetUser) return sendError(res, { statusCode: 404, message: 'User not found' });
      if (targetUser.role === 'super_admin') {
        return sendError(res, { statusCode: 403, message: 'Super Admin account cannot be deleted' });
      }
      memoryStore.users.delete(String(id));
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'user.delete',
      resourceType: 'user',
      resourceId: id,
      details: { email: targetUser.email, name: targetUser.name },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `User '${targetUser.name}' removed from administration`,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 15. AUDIT LOGS
// ==========================================

export const handleGetAuditLogs = async (req, res, next) => {
  try {
    const { action, resourceType, search, limit = 100 } = req.query;
    let logs = [];

    if (isDatabaseConnected()) {
      const query = {};
      if (action) query.action = { $regex: action, $options: 'i' };
      if (resourceType) query.resourceType = resourceType;
      if (search) {
        query.$or = [
          { actorName: { $regex: search, $options: 'i' } },
          { actorEmail: { $regex: search, $options: 'i' } },
          { action: { $regex: search, $options: 'i' } },
        ];
      }
      logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(Number(limit));
    } else {
      logs = memoryStore.getAuditLogs({ action, resourceType });
      if (search) {
        const s = search.toLowerCase();
        logs = logs.filter(
          (l) => l.actorName?.toLowerCase().includes(s) || l.actorEmail?.toLowerCase().includes(s) || l.action?.toLowerCase().includes(s)
        );
      }
      logs = logs.slice(0, Number(limit));
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Audit logs retrieved',
      data: { logs, total: logs.length },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 16. PROFILE & PASSWORD
// ==========================================

export const handleGetAdminProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let user = null;

    if (isDatabaseConnected()) {
      user = await User.findById(userId).select('-password');
    } else {
      user = memoryStore.findUserById(userId);
    }

    if (!user) {
      return sendError(res, { statusCode: 404, message: 'User not found' });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Profile retrieved',
      data: { user: user.toSafeJSON ? user.toSafeJSON() : user },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateAdminProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, phone, company } = req.body;

    let user = null;
    if (isDatabaseConnected()) {
      user = await User.findById(userId);
      if (!user) return sendError(res, { statusCode: 404, message: 'User not found' });
      if (name) user.name = name.trim();
      if (phone !== undefined) user.phone = phone.trim();
      if (company !== undefined) user.company = company.trim();
      await user.save();
    } else {
      user = memoryStore.findUserById(userId);
      if (!user) return sendError(res, { statusCode: 404, message: 'User not found' });
      if (name) user.name = name.trim();
      if (phone !== undefined) user.phone = phone.trim();
      if (company !== undefined) user.company = company.trim();
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'profile.update',
      resourceType: 'user',
      resourceId: userId,
      details: { name: user.name },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Profile updated successfully',
      data: { user: user.toSafeJSON ? user.toSafeJSON() : user },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateAdminPassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return sendError(res, { statusCode: 400, message: 'Current password and new password (min 8 chars) are required' });
    }

    let user = null;
    if (isDatabaseConnected()) {
      user = await User.findById(userId).select('+password');
      if (!user) return sendError(res, { statusCode: 404, message: 'User not found' });

      const isValid = await verifyPassword(currentPassword, user.password);
      if (!isValid) {
        return sendError(res, { statusCode: 401, message: 'Incorrect current password' });
      }

      user.password = await hashPassword(newPassword);
      await user.save();
    } else {
      user = memoryStore.findUserById(userId);
      if (!user) return sendError(res, { statusCode: 404, message: 'User not found' });

      const isValid = await verifyPassword(currentPassword, user.password);
      if (!isValid) {
        return sendError(res, { statusCode: 401, message: 'Incorrect current password' });
      }

      user.password = await hashPassword(newPassword);
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'profile.password_change',
      resourceType: 'user',
      resourceId: userId,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Password changed successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 17. COMPLETE DATA BACKUP / EXPORT
// ==========================================

export const handleExportData = async (req, res, next) => {
  try {
    let exportData = {};

    if (isDatabaseConnected()) {
      exportData = {
        exportedAt: new Date().toISOString(),
        agency: 'Pravyuk',
        users: await User.find().select('-password'),
        services: await Service.find(),
        portfolio: await Portfolio.find(),
        blog: await BlogPost.find(),
        testimonials: await Testimonial.find(),
        faqs: await Faq.find(),
        inquiries: await ProjectInquiry.find(),
        quotes: await Quote.find(),
        projects: await Project.find(),
        milestones: await Milestone.find(),
        orders: await Order.find(),
        siteContent: await SiteContent.find(),
        siteSettings: await SiteSettings.find(),
      };
    } else {
      exportData = {
        exportedAt: new Date().toISOString(),
        agency: 'Pravyuk',
        users: memoryStore.getAllUsers().map((u) => (u.toSafeJSON ? u.toSafeJSON() : u)),
        services: memoryStore.getAllServices(),
        portfolio: memoryStore.getAllPortfolio(),
        blog: memoryStore.getAllBlogPosts(),
        testimonials: memoryStore.getAllTestimonials(),
        faqs: memoryStore.getAllFaqs(),
        inquiries: memoryStore.getAllInquiries(),
        quotes: memoryStore.getAllQuotes(),
        projects: memoryStore.getAllProjects(),
        milestones: Array.from(memoryStore.milestones.values()),
        orders: memoryStore.getAllOrders(),
        siteContent: Array.from(memoryStore.content.entries()).map(([key, data]) => ({ key, data })),
        siteSettings: memoryStore.getSettings(),
      };
    }

    await recordAuditLog({
      req,
      actor: req.user,
      action: 'data.export',
      resourceType: 'database',
      resourceId: 'all',
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'System data exported successfully',
      data: exportData,
    });
  } catch (err) {
    next(err);
  }
};
