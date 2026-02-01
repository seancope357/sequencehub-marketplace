# SequenceHUB Claude Agent System

This directory contains specialized AI agents and rules for working with the SequenceHUB marketplace codebase.

## Overview

The SequenceHUB project uses seven super-powered specialized agents that provide expert guidance in their respective domains. These agents are automatically invoked by Claude Code based on the task at hand.

## Available Agents

### 🛡️ Security Guardian Agent
**File**: `agents/security-guardian.md`

**Expertise**:
- Security audits and code review
- Access control validation
- Threat mitigation
- Audit logging compliance
- Payment security (PCI-DSS)
- Download security
- OWASP Top 10 vulnerability prevention
- GDPR compliance

**Auto-Invoked For**:
- Security audits and reviews
- Authentication/authorization changes
- API endpoint creation
- Webhook handling
- Download system modifications
- Compliance checks

**Example Usage**:
```
User: "Review the security of our download system"
→ Security Guardian analyzes signed URLs, rate limiting, entitlement checks
```

---

### 🎄 xLights Specialist Agent
**File**: `agents/xlights-specialist.md`

**Expertise**:
- xLights file formats (FSEQ, XSQ, XML)
- Metadata extraction and validation
- Sequence specifications
- Product quality guidelines
- Version compatibility
- File type classification
- Community best practices
- Pricing guidelines

**Auto-Invoked For**:
- Product creation/validation
- File upload handling
- Metadata extraction
- xLights-specific features
- Sequence display logic

**Example Usage**:
```
User: "Help me extract metadata from FSEQ files"
→ xLights Specialist provides header parsing, metadata structure, validation
```

---

### 💳 Stripe Payment Orchestrator Agent
**File**: `agents/stripe-payment-orchestrator.md`

**Expertise**:
- Stripe Connect integration
- Checkout session creation
- Webhook event handling
- Idempotency patterns
- Platform fee calculations
- Refund processing
- Creator onboarding
- Financial reporting

**Auto-Invoked For**:
- Payment integration
- Stripe Connect setup
- Webhook debugging
- Order processing
- Refund handling
- Revenue calculations

**Example Usage**:
```
User: "Create the Stripe checkout integration"
→ Stripe Orchestrator provides complete checkout flow, webhook handling, order creation
```

---

### 📁 File Storage Orchestrator Agent
**File**: `agents/file-storage-orchestrator.md`

**Expertise**:
- Multipart file uploads with resumability
- Cloud storage integration (R2/S3)
- File validation (extension + magic bytes)
- SHA-256 hashing and deduplication
- Metadata extraction (FSEQ/XSQ headers)
- Virus scanning integration
- Upload progress tracking

**Auto-Invoked For**:
- File upload system implementation
- Cloud storage setup
- File validation logic
- Metadata extraction
- File processing pipelines

**Example Usage**:
```
User: "Implement multipart file upload with cloud storage"
→ File Storage Orchestrator designs resumable upload, R2 integration, validation
```

---

### ⚙️ Background Job Manager Agent
**File**: `agents/background-job-manager.md`

**Expertise**:
- Job queue systems (BullMQ, Bull)
- Redis configuration
- Worker process management
- Retry strategies with exponential backoff
- Scheduled jobs (cron)
- Job monitoring and dead letter queues

**Auto-Invoked For**:
- Background job system setup
- Queue implementation
- Worker creation
- Scheduled task configuration
- Job monitoring

**Example Usage**:
```
User: "Create background job system for file processing"
→ Background Job Manager sets up BullMQ queue, workers, retry logic
```

---

### 👤 Admin Panel Architect Agent
**File**: `agents/admin-panel-architect.md`

**Expertise**:
- Admin dashboard design
- CRUD operations and data tables
- User management interfaces
- Product moderation workflows
- Analytics dashboards
- Bulk operations
- Export functionality (CSV/JSON)

**Auto-Invoked For**:
- Admin panel development
- User/product/order management
- Moderation tools
- Analytics dashboards
- Platform oversight features

**Example Usage**:
```
User: "Build admin panel for user management"
→ Admin Panel Architect designs dashboard, data tables, CRUD operations
```

---

### 🔍 SEO & Metadata Specialist Agent
**File**: `agents/seo-metadata-specialist.md`

