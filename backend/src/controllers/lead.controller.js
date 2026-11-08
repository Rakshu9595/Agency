import { leadService } from '../services/lead.service.js';
import { sendSuccess } from '../utils/api-response.js';

/**
 * Handle new lead submission
 */
export const handleCreateLead = async (req, res, next) => {
  try {
    const result = await leadService.createLead(req.validatedBody);

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Your project inquiry has been received.',
      data: {
        referenceId: result.referenceId,
      },
    });
  } catch (error) {
    next(error);
  }
};
