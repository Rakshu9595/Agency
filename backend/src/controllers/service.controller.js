import { Service } from '../models/Service.js';
import { DEFAULT_SERVICES } from '../config/seed-data.js';
import { sendSuccess, sendError } from '../utils/api-response.js';

export const handleGetServices = async (req, res, next) => {
  try {
    let services = [];
    try {
      services = await Service.find({ status: 'active' }).sort({ isPopular: -1, createdAt: 1 });
    } catch (err) {
      // In offline / mock test situations
    }

    if (!services || services.length === 0) {
      services = DEFAULT_SERVICES.filter((s) => s.status === 'active');
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Services retrieved successfully',
      data: {
        services,
        total: services.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetServiceBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    let service = null;

    try {
      service = await Service.findOne({ slug: slug.toLowerCase(), status: 'active' });
    } catch (err) {}

    if (!service) {
      service = DEFAULT_SERVICES.find((s) => s.slug === slug.toLowerCase() && s.status === 'active');
    }

    if (!service) {
      return sendError(res, {
        statusCode: 404,
        message: `Service with slug '${slug}' not found`,
      });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Service details retrieved',
      data: {
        service,
      },
    });
  } catch (err) {
    next(err);
  }
};