**Expertise**:
- SEO best practices
- Meta tags optimization (title, description)
- Structured data (Schema.org, JSON-LD)
- Sitemap generation (XML)
- Open Graph tags
- Twitter Cards
- Robots.txt configuration
- Canonical URLs

**Auto-Invoked For**:
- SEO implementation
- Meta tag generation
- Sitemap creation
- Structured data
- Social sharing optimization

**Example Usage**:
```
User: "Implement dynamic sitemap and meta tags"
→ SEO Specialist creates sitemap.ts, meta tag components, structured data
```

---

## How Agents Are Invoked

### Automatic Invocation

Claude Code automatically invokes agents based on:

1. **Keywords in your request**
   - "security audit" → Security Guardian
   - "FSEQ metadata" → xLights Specialist
   - "Stripe webhook" → Stripe Orchestrator

2. **Files being modified**
   - `src/lib/auth.ts` → Security Guardian
   - `src/app/api/upload/*` → xLights Specialist
   - `src/app/api/webhooks/stripe/*` → Stripe Orchestrator

3. **Code patterns detected**
   - New API endpoint → Security Guardian (always)
   - File upload logic → xLights Specialist + Security Guardian
   - Payment processing → Stripe Orchestrator + Security Guardian

### Manual Invocation

You can explicitly request an agent:

```
"Have the Security Guardian review this authentication code"
"Ask the xLights Specialist how to validate FSEQ files"
"Get the Stripe Payment Orchestrator to help with refunds"
```

## Multi-Agent Workflows

Some tasks require multiple agents working together:

### Example: Building Product Upload Flow
1. **xLights Specialist** designs file validation and metadata extraction
2. **Security Guardian** reviews for security vulnerabilities
3. Implementation combines both perspectives

### Example: Payment Integration
1. **Stripe Orchestrator** implements checkout and webhooks
2. **Security Guardian** audits for financial security
3. Both agents ensure PCI-DSS compliance

## Agent Invocation Rules

Detailed invocation rules are defined in:
- `rules/agent-invocation-rules.md`

This file specifies:
- Trigger keywords for each agent
- File operation triggers
- Code pattern triggers
- Multi-agent coordination
- Priority rules

## Best Practices

### When to Use Agents

✅ **DO invoke agents for**:
- Domain-specific design decisions
- Security-critical changes
- Complex integrations (Stripe, xLights)
- Code reviews
- Compliance questions
- Architecture decisions

❌ **DON'T invoke for**:
- Simple UI styling
- Documentation updates (unless security docs)
- Basic CRUD operations
- Non-sensitive code changes

### Working with Multiple Agents

1. **Identify the primary domain** (payment? security? xLights?)
2. **Invoke primary agent first** for core implementation
3. **Invoke Security Guardian** for security review (almost always)
4. **Synthesize recommendations** from all agents
5. **Implement** with combined best practices

### Agent Priority

When multiple agents could apply:

1. **Security Guardian** - Always prioritize security
2. **Domain Expert** - Then consult domain specialist
3. **Implementation** - Build with all recommendations

## Directory Structure

```
.claude/
├── README.md                          # This file
├── agents/
│   ├── security-guardian.md           # Security expert agent
│   ├── xlights-specialist.md          # xLights domain expert
│   ├── stripe-payment-orchestrator.md # Payment expert agent
│   ├── file-storage-orchestrator.md   # File upload & storage expert
│   ├── background-job-manager.md      # Job queue & worker expert
│   ├── admin-panel-architect.md       # Admin interface expert
│   └── seo-metadata-specialist.md     # SEO & metadata expert
└── rules/
    └── agent-invocation-rules.md      # When to invoke which agent
```

## Adding New Agents

To add a new specialized agent:

1. Create agent file in `agents/[agent-name].md`
2. Define role, expertise, and responsibilities
3. Add trigger rules to `rules/agent-invocation-rules.md`
4. Update this README with agent description
5. Test invocation with sample requests

## Agent Capabilities

Each agent can:
- ✅ Review and analyze code
- ✅ Provide implementation guidance
- ✅ Identify issues and vulnerabilities
- ✅ Suggest best practices
- ✅ Answer domain-specific questions
- ✅ Create detailed reports
- ✅ Validate compliance requirements

Each agent CANNOT:
- ❌ Execute code directly
- ❌ Access production systems
- ❌ Make deployment decisions
- ❌ Override other agents' security recommendations

## Example Scenarios

