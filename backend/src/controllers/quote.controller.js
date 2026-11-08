import { Quote } from '../models/Quote.js';
import { ProjectInquiry } from '../models/ProjectInquiry.js';
import { Project } from '../models/Project.js';
import { Milestone } from '../models/Milestone.js';
import { generateReferenceId } from '../utils/generate-reference.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { isDatabaseConnected, memoryStore } from '../utils/memory-store.js';

export const handleGetMyQuotes = async (req, res, next) => {
  try {
    let quotes;
    if (isDatabaseConnected()) {
      quotes = await Quote.find({ customerId: req.user.id })
        .sort({ createdAt: -1 })
        .populate('inquiryId');
    } else {
      quotes = memoryStore.findQuotesByCustomer(req.user.id);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Quotes retrieved successfully',
      data: {
        quotes,
        total: quotes.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetQuoteByReference = async (req, res, next) => {
  try {
    const { quoteReference } = req.params;
    let quote;
    if (isDatabaseConnected()) {
      quote = quoteReference.match(/^[0-9a-fA-F]{24}$/)
        ? await Quote.findById(quoteReference).populate('inquiryId')
        : await Quote.findOne({ quoteReference: quoteReference.toUpperCase().trim() }).populate('inquiryId');
    } else {
      quote = memoryStore.findQuoteByReference(quoteReference) || memoryStore.findQuoteById(quoteReference);
    }

    if (!quote) {
      return sendError(res, { statusCode: 404, message: 'Quote not found' });
    }

    // Ownership check
    const isOwner = quote.customerId && String(quote.customerId) === String(req.user.id);
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendError(res, { statusCode: 403, message: 'Unauthorized to view this quote' });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Quote retrieved',
      data: { quote },
    });
  } catch (err) {
    next(err);
  }
};

export const handleAcceptQuote = async (req, res, next) => {
  try {
    const { quoteReference } = req.params;
    let quote;
    if (isDatabaseConnected()) {
      quote = quoteReference.match(/^[0-9a-fA-F]{24}$/)
        ? await Quote.findById(quoteReference)
        : await Quote.findOne({ quoteReference: quoteReference.toUpperCase().trim() });
    } else {
      quote = memoryStore.findQuoteByReference(quoteReference) || memoryStore.findQuoteById(quoteReference);
    }

    if (!quote) {
      return sendError(res, { statusCode: 404, message: 'Quote not found' });
    }

    const isOwner = quote.customerId && String(quote.customerId) === String(req.user.id);
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendError(res, { statusCode: 403, message: 'Unauthorized to approve this quote' });
    }

    if (quote.status === 'expired') {
      return sendError(res, { statusCode: 400, message: 'This quotation has expired. Please request a new quote.' });
    }

    if (quote.status === 'rejected') {
      return sendError(res, { statusCode: 400, message: 'This quotation was previously rejected. Please contact staff to reissue.' });
    }

    quote.status = 'approved';
    quote.approvedAt = new Date();

    if (isDatabaseConnected()) {
      await quote.save();
      if (quote.inquiryId) {
        await ProjectInquiry.findByIdAndUpdate(quote.inquiryId, { status: 'approved' });
      }
    }

    // Provision client project record if one doesn't exist yet
    let project;
    const projectReference = generateReferenceId('PRJ');
    const projectData = {
      projectReference,
      customerId: quote.customerId,
      inquiryId: quote.inquiryId || null,
      quoteId: quote._id || quote.id,
      title: quote.projectTitle,
      description: quote.scopeOfWork || quote.projectTitle,
      service: quote.service,
      websiteType: quote.service || 'Business Website',
      stage: 'awaiting_advance',
      status: 'active',
      totalAmount: quote.totalAmount,
      advanceAmount: quote.advanceAmount,
      paidAmount: 0,
      currency: quote.currency || 'INR',
      timeline: quote.timeline || '3-4 weeks',
      deliverables: (quote.lineItems || []).map((li) => li.title),
    };

    if (isDatabaseConnected()) {
      project = await Project.findOne({ quoteId: quote._id });
      if (!project) {
        project = new Project(projectData);
        await project.save();
      }
    } else {
      project = memoryStore.saveProject(projectData);
    }

    // Provision milestones from quote if present
    if (Array.isArray(quote.milestones) && quote.milestones.length > 0) {
      for (const [idx, m] of quote.milestones.entries()) {
        const milestoneData = {
          milestoneReference: generateReferenceId('MLS'),
          projectId: project._id || project.id,
          quoteId: quote._id || quote.id,
          customerId: quote.customerId,
          title: m.title || `Milestone ${idx + 1}`,
          amount: m.amount,
          currency: quote.currency || 'INR',
          order: idx + 1,
          approvalState: 'pending',
          paymentState: 'unbilled',
        };

        if (isDatabaseConnected()) {
          const existing = await Milestone.findOne({
            projectId: project._id,
            title: milestoneData.title,
          });
          if (!existing) {
            const newM = new Milestone(milestoneData);
            await newM.save();
          }
        } else {
          memoryStore.saveMilestone(milestoneData);
        }
      }
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Proposal approved successfully! Your project is now initialized. Please proceed to pay the advance to begin development.',
      data: {
        quote,
        project: {
          projectReference: project.projectReference,
          stage: project.stage,
          advanceAmount: quote.advanceAmount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const handleRequestQuoteChanges = async (req, res, next) => {
  try {
    const { quoteReference } = req.params;
    const { feedback } = req.body;

    if (!feedback || feedback.trim().length < 5) {
      return sendError(res, { statusCode: 400, message: 'Please provide constructive feedback regarding desired changes' });
    }

    let quote;
    if (isDatabaseConnected()) {
      quote = quoteReference.match(/^[0-9a-fA-F]{24}$/)
        ? await Quote.findById(quoteReference)
        : await Quote.findOne({ quoteReference: quoteReference.toUpperCase().trim() });
    } else {
      quote = memoryStore.findQuoteByReference(quoteReference) || memoryStore.findQuoteById(quoteReference);
    }

    if (!quote) {
      return sendError(res, { statusCode: 404, message: 'Quote not found' });
    }

    const isOwner = quote.customerId && String(quote.customerId) === String(req.user.id);
    if (!isOwner && req.user.role !== 'admin') {
      return sendError(res, { statusCode: 403, message: 'Unauthorized to modify this quote' });
    }

    quote.status = 'changes_requested';
    quote.clientFeedback = feedback.trim();

    if (isDatabaseConnected()) {
      await quote.save();
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Revision requested. Agency engineers will review your feedback and update the proposal.',
      data: { quote },
    });
  } catch (err) {
    next(err);
  }
};

export const handleRejectQuote = async (req, res, next) => {
  try {
    const { quoteReference } = req.params;
    const { reason } = req.body;

    let quote;
    if (isDatabaseConnected()) {
      quote = quoteReference.match(/^[0-9a-fA-F]{24}$/)
        ? await Quote.findById(quoteReference)
        : await Quote.findOne({ quoteReference: quoteReference.toUpperCase().trim() });
    } else {
      quote = memoryStore.findQuoteByReference(quoteReference) || memoryStore.findQuoteById(quoteReference);
    }

    if (!quote) {
      return sendError(res, { statusCode: 404, message: 'Quote not found' });
    }

    const isOwner = quote.customerId && String(quote.customerId) === String(req.user.id);
    if (!isOwner && req.user.role !== 'admin') {
      return sendError(res, { statusCode: 403, message: 'Unauthorized' });
    }

    quote.status = 'rejected';
    if (reason) quote.clientFeedback = reason.trim();

    if (isDatabaseConnected()) {
      await quote.save();
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Quotation rejected. You can submit another inquiry at any time.',
      data: { quote },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Staff / Admin helper to create a quote for an inquiry.
 */
export const handleCreateQuote = async (req, res, next) => {
  try {
    const {
      inquiryId,
      customerId,
      projectTitle,
      service,
      lineItems,
      totalAmount,
      currency,
      advancePercentage,
      milestones,
      scopeOfWork,
      includedRevisions,
      supportPeriod,
      exclusions,
      termsAndConditions,
    } = req.body;

    if (!projectTitle || !totalAmount || !customerId) {
      return sendError(res, {
        statusCode: 400,
        message: 'projectTitle, totalAmount, and customerId are required',
      });
    }

    const pct = advancePercentage || 50;
    const advanceAmount = Math.round((Number(totalAmount) * pct) / 100);
    const quoteReference = generateReferenceId('QUOTE');

    const quoteData = {
      quoteReference,
      inquiryId: inquiryId || null,
      customerId,
      projectTitle,
      service: service || 'Custom Website Development',
      lineItems: lineItems || [{ title: projectTitle, amount: Number(totalAmount) }],
      totalAmount: Number(totalAmount),
      currency: currency || 'INR',
      advanceAmount,
      advancePaid: false,
      milestones: Array.isArray(milestones) ? milestones : [
        {
          milestoneId: 'ms_1',
          title: 'Advance Kickoff Deposit',
          amount: advanceAmount,
          percentage: pct,
          status: 'pending',
        },
        {
          milestoneId: 'ms_2',
          title: 'Final Delivery & Handover',
          amount: Number(totalAmount) - advanceAmount,
          percentage: 100 - pct,
          status: 'pending',
        },
      ],
      scopeOfWork: scopeOfWork || '',
      includedRevisions: includedRevisions || '2 rounds of revisions',
      supportPeriod: supportPeriod || '30 days warranty support',
      exclusions: exclusions || ['Third-party APIs', 'Paid fonts/stock footage'],
      termsAndConditions: termsAndConditions || 'Standard 50% advance to initiate sprint.',
      status: 'sent',
    };

    let quote;
    if (isDatabaseConnected()) {
      quote = new Quote(quoteData);
      await quote.save();
      if (inquiryId) {
        await ProjectInquiry.findByIdAndUpdate(inquiryId, {
          status: 'quoted',
          assignedQuoteId: quote._id,
        });
      }
    } else {
      quote = memoryStore.saveQuote(quoteData);
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Quote created and issued to customer successfully',
      data: { quote },
    });
  } catch (err) {
    next(err);
  }
};
