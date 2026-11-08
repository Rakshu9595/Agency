import { Project } from '../models/Project.js';
import { Milestone } from '../models/Milestone.js';
import { ProjectUpdate } from '../models/ProjectUpdate.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { isDatabaseConnected, memoryStore } from '../utils/memory-store.js';

export const PORTFOLIO_PROJECTS = [
  {
    slug: 'fintech-flow',
    title: 'FintechFlow — Smart Wealth & Billing Core',
    category: 'Full-Stack Platform',
    summary: 'A secure cloud platform facilitating real-time transactions, automated invoice reconciliation, and customer analytics for over 45,000 active users.',
    client: 'Fintech Ventures Global',
    timeline: '6 weeks',
    techStack: ['Node.js', 'Express', 'MongoDB Atlas', 'Razorpay', 'Bootstrap 5', 'Redis'],
    metrics: [
      { label: 'Uptime', value: '99.98%' },
      { label: 'Transactions Processed', value: '₹4.2 Cr+' },
      { label: 'Latency', value: '< 85ms' }
    ],
    features: [
      'Role-based access controls and encrypted transaction ledger',
      'Automated invoice generation and Razorpay webhook reconciliation',
      'Interactive customer financial dashboard and statements'
    ],
    featured: true
  },
  {
    slug: 'medconnect-ai',
    title: 'MedConnect — Clinical RAG & Protocol Assistant',
    category: 'AI & Data Engineering',
    summary: 'An intelligent retrieval-augmented assistant aiding clinical researchers in synthesizing 12,000+ medical journals and pharmacology whitepapers.',
    client: 'Apex Health Systems',
    timeline: '4 weeks',
    techStack: ['Python', 'Node.js', 'Vector DB', 'OpenAI API', 'Bootstrap 5'],
    metrics: [
      { label: 'Search Speedup', value: '14x faster' },
      { label: 'Documents Ingested', value: '12,500+' },
      { label: 'Accuracy Rating', value: '96.4%' }
    ],
    features: [
      'Semantic document search with citations and page references',
      'Streaming responses with real-time UI rendering',
      'Strict clinical guardrails and token usage throttling'
    ],
    featured: true
  },
  {
    slug: 'nexus-commerce',
    title: 'NexusStore — Ultra-Fast Headless Storefront',
    category: 'E-Commerce Development',
    summary: 'High-converting custom digital apparel storefront with sub-second page transitions, dynamic inventory reservation, and 1-click checkout.',
    client: 'Nexus Threads Lifestyle',
    timeline: '3 weeks',
    techStack: ['Vanilla JavaScript', 'Bootstrap 5', 'Express REST API', 'Razorpay', 'MongoDB'],
    metrics: [
      { label: 'Conversion Lift', value: '+32%' },
      { label: 'Page Load Time', value: '0.6s' },
      { label: 'Cart Dropoff Reduction', value: '-18%' }
    ],
    features: [
      'Zero-framework lightweight client bundle (< 40kb)',
      'Automated inventory deduction upon webhook verification',
      'Instant SMS/Email receipt generation'
    ],
    featured: true
  },
  {
    slug: 'edupulse-lms',
    title: 'EduPulse — Collaborative Academic Learning System',
    category: 'Academic & Mentorship',
    summary: 'Interactive portal for university students and faculty managing real-time peer code reviews, automated assignment grading, and live workshops.',
    client: 'University Tech Innovation Lab',
    timeline: '5 weeks',
    techStack: ['Node.js', 'Express', 'MongoDB', 'Docker', 'Bootstrap 5'],
    metrics: [
      { label: 'Active Students', value: '3,200+' },
      { label: 'Submissions Graded', value: '28,000+' },
      { label: 'Student Satisfaction', value: '4.9/5' }
    ],
    features: [
      'Automated code testing and plagiarism evaluation',
      'Integrated payment checkout for workshop tickets',
      'Student project portfolio showcases'
    ],
    featured: false
  }
];

// --- Public Portfolio Handlers ---
export const handleGetProjects = async (req, res) => {
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Portfolio projects retrieved successfully',
    data: {
      projects: PORTFOLIO_PROJECTS,
      total: PORTFOLIO_PROJECTS.length,
    },
  });
};

export const handleGetProjectBySlug = async (req, res) => {
  const { slug } = req.params;
  const project = PORTFOLIO_PROJECTS.find((p) => p.slug === slug.toLowerCase());

  if (!project) {
    return sendError(res, {
      statusCode: 404,
      message: `Project case study '${slug}' not found`,
    });
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Project retrieved successfully',
    data: { project },
  });
};

// --- Client On-Demand Project Handlers ---
export const handleGetMyProjects = async (req, res, next) => {
  try {
    let projects;
    if (isDatabaseConnected()) {
      projects = await Project.find({ customerId: req.user.id })
        .sort({ createdAt: -1 })
        .populate('quoteId')
        .populate('inquiryId');
    } else {
      projects = memoryStore.findProjectsByCustomer(req.user.id);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Client projects retrieved successfully',
      data: {
        projects,
        total: projects.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetClientProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let project;

    if (isDatabaseConnected()) {
      project = id.match(/^[0-9a-fA-F]{24}$/)
        ? await Project.findById(id).populate('quoteId').populate('inquiryId')
        : await Project.findOne({ projectReference: id.toUpperCase().trim() }).populate('quoteId').populate('inquiryId');
    } else {
      project = memoryStore.findProjectById(id) || memoryStore.findProjectByReference(id);
    }

    if (!project) {
      return sendError(res, { statusCode: 404, message: 'Project not found' });
    }

    const isOwner = project.customerId && String(project.customerId) === String(req.user.id);
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendError(res, { statusCode: 403, message: 'Unauthorized to view this project' });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Project details retrieved successfully',
      data: { project },
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetProjectUpdates = async (req, res, next) => {
  try {
    const { id } = req.params;
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

    const isOwner = project.customerId && String(project.customerId) === String(req.user.id);
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendError(res, { statusCode: 403, message: 'Unauthorized' });
    }

    let updates;
    if (isDatabaseConnected()) {
      updates = await ProjectUpdate.find({ projectId: project._id }).sort({ createdAt: -1 });
    } else {
      updates = memoryStore.findUpdatesByProject(project._id || project.id);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Project updates retrieved',
      data: { updates },
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetProjectMilestones = async (req, res, next) => {
  try {
    const { id } = req.params;
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

    const isOwner = project.customerId && String(project.customerId) === String(req.user.id);
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendError(res, { statusCode: 403, message: 'Unauthorized' });
    }

    let milestones;
    if (isDatabaseConnected()) {
      milestones = await Milestone.find({ projectId: project._id }).sort({ order: 1 });
    } else {
      milestones = memoryStore.findMilestonesByProject(project._id || project.id);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Project milestones retrieved',
      data: { milestones },
    });
  } catch (err) {
    next(err);
  }
};
