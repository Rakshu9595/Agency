import mongoose from 'mongoose';

const siteSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global_settings',
    },
    general: {
      siteName: { type: String, default: 'Pravyuk' },
      tagline: { type: String, default: 'Your Vision. Our Build.' },
      brandPositioning: { type: String, default: 'Pravyuk is a modern website development agency that transforms ideas into professional digital experiences.' },
      logoUrl: { type: String, default: '/assets/images/pravyuk-logo-horizontal.svg' },
      faviconUrl: { type: String, default: '/assets/icons/favicon.svg' },
      primaryColor: { type: String, default: '#171717' },
      accentColor: { type: String, default: '#A58A58' },
      mutedGreen: { type: String, default: '#526B56' },
      defaultCurrency: { type: String, default: 'INR' },
      currencySymbol: { type: String, default: '₹' },
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
    contact: {
      businessEmail: { type: String, default: 'hello@pravyuk.com' },
      supportEmail: { type: String, default: 'support@pravyuk.com' },
      phone: { type: String, default: '+91 (080) 4120-8890' },
      address: { type: String, default: 'Bengaluru, Karnataka, India' },
      socials: {
        twitter: { type: String, default: 'https://twitter.com/pravyuk' },
        github: { type: String, default: 'https://github.com/pravyuk' },
        linkedin: { type: String, default: 'https://linkedin.com/company/pravyuk' },
      },
    },
    business: {
      isAcceptingInquiries: { type: Boolean, default: true },
      pricingVisible: { type: Boolean, default: true },
      maintenanceMode: { type: Boolean, default: false },
    },
    seo: {
      globalTitle: { type: String, default: 'Pravyuk | Professional Website Design & Development Agency' },
      globalDescription: { type: String, default: 'Pravyuk helps businesses, startups, and creators build professional websites, e-commerce stores, landing pages, and custom web applications. Your Vision. Our Build.' },
      canonicalUrl: { type: String, default: 'https://pravyuk.com' },
      ogImage: { type: String, default: '/assets/images/pravyuk-og.jpg' },
      robotsTxtContent: { type: String, default: '' },
    },
    lastUpdatedBy: {
      type: String,
      default: 'system',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const SiteSettings = mongoose.models.SiteSettings || mongoose.model('SiteSettings', siteSettingsSchema);
