import { FileCheck2, LockKeyhole, Scale } from "lucide-react";
import { LucideIcon } from "lucide-react";

export type LegalPageContent = {
  slug: string;
  title: string;
  eyebrow: string;
  updated: string;
  summary: string;
  icon: LucideIcon;
  accent: "teal";
  highlights: string[];
  sections: Array<{
    title: string;
    body: string[];
  }>;
};

export const legalPages: LegalPageContent[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    eyebrow: "Legal & Compliance",
    updated: "Last updated June 3, 2026",
    summary:
      "Aarogya360 is built for sensitive healthcare workflows. This policy explains how we collect, use, protect, and disclose information across our website, demos, and platform services.",
    icon: LockKeyhole,
    accent: "teal",
    highlights: [
      "Protected health information is handled only for care coordination, support, and contracted service delivery.",
      "Administrative, technical, and physical safeguards are applied across product and operational systems.",
      "Customers retain control of patient data and may request access, correction, export, or deletion where applicable.",
    ],
    sections: [
      {
        title: "Information We Collect",
        body: [
          "We may collect business contact details, account information, demo requests, support communications, usage signals, device data, and information submitted through the Aarogya360 platform.",
          "When a covered entity or healthcare organization uses Aarogya360, patient information may include demographic, clinical, care-team, document, referral, notification, and lifecycle workflow data needed to deliver the service.",
        ],
      },
      {
        title: "How We Use Information",
        body: [
          "We use information to provide the platform, coordinate patient lifecycle workflows, secure accounts, respond to support requests, improve product reliability, and meet contractual and legal obligations.",
          "We do not sell protected health information. We do not use patient data for unrelated advertising or profiling.",
        ],
      },
      {
        title: "Security & Retention",
        body: [
          "Aarogya360 uses role-based access controls, encryption in transit, audit-oriented operations, least-privilege practices, and monitoring designed for healthcare environments.",
          "Data is retained according to customer agreements, applicable law, and operational requirements. Deletion or export requests are processed through the appropriate account administrator or contractual channel.",
        ],
      },
      {
        title: "Contact",
        body: [
          "For privacy questions or requests, contact the Aarogya360 team through the Contact page or the support channel listed in your service agreement.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Service",
    eyebrow: "Platform Terms",
    updated: "Effective June 3, 2026",
    summary:
      "These terms define the rules for accessing Aarogya360 websites, demos, and hosted services. Customer subscriptions may also be governed by a signed order form or master agreement.",
    icon: Scale,
    accent: "teal",
    highlights: [
      "Use the platform only for authorized healthcare, administrative, and operational purposes.",
      "Customers are responsible for user access, permissions, and data submitted by their organization.",
      "Production use is governed by the applicable service agreement, order form, and compliance attachments.",
    ],
    sections: [
      {
        title: "Account Responsibilities",
        body: [
          "Users must keep credentials confidential, access only the information they are authorized to view, and promptly report suspected misuse or security incidents.",
          "Organizations are responsible for configuring roles, maintaining accurate user information, and ensuring their personnel follow applicable clinical and privacy obligations.",
        ],
      },
      {
        title: "Acceptable Use",
        body: [
          "You may not interfere with platform security, attempt unauthorized access, upload malicious content, reverse engineer protected services, or use Aarogya360 in a way that violates law or patient privacy obligations.",
          "Clinical users remain responsible for professional judgment. Aarogya360 supports care coordination and documentation workflows but does not replace licensed clinical decision-making.",
        ],
      },
      {
        title: "Service Changes",
        body: [
          "We may improve, update, or discontinue parts of the website or demo experience. Material production service changes are handled under the applicable customer agreement.",
          "Beta, pilot, or preview features may be changed or withdrawn and may be subject to additional terms.",
        ],
      },
      {
        title: "Limitation",
        body: [
          "To the maximum extent permitted by law, Aarogya360 is not liable for indirect, incidental, or consequential damages arising from website or demo use. Contracted platform use follows the limits in the signed agreement.",
        ],
      },
    ],
  },
  {
    slug: "baa",
    title: "Business Associate Agreement",
    eyebrow: "HIPAA Framework",
    updated: "Framework updated June 3, 2026",
    summary:
      "Aarogya360 supports Business Associate Agreement workflows for eligible covered entities and healthcare customers that require HIPAA-aligned handling of protected health information.",
    icon: FileCheck2,
    accent: "teal",
    highlights: [
      "BAA coverage is available for contracted healthcare customers before production PHI processing.",
      "Safeguards are designed around access control, auditability, incident response, and vendor accountability.",
      "Subprocessor and security commitments are reviewed as part of onboarding and enterprise procurement.",
    ],
    sections: [
      {
        title: "When a BAA Applies",
        body: [
          "A BAA applies when Aarogya360 creates, receives, maintains, or transmits protected health information on behalf of an eligible covered entity or business associate.",
          "Demo forms and public website interactions should not be used to submit protected health information unless an applicable agreement is already in place.",
        ],
      },
      {
        title: "Aarogya360 Commitments",
        body: [
          "Aarogya360 will use and disclose PHI only as permitted by the BAA, customer agreement, or applicable law. We maintain safeguards intended to protect confidentiality, integrity, and availability.",
          "We support breach notification, access restriction, amendment, accounting, and return or destruction workflows according to the signed agreement.",
        ],
      },
      {
        title: "Customer Responsibilities",
        body: [
          "Customers are responsible for ensuring they have authority to provide PHI, assigning appropriate user access, maintaining accurate notices and consents, and using the platform within their compliance program.",
          "Customer administrators should promptly remove access for workforce members who no longer require it.",
        ],
      },
      {
        title: "Requesting a BAA",
        body: [
          "To request or review a BAA, contact Aarogya360 through the Contact page. The BAA is finalized with the commercial agreement before production PHI is processed.",
        ],
      },
    ],
  },
];

export function getLegalPage(slug: string) {
  return legalPages.find((page) => page.slug === slug);
}
