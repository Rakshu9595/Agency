import { Router } from 'express';
import {
  handleGetAdminSummary,
  handleGetAdminInquiries,
  handleUpdateInquiryStatus,
  handleGetAdminProjects,
  handleUpdateProjectStage,
  handleCreateProjectUpdate,
  handleAddProjectMilestone,
  handleSetMilestonePayable,
  handleGetAdminPayments,
  handleProcessRefund,
  handleGetLeads,
  handleGetLeadById,
  handleUpdateLead,
} from '../controllers/admin.controller.js';
import { handleCreateQuote } from '../controllers/quote.controller.js';
import {
  handleGetContent,
  handleUpdateContent,
  handleGetServicesList,
  handleCreateService,
  handleUpdateService,
  handleDeleteService,
  handleGetPortfolioList,
  handleCreatePortfolioItem,
  handleUpdatePortfolioItem,
  handleDeletePortfolioItem,
  handleGetBlogList,
  handleCreateBlogPost,
  handleUpdateBlogPost,
  handleDeleteBlogPost,
  handleGetTestimonialsList,
  handleCreateTestimonial,
  handleUpdateTestimonial,
  handleDeleteTestimonial,
  handleGetFaqsList,
  handleCreateFaq,
  handleUpdateFaq,
  handleDeleteFaq,
  handleGetCustomers,
  handleGetCustomerDetail,
  handleUpdateCustomerStatus,
  handleGetInquiryDetail,
  handleAssignInquiry,
  handleAddInquiryNote,
  handleGetAdminQuotes,
  handleGetQuoteDetail,
  handleUpdateQuote,
  handleCreateAdminProject,
  handleUpdateMilestoneStatus,
  handleInitiateRefund,
  handleRecordManualPayment,
  handleGetMediaList,
  handleUploadMedia,
  handleDeleteMedia,
  handleGetSeo,
  handleUpdateSeo,
  handleRegenerateSitemap,
  handleGetSettings,
  handleUpdateSettings,
  handleGetAdminUsers,
  handleInviteAdminUser,
  handleUpdateUserPermissions,
  handleUpdateUserStatus,
  handleDeleteAdminUser,
  handleGetAuditLogs,
  handleGetAdminProfile,
  handleUpdateAdminProfile,
  handleUpdateAdminPassword,
  handleExportData,
} from '../controllers/admin-cms.controller.js';
import {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  requirePermission,
  requireAdminAuth,
} from '../middleware/auth.middleware.js';

const router = Router();

// ==========================================
// Phase 2 Lead compatibility (for tests)
// ==========================================
router.get('/leads', requireAdminAuth, handleGetLeads);
router.get('/leads/:id', requireAdminAuth, handleGetLeadById);
router.patch('/leads/:id', requireAdminAuth, handleUpdateLead);

// All routes below require standard admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// ==========================================
// 1. Dashboard Overview & Profile
// ==========================================
router.get('/summary', handleGetAdminSummary);
router.get('/profile', handleGetAdminProfile);
router.put('/profile', handleUpdateAdminProfile);
router.put('/profile/password', handleUpdateAdminPassword);

// ==========================================
// 2. CMS Website Content Management
// ==========================================
router.get('/content/:section', requirePermission('content.manage'), handleGetContent);
router.put('/content/:section', requirePermission('content.manage'), handleUpdateContent);

// ==========================================
// 3. Services Management
// ==========================================
router.get('/services', requirePermission('services.manage'), handleGetServicesList);
router.post('/services', requirePermission('services.manage'), handleCreateService);
router.put('/services/:id', requirePermission('services.manage'), handleUpdateService);
router.delete('/services/:id', requirePermission('services.manage'), handleDeleteService);

// ==========================================
// 4. Portfolio Management
// ==========================================
router.get('/portfolio', requirePermission('portfolio.manage'), handleGetPortfolioList);
router.post('/portfolio', requirePermission('portfolio.manage'), handleCreatePortfolioItem);
router.put('/portfolio/:id', requirePermission('portfolio.manage'), handleUpdatePortfolioItem);
router.delete('/portfolio/:id', requirePermission('portfolio.manage'), handleDeletePortfolioItem);

// ==========================================
// 5. Blog & Articles Management
// ==========================================
router.get('/blog', requirePermission('content.manage'), handleGetBlogList);
router.post('/blog', requirePermission('content.manage'), handleCreateBlogPost);
router.put('/blog/:id', requirePermission('content.manage'), handleUpdateBlogPost);
router.delete('/blog/:id', requirePermission('content.manage'), handleDeleteBlogPost);

