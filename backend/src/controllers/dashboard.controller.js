import { Order } from '../models/Order.js';
import { ProjectInquiry } from '../models/ProjectInquiry.js';
import { Quote } from '../models/Quote.js';
import { Project } from '../models/Project.js';
import { Milestone } from '../models/Milestone.js';
import { Membership } from '../models/Membership.js';
import { Refund } from '../models/Refund.js';
import { User } from '../models/User.js';
import { sendSuccess } from '../utils/api-response.js';
import { isDatabaseConnected, memoryStore } from '../utils/memory-store.js';

export const handleGetDashboardSummary = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    let user = null;
    let inquiries = [];
    let quotes = [];
    let projects = [];
    let milestones = [];
    let orders = [];
    let membership = null;
    let refunds = [];

    if (isDatabaseConnected()) {
      [user, inquiries, quotes, projects, milestones, orders, membership, refunds] = await Promise.all([
        User.findById(customerId),
        ProjectInquiry.find({
          $or: [{ customerId }, { email: req.user.email }],
        }).sort({ createdAt: -1 }),
        Quote.find({ customerId }).sort({ createdAt: -1 }),
        Project.find({ customerId }).sort({ createdAt: -1 }),
        Milestone.find({ customerId }).sort({ order: 1 }),
        Order.find({ customerId }).sort({ createdAt: -1 }),
        Membership.findOne({ customerId, status: 'active' }),
        Refund.find({ customerId }).sort({ createdAt: -1 }),
      ]);
    } else {
      user = memoryStore.findUserById(customerId);
      inquiries = memoryStore.findInquiriesByCustomer(customerId, req.user.email);
      quotes = memoryStore.findQuotesByCustomer(customerId);
      projects = memoryStore.findProjectsByCustomer(customerId);
      orders = memoryStore.findOrdersByCustomer(customerId);
      membership = memoryStore.findMembershipByCustomer(customerId);
      refunds = memoryStore.findRefundsByCustomer(customerId);
      milestones = Array.from(memoryStore.milestones.values()).filter(
        (m) => String(m.customerId) === String(customerId)
      );
    }

    // Calculate metrics
    const totalSpent = orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + (o.amount || 0), 0);

    const pendingOrdersCount = orders.filter((o) => o.paymentStatus === 'pending').length;
    const activeProjectsCount = projects.filter((p) => p.status === 'active').length;
    const approvedQuotesCount = quotes.filter((q) => q.status === 'approved' && !q.advancePaid).length;

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Dashboard summary retrieved successfully',
      data: {
        profile: user && typeof user.toSafeJSON === 'function'
          ? user.toSafeJSON()
          : { id: customerId, name: req.user.name, email: req.user.email, role: req.user.role },
        metrics: {
          totalSpent,
          inquiriesCount: inquiries.length,
          quotesCount: quotes.length,
          approvedQuotesCount,
          projectsCount: projects.length,
          activeProjectsCount,
          ordersCount: orders.length,
          pendingOrdersCount,
        },
        membership: membership
          ? {
              status: membership.status,
              planId: membership.planId,
              renewalDate: membership.renewalDate,
              entitlements: membership.entitlements,
            }
          : null,
        projects: projects.slice(0, 10),
        milestones: milestones.slice(0, 10),
        recentInquiries: inquiries.slice(0, 5),
        quotes: quotes.slice(0, 5),
        recentOrders: orders.slice(0, 10),
        refunds,
      },
    });
  } catch (err) {
    next(err);
  }
};