### Scenario 1: Implementing File Upload System
```
User: "I need to implement file upload for xLights sequences with cloud storage"

Claude Code:
1. Invokes File Storage Orchestrator
   - Designs multipart upload system
   - Plans R2/S3 integration
   - Creates chunk handling logic
   - Implements progress tracking

2. Invokes xLights Specialist
   - Adds FSEQ/XSQ metadata extraction
   - Validates sequence file formats
   - Implements xLights-specific validation

3. Invokes Security Guardian
   - Reviews file upload security
   - Validates file type checking (extension + magic bytes)
   - Ensures virus scanning hook
   - Checks authorization and rate limiting

4. Implements combined solution with all perspectives
```

### Scenario 2: Debugging Stripe Webhooks
```
User: "Webhooks aren't creating orders after successful payments"

Claude Code:
1. Invokes Stripe Payment Orchestrator
   - Checks webhook signature verification
   - Reviews idempotency handling
   - Examines order creation logic
   - Tests webhook event processing

2. Identifies issue (e.g., missing metadata)

3. Provides fix with proper error handling
```

### Scenario 3: Security Audit
```
User: "Audit the security of our download system"

Claude Code:
1. Invokes Security Guardian
   - Reviews signed URL generation
   - Checks entitlement validation
   - Validates rate limiting
   - Examines audit logging
   - Tests for vulnerabilities

2. Generates comprehensive security report

3. Provides prioritized recommendations
```

### Scenario 4: Building Admin Panel
```
User: "Build admin dashboard with user management and analytics"

Claude Code:
1. Invokes Admin Panel Architect
   - Designs dashboard layout
   - Creates user management interface
   - Builds data tables with pagination
   - Implements analytics charts

2. Invokes Security Guardian
   - Reviews admin role checks
   - Validates authorization on all admin endpoints
   - Ensures audit logging for admin actions

3. Implements secure admin panel with comprehensive features
```

### Scenario 5: SEO Optimization
```
User: "Optimize product pages for search engines"

Claude Code:
1. Invokes SEO & Metadata Specialist
   - Generates dynamic meta tags
   - Creates product structured data (Schema.org)
   - Implements sitemap.xml generation
   - Adds Open Graph images

2. Invokes xLights Specialist
   - Optimizes product-specific keywords
   - Ensures xLights terminology in metadata

3. Implements comprehensive SEO with social sharing
```

## Feedback & Improvement

The agent system improves over time. If you find:
- Agents not being invoked when they should be
- Incorrect agent invoked for a task
- Missing expertise in an agent
- Need for a new specialized agent

Update the relevant files:
- Agent definitions: `agents/[agent-name].md`
- Invocation rules: `rules/agent-invocation-rules.md`
- This README for documentation

## Quick Reference

| I want to... | Use this agent | Example request |
|--------------|----------------|-----------------|
| Review auth code | Security Guardian | "Audit authentication flow" |
| Validate FSEQ files | xLights Specialist | "How to parse FSEQ headers?" |
| Setup Stripe Connect | Stripe Orchestrator | "Implement creator onboarding" |
| Implement file upload | File Storage Orchestrator | "Build multipart upload system" |
| Setup cloud storage | File Storage Orchestrator | "Integrate Cloudflare R2" |
| Create background jobs | Background Job Manager | "Build job queue for file processing" |
| Schedule tasks | Background Job Manager | "Add daily cleanup cron job" |
| Build admin panel | Admin Panel Architect | "Create user management dashboard" |
| Moderate content | Admin Panel Architect | "Add product approval workflow" |
| Optimize SEO | SEO & Metadata Specialist | "Implement meta tags and sitemap" |
| Add structured data | SEO & Metadata Specialist | "Create Schema.org markup" |
| Create API endpoint | Security Guardian | "Review this new endpoint" |
| Handle webhooks | Stripe Orchestrator | "Debug webhook processing" |
| Process refunds | Stripe Orchestrator | "Handle charge.refunded event" |
| Check compliance | Security Guardian | "Verify GDPR compliance" |

## Support

For questions about the agent system:
- Review agent files in `agents/` directory
- Check invocation rules in `rules/` directory
- See `CLAUDE.md` in project root for general guidance
- Review project documentation in root directory

---

**Remember**: These agents are here to help you build SequenceHUB securely, efficiently, and with domain expertise. Use them liberally!
