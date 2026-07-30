/**
 * Verbatim content for the mandatory Terms of Service / Privacy Policy
 * acceptance screen, sourced from YouCollab_Terms_and_Privacy_Policy.docx.
 * Wording is copied as-is — only the document's own paragraph/heading
 * structure is reproduced as data so it can be rendered with the app's
 * existing accordion/typography components. Bump TERMS_VERSION (and the
 * matching backend constant in Backend/src/services/auth.service.js)
 * whenever the source document changes, so previously-accepted users are
 * prompted to re-accept.
 */

export const TERMS_VERSION = "2026-07";

export interface TermsClause {
  lead?: string;
  text: string;
}

export interface TermsSection {
  number: number;
  heading: string;
  clauses: TermsClause[];
}

export interface TermsDocument {
  partLabel: string;
  title: string;
  meta: string;
  sections: TermsSection[];
}

/** Splits a paragraph on a short bold "Lead Phrase: rest of sentence" prefix, when present. */
const clause = (raw: string): TermsClause => {
  const match = raw.match(/^([A-Z][A-Za-z0-9 &'()./-]{2,70}):\s(.+)$/s);
  return match ? { lead: match[1], text: match[2] } : { text: raw };
};

export const DOCUMENT_TITLE = "Master Terms of Service & Comprehensive Privacy Policy";
export const GOVERNING_LINE =
  "Governing Law: Republic of India | Operational Framework: Meta Graph API & Global Standards";
export const LEGAL_NOTICE =
  "IMPORTANT LEGAL NOTICE: BY ACCESSING, REGISTERING, LOGGING IN VIA PHONE NUMBER OTP, OR CLICKING 'I AGREE' / 'SIGN UP' ON YOUCOLLAB (OPERATED BY SOCIAL KURRY), YOU EXPRESSLY ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND UNEQUIVOCALLY AGREED TO BE BOUND BY THESE TERMS OF SERVICE AND PRIVACY POLICY. IF YOU DO NOT AGREE, IMMEDIATELY CEASE ALL USE OF THE PLATFORM.";

export const TERMS_OF_SERVICE: TermsDocument = {
  partLabel: "Part I",
  title: "Terms and Conditions of Service",
  meta: "Last Updated: July 2026",
  sections: [
    {
      number: 1,
      heading: "Parties and Acceptance of Terms",
      clauses: [
        clause(
          "This legally binding agreement ('Terms') is entered into by and between YouCollab, a registered brand and growth partnership platform operated under Social Kurry, based in the State of Maharashtra, India ('Platform', 'we', 'us', or 'our'), and any individual creator, influencer, brand, agency, or corporate entity accessing or utilizing our web application ('User', 'you', or 'your')."
        ),
        clause(
          "By clicking 'Log In', 'Sign Up', entering your phone number, verifying via One-Time Password (OTP), or clicking any analogous button, you legally warrant that: (a) you have reached the age of majority in your jurisdiction; (b) you possess the full legal capacity to enter into a binding contract; (c) you have read, understood, and accepted these Terms and our Privacy Policy in their entirety; and (d) if acting on behalf of a corporate entity or brand, you hold explicit, verifiable authorization to bind said entity."
        ),
      ],
    },
    {
      number: 2,
      heading: "Nature of the Platform & Marketplace Model",
      clauses: [
        clause(
          "YouCollab operates as a digital intermediary marketplace designed to connect content creators, influencers, and digital publishers ('Creators') with commercial brands, agencies, and advertisers ('Brands') for collaborative marketing, sponsorships, and commercial campaigns ('Services')."
        ),
        clause(
          "Independent Facilitator: YouCollab is strictly a matchmaking and technology facilitator. We are not an employment agency, talent management firm, or direct principal party to commercial contracts struck between Brands and Creators unless explicitly agreed in writing."
        ),
        clause(
          "No Guarantee of Campaign Return: While we verify Meta API profile metrics to assist Brands in evaluating Creator reach, engagement, and audience demographics, we do not guarantee the accuracy, authenticity, or commercial success of any campaign or collaboration."
        ),
      ],
    },
    {
      number: 3,
      heading: "Account Registration, Phone Number Authentication (Clerk.com), and Meta API Integration",
      clauses: [
        clause(
          "To utilize YouCollab, Users must authenticate exclusively via mobile phone number verification. Account creation and login sessions are secured and processed using Clerk.com as our third-party OTP (One-Time Password) authentication service provider. By providing your phone number and requesting an OTP through clerk.com, you authorize YouCollab and Clerk.com to collect, transmit, store, and process your telephone number and authentication telemetry."
        ),
        clause(
          "Account & Phone Security: You are solely responsible for maintaining the absolute confidentiality of your mobile device, phone number access, and active login sessions. You agree to notify YouCollab immediately of any unauthorized use or security breach."
        ),
        clause(
          "Meta API Integration: In addition to phone number authentication, you authorize YouCollab to access, retrieve, store, and display your public Instagram profile data, follower count, total posts, media metrics, and user identification credentials via the Meta Graph API."
        ),
        clause(
          "Accuracy of Data: You warrant that all information provided during registration—including your phone number and Instagram credentials—is accurate, current, and legally belongs to you. Impersonation or falsification constitutes a material breach resulting in immediate account termination."
        ),
      ],
    },
    {
      number: 4,
      heading: "Platform Messaging, Monitoring, and Privacy Waiver",
      clauses: [
        clause(
          "YouCollab features an integrated in-app messaging system allowing Brands and Creators to negotiate, communicate, and finalize collaboration details directly."
        ),
        clause(
          "No End-to-End Encryption: In-app chats, direct messages, and communications conducted through YouCollab are NOT end-to-end encrypted. You explicitly acknowledge, understand, and consent that YouCollab, its administrators, automated monitoring tools, and authorized personnel retain the full, unrestricted technical and legal right to access, inspect, store, analyze, and review all chat transcripts, media files, and correspondence exchanged on the Platform."
        ),
        clause(
          "Operational Oversight: We monitor communications to prevent fraud, enforce platform safety guidelines, resolve commercial disputes, and ensure compliance with applicable laws. Do not transmit sensitive personal data, banking details, passwords, or confidential information through platform chat that you do not wish administrators to review."
        ),
      ],
    },
    {
      number: 5,
      heading: "Ethical Cookie Scraping and Automated Data Collection",
      clauses: [
        clause(
          "To optimize platform performance, analyze user behavior, personalize user experience, and secure sessions, YouCollab deploys cookies, web beacons, tracking pixels, and similar automated data collection technologies."
        ),
        clause(
          "Ethical Standards: We engage in ethical cookie scraping and automated data collection strictly within the bounds permitted by applicable cyber laws and platform terms. Collected cookie data is utilized for session management, site analytics, security auditing, and targeted lead generation."
        ),
        clause(
          "User Consent: By using our web app, you consent to the placement of cookies on your browser and device. You may manage cookie preferences through your browser settings, though disabling essential cookies may impair platform functionality."
        ),
      ],
    },
    {
      number: 6,
      heading: "Intellectual Property and User Content",
      clauses: [
        clause(
          "All proprietary software, algorithms, user interface designs, database architectures, trademarks, logos, and service marks owned by YouCollab and Social Kurry remain our exclusive intellectual property."
        ),
        clause(
          "By uploading, posting, or transmitting content, portfolio media, or brand assets to YouCollab, you grant us a worldwide, non-exclusive, royalty-free, transferable license to host, display, reproduce, and distribute such content solely for the operation, promotion, and enhancement of the Platform."
        ),
      ],
    },
    {
      number: 7,
      heading: "Limitation of Liability and Indemnification",
      clauses: [
        clause("To the maximum extent permitted by applicable law under Indian jurisprudence and international statutes:"),
        clause(
          "Exclusion of Consequential Damages: YouCollab, Social Kurry, its founders, directors, officers, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or business reputation arising from your use of the Platform or failed brand-creator collaborations."
        ),
        clause(
          "Indemnification: You agree to indemnify, defend, and hold harmless YouCollab and Social Kurry from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in any way connected with your breach of these Terms, violation of third-party rights (including intellectual property or privacy rights), or unlawful conduct."
        ),
      ],
    },
    {
      number: 8,
      heading: "Governing Law, Jurisdiction, and Dispute Resolution",
      clauses: [
        clause(
          "These Terms and Conditions shall be governed by, construed, and enforced in accordance with the laws of the Republic of India, specifically incorporating the Information Technology Act, 2000 and applicable cyber regulations, without regard to conflict of law principles."
        ),
        clause(
          "Any dispute, controversy, or claim arising out of or relating to these Terms, including their formation or breach, shall be subject to the exclusive jurisdiction of the competent courts located in the State of Maharashtra, India."
        ),
      ],
    },
  ],
};

export const PRIVACY_POLICY: TermsDocument = {
  partLabel: "Part II",
  title: "Comprehensive Privacy Policy",
  meta: "Effective Date: July 2026 | Governing Body: Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 & Global Standards",
  sections: [
    {
      number: 1,
      heading: "Commitment to Privacy and Scope",
      clauses: [
        clause(
          "YouCollab by Social Kurry ('we', 'us', 'our') is deeply committed to safeguarding the privacy and data security of all platform Users (Brands and Creators). This Privacy Policy explains transparently how we collect, process, utilize, share, and protect your personal information when you access our web application."
        ),
      ],
    },
    {
      number: 2,
      heading: "Categories of Information Collected",
      clauses: [
        clause(
          "We collect specific categories of data necessary to provide seamless marketplace matchmaking, operational security, and targeted lead generation:"
        ),
        clause("Phone Number & Authentication Data: Mobile phone numbers and telephone contact information collected exclusively for login and account authentication."),
        clause("Demographic & Identity Data: Basic demographic details including your full legal name, age, sex, gender identity, email address (if applicable), and account credentials."),
        clause("Instagram & Social Graph Data: Public profile information retrieved directly via Meta Graph API integration, including Instagram username, user ID, follower counts, total posts, biographical summaries, and engagement metrics."),
        clause("Location & Device Data: Geographical coordinates, GPS location data, IP addresses, device identifiers, browser types, operating systems, and physical address details provided during onboarding or captured via device interaction."),
        clause("Communication Data: All text transcripts, multimedia attachments, voice notes, and transactional records exchanged within the YouCollab in-app messaging system."),
        clause("Cookie & Tracking Data: Information gathered through cookies, session tokens, pixel tags, and tracking scripts regarding your navigation patterns, feature interactions, and login timestamps."),
      ],
    },
    {
      number: 3,
      heading: "Purpose of Data Utilization and Lead Generation",
      clauses: [
        clause(
          "Your personal data, phone number, and location information are processed for legitimate business, commercial, and operational objectives, including:"
        ),
        clause("Phone Authentication & OTP Delivery: Verifying user identity, managing login access, and delivering One-Time Passwords (OTPs) via our authentication partner, clerk.com."),
        clause("Marketplace Matchmaking: Matching Creators with Brands based on audience demographics, niche, follower thresholds, and geographic location."),
        clause("Lead Generation & Business Growth: Leveraging user location, GPS data, address data, and demographic profiles to generate qualified commercial leads, market research reports, and targeted promotional campaigns for business growth."),
        clause("Platform Security & Authentication: Facilitating authentication, maintaining session security, preventing fraudulent bot activity, and resolving platform disputes."),
        clause("Chat Oversight: Reviewing in-app chat conversations to ensure adherence to safety guidelines, platform integrity, and community standards."),
      ],
    },
    {
      number: 4,
      heading: "Data Sharing and Disclosure",
      clauses: [
        clause(
          "We do not sell, rent, or trade your personal data to unauthorized third parties. However, we may share information under strictly controlled circumstances:"
        ),
        clause("With Authentication Partners (Clerk.com): Sharing mobile phone number verification data with our secure authentication infrastructure provider, clerk.com, strictly to generate, send, and verify OTPs for login."),
        clause("With Brands and Commercial Partners: When Brands search for Creator talent, relevant public profile data, portfolio metrics, and geographical information are displayed to facilitate hiring (phone numbers remain confidential)."),
        clause("With Service Providers: With trusted cloud hosting providers, analytics platforms, security auditors, and legal counsel bound by strict confidentiality obligations."),
        clause("Legal Compliance: When mandated by lawful court orders, governmental subpoenas, cyber cell investigations, or statutory compliance obligations under Indian law."),
      ],
    },
    {
      number: 5,
      heading: "Ethical Cookie Scraping & Tracking Practices",
      clauses: [
        clause(
          "YouCollab implements ethical cookie scraping protocols. Our automated scripts and cookies capture standard technical and behavioral telemetry to enhance site performance. We maintain transparency by informing users through this policy and offering browser-level control over cookie storage."
        ),
      ],
    },
    {
      number: 6,
      heading: "Data Security Measures",
      clauses: [
        clause(
          "We implement robust administrative, technical, and physical security controls—including encryption in transit (TLS/SSL), hashed storage, restricted database access, and secure API gateways via partners like clerk.com—to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no web transmission is 100% secure, and absolute security cannot be guaranteed."
        ),
      ],
    },
    {
      number: 7,
      heading: "User Rights and Data Deletion Requests",
      clauses: [
        clause("As a User, you retain statutory rights regarding your personal data:"),
        clause("Right to Access and Rectification: You may access, update, or correct your phone number, demographic, and profile information directly through your account dashboard."),
        clause("Right to Erasure: You may request the deletion of your account and associated personal data by submitting a formal written request to our support desk, subject to statutory data retention obligations."),
        clause("Revocation of Consent: You may revoke Meta API access at any time directly through your Instagram account security settings, though doing so will terminate your ability to use YouCollab Services."),
      ],
    },
    {
      number: 8,
      heading: "Contact Information and Grievance Redressal",
      clauses: [
        clause(
          "In accordance with the Information Technology Act, 2000 and applicable rules, if you have any questions, grievances, or concerns regarding these Terms of Service or our Privacy Policy, please contact our designated Grievance Officer:"
        ),
        { text: "Legal & Compliance Department\nYouCollab by Social Kurry\nState of Maharashtra, India\nEmail: Office@socialkurry.com" },
      ],
    },
  ],
};
