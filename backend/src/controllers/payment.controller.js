import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Quote } from '../models/Quote.js';
import { Project } from '../models/Project.js';
import { Milestone } from '../models/Milestone.js';
import { ProjectUpdate } from '../models/ProjectUpdate.js';
import { Service } from '../models/Service.js';
import { MembershipPlan } from '../models/MembershipPlan.js';
import { Membership } from '../models/Membership.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { Refund } from '../models/Refund.js';
import { DEFAULT_SERVICES, DEFAULT_MEMBERSHIP_PLANS } from '../config/seed-data.js';
import { razorpayService } from '../services/razorpay.service.js';
import { generateReferenceId } from '../utils/generate-reference.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { isDatabaseConnected, memoryStore } from '../utils/memory-store.js';

/**
 * Helper to find service by ID or slug with fallback to seed data.
 */
const resolveService = async (serviceIdOrSlug) => {
  if (!serviceIdOrSlug) return null;
  let service = null;
  if (isDatabaseConnected()) {
    try {
      if (/^[0-9a-fA-F]{24}$/.test(serviceIdOrSlug)) {
        service = await Service.findById(serviceIdOrSlug);
      }
      if (!service) {
        service = await Service.findOne({ slug: String(serviceIdOrSlug).toLowerCase() });
      }
    } catch (err) {}
  }

  if (!service) {
    service = DEFAULT_SERVICES.find(
      (s) => s.slug === String(serviceIdOrSlug).toLowerCase()
    );
  }
  return service;
};

/**
 * 1. Create a trusted server-side order for Razorpay checkout.
 */
