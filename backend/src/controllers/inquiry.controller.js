import { ProjectInquiry } from '../models/ProjectInquiry.js';
import { generateReferenceId } from '../utils/generate-reference.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { isDatabaseConnected, memoryStore } from '../utils/memory-store.js';

export const handleCreateProjectInquiry = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      websiteType,
      service,
      projectTitle,
      description,
      targetAudience,
      requiredPages,
      requiredFeatures,
      preferredTech,
      existingWebsiteUrl,
      designPreferences,
      additionalNotes,
      budgetRange,
      budgetAmount,
      timeline,
      referenceLinks,
    } = req.body;

    const customerName = name || (req.user ? req.user.name : '');
    const customerEmail = email || (req.user ? req.user.email : '');

    if (!customerName || customerName.trim().length < 2) {
      return sendError(res, { statusCode: 400, message: 'Your name is required (at least 2 characters)' });
    }

    if (!customerEmail || !/^\S+@\S+\.\S+$/.test(customerEmail)) {
      return sendError(res, { statusCode: 400, message: 'A valid email address is required' });
    }

    if (!service || typeof service !== 'string') {
      return sendError(res, { statusCode: 400, message: 'Please select a service or website type' });
    }

    if (!description || description.trim().length < 10) {
      return sendError(res, { statusCode: 400, message: 'Please describe your website requirements (at least 10 characters)' });
    }

    const referenceId = generateReferenceId('INQ');

    const inquiryData = {
      referenceId,
      customerId: req.user ? req.user.id : null,
      name: customerName.trim(),
      email: customerEmail.toLowerCase().trim(),
      phone: phone ? String(phone).trim() : '',
      company: company ? String(company).trim() : '',
      websiteType: websiteType ? String(websiteType).trim() : 'Business Website',
      service: String(service).trim(),
      projectTitle: projectTitle ? String(projectTitle).trim() : `${websiteType || 'Custom'} Website Project`,
      description: description.trim(),
      targetAudience: targetAudience ? String(targetAudience).trim() : '',
      requiredPages: requiredPages ? String(requiredPages).trim() : '',
      requiredFeatures: requiredFeatures ? String(requiredFeatures).trim() : '',
      preferredTech: preferredTech ? String(preferredTech).trim() : '',
      existingWebsiteUrl: existingWebsiteUrl ? String(existingWebsiteUrl).trim() : '',
      designPreferences: designPreferences ? String(designPreferences).trim() : '',
      additionalNotes: additionalNotes ? String(additionalNotes).trim() : '',
      budgetRange: budgetRange || '',
      budgetAmount: budgetAmount ? Number(budgetAmount) : null,
      timeline: timeline || 'Standard (2-4 weeks)',
      referenceLinks: Array.isArray(referenceLinks) ? referenceLinks : [],
      status: 'submitted',
    };

    let inquiry;
    if (isDatabaseConnected()) {
      inquiry = new ProjectInquiry(inquiryData);
      await inquiry.save();
    } else {
      inquiry = memoryStore.saveInquiry(inquiryData);
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Project inquiry submitted successfully. Our agency team will review your requirements and prepare a custom proposal.',
      data: {
        referenceId: inquiry.referenceId,
        projectTitle: inquiry.projectTitle,
        websiteType: inquiry.websiteType,
        status: inquiry.status,
        createdAt: inquiry.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetMyInquiries = async (req, res, next) => {
  try {
    let inquiries;
    if (isDatabaseConnected()) {
      inquiries = await ProjectInquiry.find({
        $or: [{ customerId: req.user.id }, { email: req.user.email }],
      })
        .sort({ createdAt: -1 })
        .populate('assignedQuoteId');
    } else {
      inquiries = memoryStore.findInquiriesByCustomer(req.user.id, req.user.email);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Inquiries retrieved successfully',
      data: {
        inquiries,
        total: inquiries.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetInquiryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let inquiry;
    if (isDatabaseConnected()) {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        inquiry = await ProjectInquiry.findById(id).populate('assignedQuoteId');
      } else {
        inquiry = await ProjectInquiry.findOne({ referenceId: id.toUpperCase().trim() }).populate('assignedQuoteId');
      }
    } else {
      for (const inq of memoryStore.inquiries.values()) {
        if (inq.id === id || inq._id === id || inq.referenceId === id.toUpperCase().trim()) {
          inquiry = inq;
          break;
        }
      }
    }

    if (!inquiry) {
      return sendError(res, { statusCode: 404, message: 'Inquiry not found' });
    }

    // Ownership or admin check
    const isOwner = (req.user && String(inquiry.customerId) === String(req.user.id)) ||
                    (req.user && inquiry.email === req.user.email);
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendError(res, { statusCode: 403, message: 'Unauthorized to view this inquiry' });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Inquiry retrieved',
      data: { inquiry },
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdateInquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { additionalNotes, status } = req.body;

    let inquiry;
    if (isDatabaseConnected()) {
      inquiry = id.match(/^[0-9a-fA-F]{24}$/)
        ? await ProjectInquiry.findById(id)
        : await ProjectInquiry.findOne({ referenceId: id.toUpperCase().trim() });
    } else {
      for (const inq of memoryStore.inquiries.values()) {
        if (inq.id === id || inq._id === id || inq.referenceId === id.toUpperCase().trim()) {
          inquiry = inq;
          break;
        }
      }
    }

    if (!inquiry) {
      return sendError(res, { statusCode: 404, message: 'Inquiry not found' });
    }

    const isAdmin = req.user && req.user.role === 'admin';
    const isOwner = req.user && (String(inquiry.customerId) === String(req.user.id) || inquiry.email === req.user.email);

    if (!isOwner && !isAdmin) {
      return sendError(res, { statusCode: 403, message: 'Unauthorized to update this inquiry' });
    }

    // Only admin can change inquiry workflow status; client can only add notes or cancel
    if (status) {
      if (!isAdmin && status !== 'cancelled') {
        return sendError(res, { statusCode: 403, message: 'Only staff can modify review status' });
      }
      inquiry.status = status;
    }

    if (additionalNotes) {
      inquiry.additionalNotes = additionalNotes;
    }

    if (isDatabaseConnected()) {
      await inquiry.save();
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Inquiry updated successfully',
      data: { inquiry },
    });
  } catch (err) {
    next(err);
  }
};

