import { Membership } from '../models/Membership.js';
import { MembershipPlan } from '../models/MembershipPlan.js';
import { DEFAULT_MEMBERSHIP_PLANS } from '../config/seed-data.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { isDatabaseConnected, memoryStore } from '../utils/memory-store.js';

export const handleGetPlans = async (req, res, next) => {
  try {
    let plans = [];
    if (isDatabaseConnected()) {
      try {
        plans = await MembershipPlan.find({ status: 'active' }).sort({ price: 1 });
      } catch (e) {}
    }

    if (!plans || plans.length === 0) {
      plans = DEFAULT_MEMBERSHIP_PLANS.filter((p) => p.status === 'active');
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Membership plans retrieved successfully',
      data: {
        plans,
        total: plans.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetMyMembership = async (req, res, next) => {
  try {
    let membership = isDatabaseConnected()
      ? await Membership.findOne({ customerId: req.user.id }).populate('planRef').populate('orderId')
      : memoryStore.findMembershipByCustomer(req.user.id);

    if (!membership) {
      return sendSuccess(res, {
        statusCode: 200,
        message: 'No active membership',
        data: {
          hasMembership: false,
          membership: null,
          entitlements: [],
        },
      });
    }

    const planDetails = DEFAULT_MEMBERSHIP_PLANS.find((p) => p.planId === membership.planId) || {};

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Membership details retrieved',
      data: {
        hasMembership: membership.status === 'active',
        membership: {
          id: membership._id || membership.id,
          planId: membership.planId,
          planName: planDetails.name || membership.planId,
          status: membership.status,
          startDate: membership.startDate,
          renewalDate: membership.renewalDate,
          cancellationScheduledDate: membership.cancellationScheduledDate,
          entitlements: membership.entitlements,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const handleCancelMembership = async (req, res, next) => {
  try {
    let membership = isDatabaseConnected()
      ? await Membership.findOne({ customerId: req.user.id, status: 'active' })
      : memoryStore.findMembershipByCustomer(req.user.id);

    if (!membership || membership.status !== 'active') {
      return sendError(res, {
        statusCode: 404,
        message: 'No active membership found to cancel.',
      });
    }

    const renewalDate = membership.renewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    membership.status = 'cancelled';
    membership.cancellationScheduledDate = renewalDate;
    membership.cancelledAt = new Date();
    if (typeof membership.save === 'function') await membership.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Membership cancellation confirmed. Your premium access remains active until the end of your paid billing period.',
      data: {
        status: membership.status,
        accessUntil: membership.cancellationScheduledDate,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetMyEntitlements = async (req, res, next) => {
  try {
    const membership = isDatabaseConnected()
      ? await Membership.findOne({ customerId: req.user.id, status: 'active' })
      : memoryStore.findMembershipByCustomer(req.user.id);

    const entitlements = membership && membership.status === 'active' ? membership.entitlements : [];

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Authorized entitlements retrieved',
      data: {
        entitlements,
      },
    });
  } catch (err) {
    next(err);
  }
};
