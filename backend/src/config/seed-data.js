export const DEFAULT_SERVICES = [
  {
    name: 'Landing Page & Funnel Design',
    slug: 'landing-page',
    category: 'Web Design & Growth',
    tagline: 'High-converting single-page digital experiences built for fast conversions.',
    description: 'A focused, responsive landing page tailored for software launches, startup MVPs, or advertising campaigns. Includes modern copywriting integration, fast asset loading, and lead capture hooks.',
    startingPrice: 4999,
    currency: 'INR',
    estimatedTimeline: '3-7 days',
    deliverables: [
      'Custom modern responsive design',
      'Mobile-first responsive optimization',
      'Interactive hero and animated metrics',
      'Form validation and backend webhook integration',
      'On-page SEO and Open Graph metadata setup'
    ],
    features: ['1 Landing page', 'Lead capture form', 'Analytics hook', '30-day bug warranty'],
    packages: [
      {
        id: 'landing-starter',
        name: 'Starter Landing',
        price: 4999,
        description: 'Clean single page launch site',
        timeline: '3-5 days',
        features: ['Up to 5 sections', 'Contact / Lead form', 'Mobile responsive']
      },
      {
        id: 'landing-pro',
        name: 'Growth Funnel',
        price: 7999,
        description: 'Interactive conversion-focused funnel with custom animations',
        timeline: '5-7 days',
        features: ['Up to 8 sections', 'A/B hero copy ready', 'Custom animations', 'Speed optimization']
      }
    ],
    isPopular: false,
    status: 'active'
  },
  {
    name: 'Business & Agency Website',
    slug: 'business-website',
    category: 'Web Development',
    tagline: 'Multi-page corporate and agency web platforms that command industry authority.',
    description: 'Complete multi-page presence showcasing agency capabilities, case studies, team profiles, service catalogs, and interactive quote generators.',
    startingPrice: 12999,
    currency: 'INR',
    estimatedTimeline: '1-3 weeks',
    deliverables: [
      'Up to 8 structured content pages',
      'Interactive navigation with active route highlights',
      'Dynamic inquiry and service booking workflow',
      'Clean typography and accessible color palettes',
      'Schema markup, sitemap.xml and robots.txt'
    ],
    features: ['8 Complete pages', 'Service booking form', 'Portfolio filter', 'Admin portal ready'],
    packages: [
      {
        id: 'biz-standard',
        name: 'Standard Business',
        price: 12999,
        description: 'Professional agency presence',
        timeline: '1-2 weeks',
        features: ['5 Core pages', 'Case study section', 'Contact forms']
      },
      {
        id: 'biz-advanced',
        name: 'Enterprise Authority',
        price: 18999,
        description: 'Full portfolio, pricing calculators, and client portals',
        timeline: '2-3 weeks',
        features: ['Up to 10 pages', 'Custom project estimators', 'Priority delivery']
      }
    ],
    isPopular: true,
    status: 'active'
  },
  {
    name: 'Full-Stack MVP Development',
    slug: 'fullstack-mvp',
    category: 'Software Engineering',
    tagline: 'End-to-end web applications with databases, authentication, and payments.',
    description: 'Transform an idea into an active software product. Complete frontend client, scalable Node.js API, MongoDB database, customer dashboard, and payment checkout integration.',
    startingPrice: 39999,
    currency: 'INR',
    estimatedTimeline: '3-6 weeks',
    deliverables: [
      'Role-based authentication & session tokens',
      'REST API architecture with rate limiting & helmet',
      'MongoDB schemas, indexes, and aggregation queries',
      'Razorpay payment checkout & webhook listener',
      'Customer dashboard with live transaction history'
    ],
    features: ['Auth system', 'Database integration', 'Razorpay checkout', 'Customer dashboard', 'Production deployment'],
    packages: [
      {
        id: 'mvp-lite',
        name: 'Core MVP',
        price: 39999,
        description: 'Essential product features with working auth and checkout',
        timeline: '3-4 weeks',
        features: ['Full authentication', 'Core CRUD workflow', 'Payment integration']
      },
      {
        id: 'mvp-pro',
        name: 'Scale-Ready MVP',
        price: 59999,
        description: 'Advanced role permissions, analytics dashboards, and webhooks',
        timeline: '4-6 weeks',
        features: ['Multi-role dashboard', 'Advanced webhooks', 'Automated test suite']
      }
    ],
    isPopular: true,
    status: 'active'
  },
  {
    name: 'E-Commerce & Storefront Development',
    slug: 'ecommerce-platform',
    category: 'Commerce Solutions',
    tagline: 'Custom storefronts, shopping carts, inventory sync, and digital billing.',
    description: 'High-speed custom storefront designed for maximum checkout completion. Built with zero-bloat vanilla frontends and secure payment gateway webhooks.',
    startingPrice: 24999,
    currency: 'INR',
    estimatedTimeline: '2-4 weeks',
    deliverables: [
      'Product catalog and category filtering',
      'Persistent shopping cart & checkout flow',
      'Razorpay payment integration with automated receipts',
      'Order fulfillment status tracking',
      'Discount coupon and tax calculation logic'
    ],
    features: ['Custom product catalog', 'Cart & checkout', 'Payment gateway', 'Customer order history'],
    packages: [
      {
        id: 'ecom-starter',
        name: 'Standard Store',
        price: 24999,
        description: 'Custom e-commerce store with up to 50 products',
        timeline: '2-3 weeks',
        features: ['Cart & checkout', 'Razorpay gateway', 'Order management']
      }
    ],
    isPopular: false,
    status: 'active'
  },
  {
    name: 'AI & RAG Prototype Engineering',
    slug: 'ai-rag-prototypes',
    category: 'AI & Data Engineering',
    tagline: 'Intelligent search, generative AI integrations, and document intelligence.',
    description: 'Embed modern LLMs and vector search into your web applications. Build semantic search, intelligent chatbots, document summarizers, and automated workflow agents.',
    startingPrice: 19999,
    currency: 'INR',
    estimatedTimeline: '2-3 weeks',
    deliverables: [
      'OpenAI / Anthropic API backend integration',
      'Vector embeddings and retrieval-augmented generation',
      'Streaming responses with real-time UI render',
      'Prompt management and token usage monitoring',
      'Guardrails and fallback handling'
    ],
    features: ['RAG Pipeline', 'Chat interface', 'Document ingestion', 'Streaming responses'],
    packages: [
      {
        id: 'ai-starter',
        name: 'Chatbot & Search',
        price: 19999,
        description: 'Custom domain assistant with knowledge ingestion',
        timeline: '2 weeks',
        features: ['Document search', 'Custom knowledge base', 'Web embed widget']
      }
    ],
    isPopular: false,
    status: 'active'
  },
  {
    name: 'UI/UX Design & Interactive Prototypes',
    slug: 'ui-ux-design',
    category: 'Product Design',
    tagline: 'Figma prototypes, design systems, and developer-ready UI assets.',
    description: 'User-centered digital product interfaces designed for clarity and aesthetic impact. Includes comprehensive typography tokens, component libraries, and interactive flows.',
    startingPrice: 6999,
    currency: 'INR',
    estimatedTimeline: '1-2 weeks',
    deliverables: [
      'High-fidelity interactive Figma prototype',
      'Comprehensive design tokens (CSS variables)',
      'Responsive mobile & desktop artboards',
      'Developer handoff documentation'
    ],
    features: ['Complete Figma file', 'Interactive click-through prototype', 'Component library'],
    packages: [
      {
        id: 'design-basic',
        name: 'Essential UI Kit',
        price: 6999,
        description: 'Design system tokens and core pages',
        timeline: '1 week',
        features: ['Up to 5 screens', 'Component guide', 'Design tokens']
      }
    ],
    isPopular: false,
    status: 'active'
  },
  {
    name: 'Student Project Guidance & Debugging',
    slug: 'student-project-support',
    category: 'Mentorship & Academic Tech',
    tagline: 'Architectural guidance, code debugging, and deployment support for students.',
    description: 'Senior technical mentorship for computer science and engineering students building capstone projects, academic research prototypes, and hackathon submissions.',
    startingPrice: 3499,
    currency: 'INR',
    estimatedTimeline: '3-7 days',
    deliverables: [
      '1-on-1 Code architecture walkthrough',
      'Database schema review & query debugging',
      'REST API error troubleshooting',
      'Git workflow & cloud deployment assistance (Render/Vercel/MongoDB Atlas)'
    ],
    features: ['1-on-1 Mentorship', 'Live code review', 'Deployment guide', 'Interview prep tips'],
    packages: [
      {
        id: 'student-debug',
        name: 'Project Debug Session',
        price: 3499,
        description: 'Hands-on error fixing and architectural cleanup',
        timeline: '2-4 days',
        features: ['2 Code review sessions', 'Bug fixes', 'Deployment support']
      }
    ],
    isPopular: false,
    status: 'active'
  },
  {
    name: 'Maintenance & Cloud Retainer',
    slug: 'maintenance-support',
    category: 'DevOps & Maintenance',
    tagline: 'Monthly uptime monitoring, vulnerability patching, and minor feature updates.',
    description: 'Ensure your web application remains fast, secure, and operational 24/7. Includes regular dependency upgrades, MongoDB backups, SSL renewal checks, and monthly developer hours.',
    startingPrice: 2999,
    currency: 'INR',
    estimatedTimeline: 'Ongoing Monthly',
    deliverables: [
      '24/7 Endpoint health monitoring',
      'Automated weekly database backups',
      'Monthly security vulnerability auditing',
      'Up to 5 hours of monthly minor updates & bug fixes'
    ],
    features: ['Security audits', 'Weekly backups', '5 hours monthly edits', 'Fast incident response'],
    packages: [
      {
        id: 'retainer-standard',
        name: 'Basic Care',
        price: 2999,
        description: 'Essential monitoring and monthly patching',
        timeline: 'Monthly',
        features: ['Uptime monitor', 'Dependency patches', '3 Dev hours']
      }
    ],
    isPopular: false,
    status: 'active'
  }
];

