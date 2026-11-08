import { ProjectInquiry } from '../models/ProjectInquiry.js';
import { Quote } from '../models/Quote.js';
import { Project } from '../models/Project.js';
import { Milestone } from '../models/Milestone.js';
import { ProjectUpdate } from '../models/ProjectUpdate.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Refund } from '../models/Refund.js';
import { User } from '../models/User.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { generateReferenceId } from '../utils/generate-reference.js';
import { isDatabaseConnected, memoryStore } from '../utils/memory-store.js';

/**
 * 1. Admin Dashboard Summary Metrics
 */
export const handleGetAdminSummary = async (req, res, next) => {
  try {
    let inquiries = [];
    let quotes = [];
    let projects = [];
    let orders = [];
    let refunds = [];

    if (isDatabaseConnected()) {
      inquiries = await ProjectInquiry.find().sort({ createdAt: -1 });
      quotes = await Quote.find().sort({ createdAt: -1 });
      projects = await Project.find().sort({ createdAt: -1 });
      orders = await Order.find({ paymentStatus: 'paid' }).sort({ createdAt: -1 });
      refunds = await Refund.find().sort({ createdAt: -1 });
    } else {
      inquiries = memoryStore.getAllInquiries();
      quotes = memoryStore.getAllQuotes();
      projects = memoryStore.getAllProjects();
      orders = memoryStore.getAllOrders().filter((o) => o.paymentStatus === 'paid');
      refunds = memoryStore.getAllRefunds();
    }

    const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const newInquiries = inquiries.filter((i) => i.status === 'submitted' || i.status === 'new').length;
    const activeProjects = projects.filter((p) => p.status === 'active').length;
    const pendingQuotes = quotes.filter((q) => q.status === 'sent').length;
    const pendingRefunds = refunds.filter((r) => r.status === 'requested').length;

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Admin summary retrieved successfully',
      data: {
        metrics: {
          totalRevenue,
          totalInquiries: inquiries.length,
          newInquiries,
          pendingQuotes,
          activeProjects,
          completedProjects: projects.filter((p) => p.status === 'completed' || p.stage === 'delivered').length,
          totalVerifiedOrders: orders.length,
          pendingRefunds,
        },
        recentInquiries: inquiries.slice(0, 5),
        recentProjects: projects.slice(0, 5),
        recentPayments: orders.slice(0, 5),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Get All Inquiries (with optional filtering)
 */
export const handleGetAdminInquiries = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let inquiries;

    if (isDatabaseConnected()) {
      const query = {};
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { referenceId: { $regex: search, $options: 'i' } },
        ];
      }
      inquiries = await ProjectInquiry.find(query).sort({ createdAt: -1 }).populate('assignedQuoteId');
    } else {
      inquiries = memoryStore.getAllInquiries();
      if (status) inquiries = inquiries.filter((i) => i.status === status);
      if (search) {
        const s = search.toLowerCase();
        inquiries = inquiries.filter(
          (i) => i.name.toLowerCase().includes(s) || i.email.toLowerCase().includes(s) || i.referenceId.toLowerCase().includes(s)
        );
      }
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Inquiries retrieved',
      data: { inquiries, total: inquiries.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Update Inquiry Workflow Status
 */
export const handleUpdateInquiryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

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

    if (status) {
      inquiry.status = status;
      if (isDatabaseConnected()) await inquiry.save();
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: `Inquiry status updated to '${status}'`,
      data: { inquiry },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Get All Projects (Agency-wide)
 */
export const handleGetAdminProjects = async (req, res, next) => {
  try {
    let projects;
    if (isDatabaseConnected()) {
      projects = await Project.find()
        .sort({ createdAt: -1 })
        .populate('customerId', 'name email phone company')
        .populate('quoteId');
    } else {
      projects = memoryStore.getAllProjects();
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Agency projects retrieved successfully',
      data: { projects, total: projects.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. Update Project Stage and Deliverables
 */
export const handleUpdateProjectStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, status, stagingUrl, liveUrl, repositoryUrl, note } = req.body;

    let project;
    if (isDatabaseConnected()) {
      project = id.match(/^[0-9a-fA-F]{24}$/)
        ? await Project.findById(id)
        : await Project.findOne({ projectReference: id.toUpperCase().trim() });
    } else {
      project = memoryStore.findProjectById(id) || memoryStore.findProjectByReference(id);
    }

    if (!project) {
      return sendError(res, { statusCode: 404, message: 'Project not found' });
    }

    if (stage) project.stage = stage;
    if (status) project.status = status;
    if (stagingUrl !== undefined) project.stagingUrl = stagingUrl;
    if (liveUrl !== undefined) project.liveUrl = liveUrl;
    if (repositoryUrl !== undefined) project.repositoryUrl = repositoryUrl;
    if (stage === 'delivered' && !project.deliveredAt) project.deliveredAt = new Date();

    if (isDatabaseConnected()) await project.save();

    // Create timeline update
    const updateMessage = note || `Project stage updated to ${stage || project.stage}`;
    const updateData = {
      projectId: project._id || project.id,
      authorName: req.user ? req.user.name : 'Engineering Lead',
      updateMessage,
      stage: project.stage,
      attachments: liveUrl ? [{ label: 'Live Website', url: liveUrl }] : (stagingUrl ? [{ label: 'Staging Preview', url: stagingUrl }] : []),
    };

    if (isDatabaseConnected()) {
      const pu = new ProjectUpdate(updateData);
      await pu.save();
    } else {
      memoryStore.saveProjectUpdate(updateData);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Project stage updated successfully',
      data: { project },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. Post Project Timeline Update
 */
export const handleCreateProjectUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { updateMessage, stage, attachments } = req.body;

    if (!updateMessage || updateMessage.trim().length < 5) {
      return sendError(res, { statusCode: 400, message: 'Update message is required (at least 5 characters)' });
    }

    let project;
    if (isDatabaseConnected()) {
      project = id.match(/^[0-9a-fA-F]{24}$/)
        ? await Project.findById(id)
        : await Project.findOne({ projectReference: id.toUpperCase().trim() });
    } else {
      project = memoryStore.findProjectById(id) || memoryStore.findProjectByReference(id);
    }

    if (!project) {
      return sendError(res, { statusCode: 404, message: 'Project not found' });
    }

    const updateData = {
      projectId: project._id || project.id,
      authorId: req.user ? req.user.id : null,
      authorName: req.user ? req.user.name : 'Agency Lead',
      updateMessage: updateMessage.trim(),
      stage: stage || project.stage,
      attachments: Array.isArray(attachments) ? attachments : [],
    };

    let updateRecord;
    if (isDatabaseConnected()) {
      updateRecord = new ProjectUpdate(updateData);
      await updateRecord.save();
    } else {
      updateRecord = memoryStore.saveProjectUpdate(updateData);
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Project update posted successfully',
      data: { update: updateRecord },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. Add Milestone to Project
 */
export const handleAddProjectMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, amount, completionCriteria, dueDate } = req.body;

    if (!title || !amount) {
      return sendError(res, { statusCode: 400, message: 'Title and amount are required' });
    }

    let project;
    if (isDatabaseConnected()) {
      project = id.match(/^[0-9a-fA-F]{24}$/)
        ? await Project.findById(id)
        : await Project.findOne({ projectReference: id.toUpperCase().trim() });
    } else {
      project = memoryStore.findProjectById(id) || memoryStore.findProjectByReference(id);
    }

    if (!project) {
      return sendError(res, { statusCode: 404, message: 'Project not found' });
    }

    const milestoneReference = generateReferenceId('MLS');
    const milestoneData = {
      milestoneReference,
      projectId: project._id || project.id,
      customerId: project.customerId,
      title: title.trim(),
      description: description || '',
      amount: Number(amount),
      currency: project.currency || 'INR',
      completionCriteria: completionCriteria || '',
      dueDate: dueDate ? new Date(dueDate) : null,
      approvalState: 'pending',
      paymentState: 'unbilled',
    };

    let milestone;
    if (isDatabaseConnected()) {
      milestone = new Milestone(milestoneData);
      await milestone.save();
    } else {
      milestone = memoryStore.saveMilestone(milestoneData);
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Milestone added successfully',
      data: { milestone },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. Unlock Milestone for Payment
 */
export const handleSetMilestonePayable = async (req, res, next) => {
  try {
    const { id } = req.params;
    let milestone;

    if (isDatabaseConnected()) {
      milestone = id.match(/^[0-9a-fA-F]{24}$/)
        ? await Milestone.findById(id)
        : await Milestone.findOne({ milestoneReference: id.toUpperCase().trim() });
    } else {
      milestone = memoryStore.findMilestoneById(id) || memoryStore.findMilestoneByReference(id);
    }

    if (!milestone) {
      return sendError(res, { statusCode: 404, message: 'Milestone not found' });
    }

    milestone.paymentState = 'payable';
    milestone.approvalState = 'approved';
    if (isDatabaseConnected()) await milestone.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: `Milestone '${milestone.title}' unlocked for client payment`,
      data: { milestone },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 9. Get Verified Payments & Orders
 */
export const handleGetAdminPayments = async (req, res, next) => {
  try {
    let orders;
    let refunds;

    if (isDatabaseConnected()) {
      orders = await Order.find().sort({ createdAt: -1 }).populate('customerId', 'name email company');
      refunds = await Refund.find().sort({ createdAt: -1 });
    } else {
      orders = memoryStore.getAllOrders();
      refunds = memoryStore.getAllRefunds();
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Admin transaction records retrieved',
      data: { orders, refunds, totalOrders: orders.length, totalRefunds: refunds.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 10. Process Refund Request (Approve / Reject)
 */
export const handleProcessRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, auditNotes } = req.body; // 'approve' | 'reject'

    let refund;
    if (isDatabaseConnected()) {
      refund = id.match(/^[0-9a-fA-F]{24}$/)
        ? await Refund.findById(id)
        : await Refund.findOne({ refundReference: id.toUpperCase().trim() });
    } else {
      for (const r of memoryStore.refunds.values()) {
        if (r.id === id || r._id === id || r.refundReference === id.toUpperCase().trim()) {
          refund = r;
          break;
        }
      }
    }

    if (!refund) {
      return sendError(res, { statusCode: 404, message: 'Refund request not found' });
    }

    if (action === 'approve') {
      refund.status = 'processed';
      refund.processedAt = new Date();
      refund.providerRefundId = `rfnd_mock_${Date.now()}`;
    } else {
      refund.status = 'rejected';
      refund.processedAt = new Date();
    }

    if (auditNotes) refund.notes = auditNotes;
    if (isDatabaseConnected()) await refund.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: `Refund ${action === 'approve' ? 'approved and marked processed' : 'rejected'}`,
      data: { refund },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Preserved for Phase 2 compatibility with health.test.js
 */
export const handleGetLeads = (req, res) => {
  return sendError(res, {
    statusCode: 501,
    message: 'Phase 2 Admin routes reserved for future implementation.',
  });
};

export const handleGetLeadById = (req, res) => {
  return sendError(res, {
    statusCode: 501,
    message: 'Admin lead detail retrieval is reserved for Phase 2 implementation.',
  });
};

export const handleUpdateLead = (req, res) => {
  return sendError(res, {
    statusCode: 501,
    message: 'Admin lead modification is reserved for Phase 2 implementation.',
  });
};
