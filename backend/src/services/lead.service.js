import { Lead } from '../models/Lead.js';
import { generateReferenceId } from '../utils/generate-reference.js';
import { AppError } from '../utils/api-response.js';

/**
 * Lead business logic and persistence service
 */
export const leadService = {
  /**
   * Persist a new validated lead inquiry into MongoDB.
   *
   * @param {Object} leadInput - Validated lead inquiry data
   * @returns {Promise<{ referenceId: string }>} Public confirmation data
   */
  async createLead(leadInput) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      const referenceId = generateReferenceId('LEAD');

      try {
        const leadDoc = new Lead({
          ...leadInput,
          referenceId,
          source: 'website',
          status: 'new',
        });

        // Save to MongoDB and await confirmation
        const savedLead = await leadDoc.save();

        if (!savedLead || !savedLead.referenceId) {
          throw new AppError('Database did not confirm persistence of the inquiry.', 500);
        }

        return {
          referenceId: savedLead.referenceId,
        };
      } catch (error) {
        // Handle rare reference ID collision by retrying
        if (error.code === 11000 && error.keyPattern && error.keyPattern.referenceId) {
          if (attempt >= maxRetries) {
            console.error('[Lead Service] Reference ID generation collision limit exceeded.');
            throw new AppError('Unable to generate a unique inquiry reference. Please try again.', 500);
          }
          continue; // Retry with a newly generated reference ID
        }

        // Re-throw other errors for controller/middleware handling
        console.error(`[Lead Service Error] Failed to persist lead: ${error.message}`);
        throw error;
      }
    }
  },
};