export const DEFAULT_MEMBERSHIP_PLANS = [
  {
    planId: 'starter',
    name: 'Agency Starter Pass',
    description: 'Ideal for early-stage founders and small businesses needing on-demand technical consulting and discounted development rates.',
    price: 1999,
    currency: 'INR',
    billingInterval: 'monthly',
    features: [
      '10% Discount on all fixed-price service packages',
      'Priority email & ticket support (within 12 hours)',
      'Free monthly architectural audit (1 project)',
      'Access to exclusive software boilerplates & templates'
    ],
    entitlements: ['service_discount_10', 'priority_support', 'monthly_audit'],
    isPopular: false,
    status: 'active'
  },
  {
    planId: 'growth',
    name: 'Growth Partner Club',
    description: 'Our most popular membership for scaling businesses requiring continuous software shipping, design tweaks, and priority sprint bookings.',
    price: 4999,
    currency: 'INR',
    billingInterval: 'monthly',
    features: [
      '20% Discount on all development packages',
      'Dedicated Slack/Discord private channel with developers',
      'Guaranteed 48-hour sprint initiation on new requests',
      'Bi-weekly technical strategy calls',
      'Continuous dependency vulnerability patching'
    ],
    entitlements: ['service_discount_20', 'dedicated_channel', 'priority_support', 'biweekly_calls', 'fast_sprint_booking'],
    isPopular: true,
    status: 'active'
  },
  {
    planId: 'enterprise',
    name: 'Enterprise VIP Retainer',
    description: 'Full-spectrum dedicated technology partnership for high-growth operations and custom software estates.',
    price: 11999,
    currency: 'INR',
    billingInterval: 'monthly',
    features: [
      '30% Discount on custom software quote advances',
      'Direct phone & WhatsApp direct access with lead architect',
      '15 Included development & maintenance hours every month',
      'Automated nightly cloud backups and health telemetry',
      'Custom SLA guarantees (4-hour critical response)'
    ],
    entitlements: ['service_discount_30', 'lead_architect_access', 'included_dev_hours_15', 'nightly_backups', 'sla_guarantee'],
    isPopular: false,
    status: 'active'
  }
];
