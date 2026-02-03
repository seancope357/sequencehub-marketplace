-- SequenceHUB Supabase Migration
-- Legal documents + acceptances (Terms, Privacy, Refunds) with RLS
-- Date: 2026-02-03

-- ============================================
-- SECURITY HARDENING (search_path)
-- ============================================

-- Supabase Security Advisor flags SECURITY DEFINER functions that do not set search_path.
-- We replace these functions to pin search_path explicitly.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Insert into public.users
  INSERT INTO public.users (id, email, name, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar'
  );

  -- Insert default BUYER role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'BUYER');

  -- Create audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id)
  VALUES (NEW.id, 'USER_CREATED', 'user', NEW.id::text);

  RETURN NEW;
END;
$$;

-- Preserve the existing name/signature but pin search_path.
-- (Some setups may not use this function, but it is safe to create.)
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(auth.uid()::text, '');
$$;

-- ============================================
-- ENUMS
-- ============================================

-- Clean up older, unused tables if they exist (from earlier experiments).
-- We DROP them rather than rename because older schemas may not match the current one.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'LegalDocument'
  ) THEN
    EXECUTE 'DROP TABLE public.\"LegalDocument\" CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'LegalAcceptance'
  ) THEN
    EXECUTE 'DROP TABLE public.\"LegalAcceptance\" CASCADE';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'legal_document_type'
  ) THEN
    CREATE TYPE public.legal_document_type AS ENUM (
      'TERMS_OF_SERVICE',
      'PRIVACY_POLICY',
      'REFUND_POLICY'
    );
  END IF;
END $$;

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type public.legal_document_type NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(type, version)
);

CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_legal_documents_type_published_at
  ON public.legal_documents(type, published_at DESC);

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  document_type public.legal_document_type NOT NULL,
  document_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_id_accepted_at
  ON public.legal_acceptances(user_id, accepted_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_document_id
  ON public.legal_acceptances(document_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

-- Legal documents: public can read published documents; only service role can modify.
DROP POLICY IF EXISTS "Public can read published legal documents" ON public.legal_documents;
CREATE POLICY "Public can read published legal documents"
  ON public.legal_documents
  FOR SELECT
  USING (published_at IS NOT NULL);

DROP POLICY IF EXISTS "Service role can manage legal documents" ON public.legal_documents;
CREATE POLICY "Service role can manage legal documents"
  ON public.legal_documents
  FOR ALL
  USING (auth.role() = 'service_role');

-- Legal acceptances: users can read/insert their own; admin can read; service role can manage.
DROP POLICY IF EXISTS "Users can read own legal acceptances" ON public.legal_acceptances;
CREATE POLICY "Users can read own legal acceptances"
  ON public.legal_acceptances
  FOR SELECT
  USING (user_id = auth.uid() OR auth.has_role('ADMIN'));

DROP POLICY IF EXISTS "Users can accept legal documents" ON public.legal_acceptances;
CREATE POLICY "Users can accept legal documents"
  ON public.legal_acceptances
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage legal acceptances" ON public.legal_acceptances;
CREATE POLICY "Service role can manage legal acceptances"
  ON public.legal_acceptances
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- PUBLISH INITIAL LEGAL DOCUMENTS
-- ============================================

-- Note: These documents are written for SequenceHUB.com as a US-based marketplace for digital xLights sequence files.
-- You should review them with a qualified attorney for your specific business, jurisdiction(s), and compliance needs.

DO $$
DECLARE
  v_effective_at timestamptz := '2026-02-03T00:00:00Z'::timestamptz;
  v_published_at timestamptz := now();
BEGIN
  -- Terms of Service
  INSERT INTO public.legal_documents (type, version, title, content_markdown, effective_at, published_at)
  VALUES (
    'TERMS_OF_SERVICE',
    '2026-02-03',
    'Terms of Service',
    $tos$
# Terms of Service

**Effective date:** 2026-02-03

These Terms of Service (the “**Terms**”) govern your access to and use of SequenceHUB.com (the “**Platform**”), including any purchases, downloads, or sales of digital xLights sequence files and related assets (collectively, “**Digital Products**”).

By accessing or using the Platform, you agree to these Terms. If you do not agree, do not use the Platform.

## 1. Who We Are
SequenceHUB.com (“**SequenceHUB**”, “**we**”, “**us**”) operates an online marketplace where creators (“**Creators**”) can list Digital Products and customers (“**Buyers**”) can purchase and download them.

**Contact:** admin@sequencehub.com

## 2. Eligibility and Accounts
You must be legally able to form a binding contract to use the Platform.

You are responsible for:
- Maintaining the security of your account credentials.
- All activity that occurs under your account.

## 3. Marketplace Basics
### 3.1 Platform Role
The Platform facilitates transactions between Creators and Buyers. Unless explicitly stated otherwise, **Creators are the sellers of record** for their Digital Products, and they are responsible for their listings, content, and buyer support obligations described in these Terms.

### 3.2 Creator Listings
Creators may upload Digital Products, version them, set prices, and manage their listings. Creators must provide accurate product descriptions (including compatibility notes, required props/models, and included file types).

### 3.3 Buyer Purchases
When you purchase a Digital Product, you receive access via your library on the Platform. Access and downloads may be protected by time‑limited signed URLs and rate limits to prevent abuse.

## 4. Digital Products, Licensing, and Intellectual Property
### 4.1 Creator Ownership
Creators retain ownership of their Digital Products and any associated intellectual property rights, except as limited by the license granted to Buyers below and the license granted to the Platform in Section 4.3.

### 4.2 Buyer License
Unless a listing explicitly states otherwise, upon purchase the Creator grants you a **non‑exclusive, non‑transferable, revocable license** to download and use the Digital Product for the purpose described in the listing and consistent with the license type (e.g., personal vs. commercial) shown at checkout or in the product details.

You may not:
- Resell, redistribute, or share Digital Products outside your household/team in a way that grants others access without purchasing.
- Remove embedded attribution or license notices if provided.
- Use Digital Products in a way that violates applicable law or third‑party rights.

### 4.3 Platform License (Hosting and Delivery)
Creators grant the Platform a limited license to host, store, reproduce, and transmit their Digital Products solely to operate the Platform (including processing uploads, generating previews, versioning, and delivering files to authorized Buyers).

## 5. Prohibited Conduct
You may not:
- Attempt to bypass download protections, rate limits, or access controls.
- Upload malware, exploit code, or any content intended to harm systems or users.
- Infringe copyrights, trademarks, or other rights.
- Use the Platform to harass, threaten, or defraud others.

## 6. Payments, Fees, and Taxes
Payments are processed by Stripe. Creators may be onboarded to Stripe Connect to receive payouts.

Creators are responsible for:
- Providing accurate payout and tax information as required by Stripe and applicable law.
- Any taxes related to their earnings.

We may charge platform fees as disclosed during Creator onboarding or in the dashboard.

## 7. Refunds and Chargebacks
Digital Products are delivered electronically. Refunds are governed by the **Refund Policy** published on the Platform, and may also depend on Creator‑specific listing terms where allowed by law.

Initiating a chargeback or payment dispute may result in suspension of access to the Digital Product(s) while the dispute is investigated.

## 8. Content Moderation and Takedowns
We may remove or disable access to content that we reasonably believe violates these Terms, infringes rights, or poses security risks.

If you believe content infringes your rights, contact admin@sequencehub.com with sufficient detail to investigate.

## 9. Disclaimers
The Platform and Digital Products are provided **“as is”** and **“as available.”**

Creators are responsible for the quality, compatibility, and performance of their Digital Products. We do not guarantee that Digital Products will meet your requirements or work with your specific xLights setup, props, controllers, or environment.

To the maximum extent permitted by law, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, and non‑infringement.

## 10. Limitation of Liability
To the maximum extent permitted by law:
- The Platform’s total liability for any claim relating to your use of the Platform will not exceed the amounts you paid to the Platform in the 12 months before the event giving rise to the claim.
- We are not liable for indirect, incidental, special, consequential, or punitive damages.

Some jurisdictions do not allow certain limitations, so these limits may not apply to you.

## 11. Indemnity
You agree to indemnify and hold harmless SequenceHUB from claims arising out of your use of the Platform, your violation of these Terms, or your infringement of any rights, including claims relating to content you upload.

## 12. Termination
We may suspend or terminate your access to the Platform if you violate these Terms or if we must do so to comply with law or protect the Platform and users.

Upon termination, your right to use the Platform ends. Purchased access to Digital Products may be limited or revoked where required by law, where the purchase was fraudulent, or where content is removed due to rights violations.

## 13. Changes
We may update these Terms from time to time. The effective date above indicates when this version becomes effective. Material changes may be communicated through the Platform.

## 14. Governing Law
These Terms are governed by the laws of the United States and the State/territory where SequenceHUB is established, without regard to conflict‑of‑law rules.

## 15. Contact
Questions about these Terms: admin@sequencehub.com
$tos$,
    v_effective_at,
    v_published_at
  )
  ON CONFLICT (type, version) DO NOTHING;

  -- Privacy Policy
  INSERT INTO public.legal_documents (type, version, title, content_markdown, effective_at, published_at)
  VALUES (
    'PRIVACY_POLICY',
    '2026-02-03',
    'Privacy Policy',
    $privacy$
# Privacy Policy

**Effective date:** 2026-02-03

This Privacy Policy explains how SequenceHUB.com (“**SequenceHUB**”, “**we**”, “**us**”) collects, uses, shares, and protects information when you use our marketplace (the “**Platform**”).

**Contact:** admin@sequencehub.com

## 1. Information We Collect
### 1.1 Information You Provide
- Account information (such as email and profile information you choose to provide).
- Creator profile details and product listing information.
- Support messages and communications you send to us.

### 1.2 Automatically Collected Information
We collect certain information automatically when you use the Platform, such as:
- IP address, device and browser information, and approximate location derived from IP.
- Logs related to authentication, downloads, and security events.

### 1.3 Payment Information
Payments are processed by **Stripe**. We do not store full payment card numbers. Stripe may collect and process payment and payout information according to its own policies.

## 2. How We Use Information
We use information to:
- Provide and operate the Platform (accounts, purchases, downloads, creator payouts).
- Secure the Platform (fraud prevention, rate limiting, abuse detection).
- Communicate with you (transactional emails, support responses).
- Improve the Platform (analytics and debugging).
- Comply with legal obligations.

## 3. How We Share Information
We share information:
- With service providers that help us run the Platform (for example, Supabase for authentication/storage/database and Stripe for payments), subject to contractual protections.
- When required by law or to protect rights, safety, and security.
- In connection with a business transaction (e.g., merger, acquisition), subject to appropriate safeguards.

We do not sell personal information in the sense of many US state privacy laws. If that changes, we will update this policy and provide any required opt‑out mechanisms.

## 4. Cookies and Similar Technologies
The Platform uses cookies and similar technologies to:
- Maintain login sessions.
- Provide core functionality and security protections.

You can control cookies through your browser settings. Disabling cookies may affect functionality.

## 5. Data Retention
We retain personal information for as long as needed to provide the Platform, comply with legal obligations, resolve disputes, and enforce our agreements. We may retain logs longer for security and fraud prevention where permitted by law.

## 6. Security
We use reasonable administrative, technical, and organizational safeguards designed to protect information. No system is 100% secure; you use the Platform at your own risk.

## 7. Your Choices and Rights
Depending on where you live, you may have rights to access, correct, delete, or obtain a copy of your personal information, and to object to certain processing.

To request access or deletion, contact admin@sequencehub.com. We may need to verify your identity before fulfilling requests.

## 8. Children
The Platform is not intended for children under 13 (or a higher age where required by local law). We do not knowingly collect personal information from children.

## 9. International Users
If you access the Platform from outside the United States, your information may be processed in the United States or other locations where our service providers operate.

## 10. Changes
We may update this Privacy Policy from time to time. The effective date above indicates when this version becomes effective.

## 11. Contact
Questions about this Privacy Policy: admin@sequencehub.com
$privacy$,
    v_effective_at,
    v_published_at
  )
  ON CONFLICT (type, version) DO NOTHING;

  -- Refund Policy
  INSERT INTO public.legal_documents (type, version, title, content_markdown, effective_at, published_at)
  VALUES (
    'REFUND_POLICY',
    '2026-02-03',
    'Refund Policy',
    $refund$
# Refund Policy

**Effective date:** 2026-02-03

This Refund Policy applies to purchases made on SequenceHUB.com (the “Platform”).

## 1. Digital Products
Products sold on the Platform are digital files delivered electronically (e.g., xLights project/source files and rendered playback files).

## 2. General Rule
Because digital products can be copied immediately after delivery, **all sales are final** except where required by applicable law or where a refund is granted under Section 3.

## 3. When We May Grant a Refund
We may grant a refund, at our discretion, in cases such as:
- **Duplicate purchase** of the same product by the same account.
- **Technical delivery failure** where we cannot provide access after reasonable troubleshooting.
- **Material misrepresentation** of the product listing (for example, the listing claims a file type is included when it is not), and the issue cannot be remedied.

Refunds are not guaranteed for:
- Incompatibility with your specific hardware, props, controllers, sequencing style, or expectations, if the product was accurately described.
- Requests made long after purchase where the product was delivered and accessible.

## 4. How To Request a Refund
Email admin@sequencehub.com with:
- Your account email
- Order number (if available)
- The product name
- The reason for the request

We may request additional information to investigate.

## 5. Chargebacks and Disputes
If you file a chargeback or payment dispute, your access to the disputed Digital Product(s) may be suspended during the investigation.

## 6. Changes
We may update this Refund Policy from time to time. The effective date above indicates when this version becomes effective.
$refund$,
    v_effective_at,
    v_published_at
  )
  ON CONFLICT (type, version) DO NOTHING;
END $$;

COMMENT ON TABLE public.legal_documents IS 'Published legal documents (Terms, Privacy, Refunds) with versioning';
COMMENT ON TABLE public.legal_acceptances IS 'Records of user acceptance of published legal documents';

SELECT 'Legal documents migration completed successfully!' AS status;