export const handleCreatePaymentOrder = async (req, res, next) => {
  try {
    const {
      orderType,
      serviceSlug,
      packageId,
      quoteReference,
      milestoneId,
      membershipPlanId,
      clientSuppliedAmount,
    } = req.body;

    const customerId = req.user.id;
    let finalAmount = 0;
    let title = '';
    let description = '';
    let targetQuote = null;
    let targetService = null;

    // Check discount from active membership
    let discountPercent = 0;
    try {
      const activeMembership = isDatabaseConnected()
        ? await Membership.findOne({ customerId, status: 'active' })
        : memoryStore.findMembershipByCustomer(customerId);

      if (activeMembership && activeMembership.entitlements) {
        if (activeMembership.entitlements.includes('service_discount_30')) {
          discountPercent = 30;
        } else if (activeMembership.entitlements.includes('service_discount_20')) {
          discountPercent = 20;
        } else if (activeMembership.entitlements.includes('service_discount_10')) {
          discountPercent = 10;
        }
      }
    } catch (e) {}

    // A. Service Package Order
    if (orderType === 'service_package') {
      targetService = await resolveService(serviceSlug);
      if (!targetService) {
        return sendError(res, { statusCode: 404, message: 'Requested service was not found.' });
      }

      let matchedPackage = null;
      if (packageId && targetService.packages && targetService.packages.length > 0) {
        matchedPackage = targetService.packages.find((p) => p.id === packageId);
      }

      const basePrice = matchedPackage ? matchedPackage.price : targetService.startingPrice;
      finalAmount = basePrice;
      if (discountPercent > 0) {
        finalAmount = Math.round(basePrice * (1 - discountPercent / 100));
      }

      title = `${targetService.name}${matchedPackage ? ` - ${matchedPackage.name}` : ''}`;
      description = `Service booking for ${targetService.name}`;
    }
    // B. Project Advance or Milestone Payment
    else if (orderType === 'project_advance' || orderType === 'project_milestone') {
      if (!quoteReference) {
        return sendError(res, { statusCode: 400, message: 'Quote reference is required for project payments.' });
      }

      targetQuote = isDatabaseConnected()
        ? await Quote.findOne({ quoteReference: quoteReference.toUpperCase().trim() })
        : memoryStore.findQuoteByReference(quoteReference);

      if (!targetQuote) {
        return sendError(res, { statusCode: 404, message: 'Approved project quote not found.' });
      }

      if (String(targetQuote.customerId) !== String(customerId) && req.user.role !== 'admin') {
        return sendError(res, { statusCode: 403, message: 'Unauthorized to pay for this quote.' });
      }

      if (targetQuote.status !== 'approved') {
        return sendError(res, {
          statusCode: 400,
          message: `Quote is in '${targetQuote.status}' status. Payment can only be made on approved quotes.`,
        });
      }

      if (orderType === 'project_advance') {
        if (targetQuote.advancePaid) {
          return sendError(res, { statusCode: 400, message: 'Advance for this quote has already been paid.' });
        }
        finalAmount = targetQuote.advanceAmount;
        title = `${targetQuote.projectTitle} - Advance Kickoff Deposit`;
        description = `Project advance deposit for ${targetQuote.quoteReference}`;
      } else {
        const ms = (targetQuote.milestones || []).find((m) => m.milestoneId === milestoneId);
        if (!ms) {
          return sendError(res, { statusCode: 404, message: 'Milestone not found in quote.' });
        }
        if (ms.status === 'paid') {
          return sendError(res, { statusCode: 400, message: 'Milestone has already been paid.' });
        }
        finalAmount = ms.amount;
        title = `${targetQuote.projectTitle} - Milestone: ${ms.title}`;
        description = `Milestone payment for ${targetQuote.quoteReference}`;
      }
    }
    // C. Membership One-Time or Recurring
    else if (orderType === 'membership_one_time' || orderType === 'membership_subscription') {
      let plan = null;
      if (isDatabaseConnected()) {
        try {
          plan = await MembershipPlan.findOne({ planId: membershipPlanId, status: 'active' });
        } catch (e) {}
      }

      if (!plan) {
        plan = DEFAULT_MEMBERSHIP_PLANS.find((p) => p.planId === membershipPlanId);
      }

      if (!plan) {
        return sendError(res, { statusCode: 404, message: 'Membership plan not found.' });
      }

      finalAmount = plan.price;
      title = `Membership: ${plan.name}`;
      description = `Access pass for ${plan.name}`;
    } else {
      return sendError(res, { statusCode: 400, message: 'Invalid or unsupported order type.' });
    }

    // Tampering check: If client tried to submit custom price, reject if it doesn't match
    if (clientSuppliedAmount !== undefined && clientSuppliedAmount !== null) {
      if (Number(clientSuppliedAmount) !== finalAmount) {
        return sendError(res, {
          statusCode: 400,
          message: 'Client-supplied amount mismatch. Server-side authoritative pricing was altered.',
        });
      }
    }

    const orderReference = generateReferenceId('ORD');
    const amountInPaise = finalAmount * 100;

    const rzpOrder = await razorpayService.createOrder({
      amountInPaise,
      currency: 'INR',
      receipt: orderReference,
      notes: { orderReference, orderType, customerId },
    });

    const orderData = {
      orderReference,
      customerId,
      orderType,
      title,
      description,
      serviceId: targetService?._id || null,
      quoteId: targetQuote?._id || targetQuote?.id || null,
      milestoneId: milestoneId || null,
      membershipPlanId: membershipPlanId || null,
      razorpayOrderId: rzpOrder.id,
      amount: finalAmount,
      amountInPaise,
      currency: 'INR',
      orderStatus: 'created',
      paymentStatus: 'pending',
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
    };

    let localOrder = null;
    if (isDatabaseConnected()) {
      localOrder = new Order(orderData);
      await localOrder.save();
    } else {
      localOrder = memoryStore.saveOrder(orderData);
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Payment order created successfully',
      data: {
        orderReference: localOrder.orderReference,
        razorpayOrderId: rzpOrder.id,
        amount: finalAmount,
        amountInPaise,
        currency: 'INR',
        keyId: razorpayService.getPublicKey(),
        title,
        description,
        customer: {
          name: req.user.name,
          email: req.user.email,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Verify Razorpay Checkout callback and record verified payment.
 */
export const handleVerifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return sendError(res, {
        statusCode: 400,
        message: 'Missing required Razorpay payment verification parameters.',
      });
    }

    const order = isDatabaseConnected()
      ? await Order.findOne({ razorpayOrderId: razorpay_order_id })
      : memoryStore.findOrderByRazorpayId(razorpay_order_id);

    if (!order) {
      return sendError(res, { statusCode: 404, message: 'Associated order was not found.' });
    }

    if (String(order.customerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return sendError(res, { statusCode: 403, message: 'Unauthorized. Order belongs to another user.' });
    }

    // Idempotency check
    if (order.paymentStatus === 'paid') {
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Payment has already been verified and processed.',
        data: {
          orderReference: order.orderReference,
          paymentStatus: order.paymentStatus,
          receiptNumber: order.receiptNumber,
        },
      });
    }

    // Signature validity
    const isSignatureValid = razorpayService.verifyPaymentSignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    if (!isSignatureValid) {
      order.orderStatus = 'failed';
      order.paymentStatus = 'failed';
      if (typeof order.save === 'function') await order.save();

      return sendError(res, {
        statusCode: 400,
        message: 'Payment signature verification failed. Invalid or forged transaction signature.',
      });
    }

    // Duplicate payment check
    const existingPayment = isDatabaseConnected()
      ? await Payment.findOne({ razorpayPaymentId: razorpay_payment_id })
      : memoryStore.findPaymentByRazorpayId(razorpay_payment_id);

    if (existingPayment) {
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Payment previously recorded and verified.',
        data: {
          orderReference: order.orderReference,
          paymentStatus: 'paid',
          receiptNumber: order.receiptNumber,
        },
      });
    }

    order.orderStatus = 'completed';
    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    order.paidAt = new Date();
    if (typeof order.save === 'function') await order.save();

    const paymentData = {
      customerId: order.customerId,
      orderId: order._id || order.id,
      orderReference: order.orderReference,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      signatureVerified: true,
      amount: order.amount,
      currency: order.currency,
      status: 'captured',
      verifiedAt: new Date(),
    };

    if (isDatabaseConnected()) {
      const payment = new Payment(paymentData);
      await payment.save();
    } else {
      memoryStore.savePayment(paymentData);
    }

    // Domain reconciliation: Quote advance or milestone
    if (order.quoteId) {
      const quote = isDatabaseConnected()
        ? await Quote.findById(order.quoteId)
        : memoryStore.findQuoteById(order.quoteId);

      if (quote) {
        if (order.orderType === 'project_advance') {
          quote.advancePaid = true;
          if (quote.milestones && quote.milestones.length > 0) {
            quote.milestones[0].status = 'paid';
          }
        } else if (order.milestoneId && quote.milestones) {
          const ms = quote.milestones.find((m) => m.milestoneId === order.milestoneId);
          if (ms) ms.status = 'paid';
        }
        if (typeof quote.save === 'function') await quote.save();

        // Reconcile Project stage and paid amount
        try {
          let project = null;
          if (isDatabaseConnected()) {
            project = await Project.findOne({ quoteId: quote._id });
          } else {
            for (const p of memoryStore.projects.values()) {
              if (String(p.quoteId) === String(quote._id || quote.id)) { project = p; break; }
            }
          }
          if (project) {
            project.paidAmount = (project.paidAmount || 0) + order.amount;
            if (order.orderType === 'project_advance') {
              project.stage = 'design';
            }
            if (typeof project.save === 'function') await project.save();

            const updateData = {
              projectId: project._id || project.id,
              authorName: 'Agency Billing System',
              updateMessage: order.orderType === 'project_advance'
                ? `Advance kickoff payment of ${order.currency} ${order.amount} verified! Project moved to Design stage.`
                : `Milestone payment of ${order.currency} ${order.amount} verified!`,
              stage: project.stage,
            };
            if (isDatabaseConnected()) {
              const pu = new ProjectUpdate(updateData);
              await pu.save();
            } else {
              memoryStore.saveProjectUpdate(updateData);
            }
          }
        } catch (e) {}
      }
    }

    // Domain reconciliation: Membership activation
    if (order.membershipPlanId) {
      const plan = DEFAULT_MEMBERSHIP_PLANS.find((p) => p.planId === order.membershipPlanId);
      const entitlements = plan ? plan.entitlements : ['priority_support'];
      const membershipData = {
        customerId: order.customerId,
        planId: order.membershipPlanId,
        status: 'active',
        startDate: new Date(),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        entitlements,
        orderId: order._id || order.id,
      };

      if (isDatabaseConnected()) {
        await Membership.findOneAndUpdate(
          { customerId: order.customerId },
          membershipData,
          { upsert: true, new: true }
        );
      } else {
        memoryStore.saveMembership(membershipData);
      }
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Payment verified and confirmed successfully!',
      data: {
        orderReference: order.orderReference,
        paymentStatus: 'paid',
        amount: order.amount,
        currency: order.currency,
        razorpayPaymentId: razorpay_payment_id,
        receiptNumber: order.receiptNumber,
        paidAt: order.paidAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Handle asynchronous Razorpay Webhook events.
 */
export const handleWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const eventId = req.headers['x-razorpay-event-id'] || `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const rawBody = req.rawBody || JSON.stringify(req.body);
  const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);

  if (!isValid && process.env.NODE_ENV !== 'test') {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  const eventPayload = req.body || {};
  const eventType = eventPayload.event || 'unknown';

  const existingEvent = isDatabaseConnected()
    ? await WebhookEvent.findOne({ eventId })
    : memoryStore.findWebhookEvent(eventId);

  if (existingEvent && existingEvent.processingStatus === 'processed') {
    return res.status(200).json({ success: true, message: 'Webhook event already processed.' });
  }

  const webhookData = {
    eventId,
    eventType,
    processingStatus: 'received',
    payloadSummary: { event: eventType },
  };

  let webhookRecord = isDatabaseConnected()
    ? new WebhookEvent(webhookData)
    : memoryStore.saveWebhookEvent(webhookData);

  if (isDatabaseConnected()) await webhookRecord.save();

  try {
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = eventPayload.payload?.payment?.entity;
      if (paymentEntity) {
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;

        const order = isDatabaseConnected()
          ? await Order.findOne({ razorpayOrderId: orderId })
          : memoryStore.findOrderByRazorpayId(orderId);

        if (order && order.paymentStatus !== 'paid') {
          order.orderStatus = 'completed';
          order.paymentStatus = 'paid';
          order.razorpayPaymentId = paymentId;
          order.paidAt = new Date();
          if (typeof order.save === 'function') await order.save();
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = eventPayload.payload?.payment?.entity;
      if (paymentEntity) {
        const order = isDatabaseConnected()
          ? await Order.findOne({ razorpayOrderId: paymentEntity.order_id })
          : memoryStore.findOrderByRazorpayId(paymentEntity.order_id);

        if (order && order.paymentStatus === 'pending') {
          order.orderStatus = 'failed';
          order.paymentStatus = 'failed';
          if (typeof order.save === 'function') await order.save();
        }
      }
    }

    webhookRecord.processingStatus = 'processed';
    webhookRecord.processedAt = new Date();
    if (typeof webhookRecord.save === 'function') await webhookRecord.save();

    return res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (err) {
    webhookRecord.processingStatus = 'failed';
    webhookRecord.errorDetails = err.message;
    if (typeof webhookRecord.save === 'function') await webhookRecord.save();
    return res.status(500).json({ success: false, message: 'Error processing webhook event' });
  }
};

/**
 * 4. Paginated payment & order history.
 */
export const handleGetPaymentHistory = async (req, res, next) => {
  try {
    let orders = [];
    if (isDatabaseConnected()) {
      orders = await Order.find({ customerId: req.user.id }).sort({ createdAt: -1 });
    } else {
      orders = memoryStore.findOrdersByCustomer(req.user.id);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Payment history retrieved successfully',
      data: {
        orders,
        pagination: {
          page: 1,
          limit: orders.length,
          total: orders.length,
          pages: 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. Get status of a specific order.
 */
export const handleGetOrderStatus = async (req, res, next) => {
  try {
    const { orderReference } = req.params;
    const order = isDatabaseConnected()
      ? await Order.findOne({ orderReference: orderReference.toUpperCase().trim() })
      : memoryStore.findOrderByReference(orderReference);

    if (!order) {
      return sendError(res, { statusCode: 404, message: 'Order not found' });
    }

    if (String(order.customerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return sendError(res, { statusCode: 403, message: 'Unauthorized to view this order.' });
    }

    const payment = isDatabaseConnected()
      ? await Payment.findOne({ orderId: order._id })
      : memoryStore.findPaymentByOrderId(order._id || order.id);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Order status retrieved',
      data: { order, payment },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. Create a customer refund request.
 */
export const handleCreateRefundRequest = async (req, res, next) => {
  try {
    const { orderReference } = req.params;
    const { reason, amount } = req.body;

    if (!reason || reason.trim().length < 5) {
      return sendError(res, { statusCode: 400, message: 'Please provide a clear reason for the refund.' });
    }

    const order = isDatabaseConnected()
      ? await Order.findOne({ orderReference: orderReference.toUpperCase().trim() })
      : memoryStore.findOrderByReference(orderReference);

    if (!order) {
      return sendError(res, { statusCode: 404, message: 'Order not found.' });
    }

    if (String(order.customerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return sendError(res, { statusCode: 403, message: 'Unauthorized.' });
    }

    if (order.paymentStatus !== 'paid') {
      return sendError(res, { statusCode: 400, message: 'Refunds can only be requested on paid orders.' });
    }

    const refundData = {
      refundReference: generateReferenceId('RFND'),
      orderId: order._id || order.id,
      customerId: order.customerId,
      amount: amount ? Number(amount) : order.amount,
      currency: order.currency,
      reason: reason.trim(),
      status: 'requested',
    };

    let refund = null;
    if (isDatabaseConnected()) {
      refund = new Refund(refundData);
      await refund.save();
    } else {
      refund = memoryStore.saveRefund(refundData);
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Refund request submitted. Our billing team will review your case.',
      data: {
        refundReference: refund.refundReference,
        status: refund.status,
        amount: refund.amount,
        createdAt: refund.requestedAt || new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. Generate structured receipt details.
 */
export const handleGetReceipt = async (req, res, next) => {
  try {
    const { orderReference } = req.params;
    const order = isDatabaseConnected()
      ? await Order.findOne({ orderReference: orderReference.toUpperCase().trim() })
      : memoryStore.findOrderByReference(orderReference);

    if (!order) {
      return sendError(res, { statusCode: 404, message: 'Order not found.' });
    }

    if (String(order.customerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return sendError(res, { statusCode: 403, message: 'Unauthorized to view this receipt.' });
    }

    if (order.paymentStatus !== 'paid') {
      return sendError(res, {
        statusCode: 400,
        message: 'Receipts are only available for fully verified and paid transactions.',
      });
    }

    const payment = isDatabaseConnected()
      ? await Payment.findOne({ orderId: order._id })
      : memoryStore.findPaymentByOrderId(order._id || order.id);

    const receipt = {
      receiptNumber: order.receiptNumber,
      orderReference: order.orderReference,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      title: order.title,
      description: order.description,
      orderType: order.orderType,
      amount: order.amount,
      currency: order.currency,
      status: 'Paid',
      paymentMethod: payment?.method || 'Online Payment',
      paidAt: order.paidAt,
      agency: {
        name: 'Agenet Software Agency',
        address: 'Agency Technology Center, India',
        supportEmail: 'support@agenet.example.com',
      },
      customer: {
        name: req.user.name,
        email: req.user.email,
      },
    };

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Receipt generated successfully',
      data: { receipt },
    });
  } catch (err) {
    next(err);
  }
};