// ==========================================
// 6. Testimonials & FAQs Management
// ==========================================
router.get('/testimonials', requirePermission('content.manage'), handleGetTestimonialsList);
router.post('/testimonials', requirePermission('content.manage'), handleCreateTestimonial);
router.put('/testimonials/:id', requirePermission('content.manage'), handleUpdateTestimonial);
router.delete('/testimonials/:id', requirePermission('content.manage'), handleDeleteTestimonial);

router.get('/faqs', requirePermission('content.manage'), handleGetFaqsList);
router.post('/faqs', requirePermission('content.manage'), handleCreateFaq);
router.put('/faqs/:id', requirePermission('content.manage'), handleUpdateFaq);
router.delete('/faqs/:id', requirePermission('content.manage'), handleDeleteFaq);

// ==========================================
// 7. Customers Management
// ==========================================
router.get('/customers', requirePermission('customers.read'), handleGetCustomers);
router.get('/customers/:id', requirePermission('customers.read'), handleGetCustomerDetail);
router.patch('/customers/:id/status', requirePermission('customers.manage'), handleUpdateCustomerStatus);

// ==========================================
// 8. Project Inquiries Management
// ==========================================
router.get('/inquiries', requirePermission('inquiries.manage'), handleGetAdminInquiries);
router.get('/inquiries/:id', requirePermission('inquiries.manage'), handleGetInquiryDetail);
router.patch('/inquiries/:id/status', requirePermission('inquiries.manage'), handleUpdateInquiryStatus);
router.patch('/inquiries/:id/assign', requirePermission('inquiries.manage'), handleAssignInquiry);
router.post('/inquiries/:id/notes', requirePermission('inquiries.manage'), handleAddInquiryNote);

// ==========================================
// 9. Quotations & Proposals
// ==========================================
router.get('/quotes', requirePermission('quotations.manage'), handleGetAdminQuotes);
router.get('/quotes/:id', requirePermission('quotations.manage'), handleGetQuoteDetail);
router.post('/quotes', requirePermission('quotations.manage'), handleCreateQuote);
router.put('/quotes/:id', requirePermission('quotations.manage'), handleUpdateQuote);

// ==========================================
// 10. Projects & Milestones Tracking
// ==========================================
router.get('/projects', requirePermission('projects.manage'), handleGetAdminProjects);
router.post('/projects', requirePermission('projects.manage'), handleCreateAdminProject);
router.patch('/projects/:id/stage', requirePermission('projects.manage'), handleUpdateProjectStage);
router.post('/projects/:id/updates', requirePermission('projects.manage'), handleCreateProjectUpdate);
router.post('/projects/:id/milestones', requirePermission('projects.manage'), handleAddProjectMilestone);
router.patch('/milestones/:id/status', requirePermission('projects.manage'), handleUpdateMilestoneStatus);
router.patch('/milestones/:id/payable', requirePermission('projects.manage'), handleSetMilestonePayable);

// ==========================================
// 11. Payments & Refunds
// ==========================================
router.get('/payments', requirePermission('payments.read'), handleGetAdminPayments);
router.post('/payments/record-manual', requirePermission('payments.manage'), handleRecordManualPayment);
router.patch('/refunds/:id', requirePermission('payments.manage'), handleProcessRefund);
router.post('/refunds/initiate', requirePermission('payments.manage'), handleInitiateRefund);

// ==========================================
// 12. Media Library
// ==========================================
router.get('/media', requirePermission('content.manage'), handleGetMediaList);
router.post('/media/upload', requirePermission('content.manage'), handleUploadMedia);
router.delete('/media/:id', requirePermission('content.manage'), handleDeleteMedia);

// ==========================================
// 13. SEO Control Center
// ==========================================
router.get('/seo', requirePermission('seo.manage'), handleGetSeo);
router.put('/seo', requirePermission('seo.manage'), handleUpdateSeo);
router.post('/seo/regenerate-sitemap', requirePermission('seo.manage'), handleRegenerateSitemap);

// ==========================================
// 14. Website Settings & Configuration
// ==========================================
router.get('/settings', requirePermission('settings.manage'), handleGetSettings);
router.put('/settings', requireSuperAdmin, handleUpdateSettings);

// ==========================================
// 15. Admin Users & Permissions (Super Admin only)
// ==========================================
router.get('/users', requireSuperAdmin, handleGetAdminUsers);
router.post('/users/invite', requireSuperAdmin, handleInviteAdminUser);
router.patch('/users/:id/permissions', requireSuperAdmin, handleUpdateUserPermissions);
router.patch('/users/:id/status', requireSuperAdmin, handleUpdateUserStatus);
router.delete('/users/:id', requireSuperAdmin, handleDeleteAdminUser);

// ==========================================
// 16. Audit Logs & System Export (Super Admin only)
// ==========================================
router.get('/audit-logs', requireSuperAdmin, handleGetAuditLogs);
router.get('/backup/export', requireSuperAdmin, handleExportData);

export default router;
