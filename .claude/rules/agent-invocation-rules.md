# Agent Invocation Rules for SequenceHUB

This file defines when to automatically invoke specialized agents for specific tasks in the SequenceHUB marketplace project.

## Agent Registry

### Domain-Specific Agents

### 1. Security Guardian Agent
**File**: `.claude/agents/security-guardian.md`
**Expertise**: Security audits, access control, threat mitigation, compliance

### 2. xLights Specialist Agent
**File**: `.claude/agents/xlights-specialist.md`
**Expertise**: xLights file formats, metadata extraction, product validation

### 3. Stripe Payment Orchestrator Agent
**File**: `.claude/agents/stripe-payment-orchestrator.md`
**Expertise**: Payment processing, Stripe Connect, webhooks, financial operations

### 4. File Storage Orchestrator Agent
**File**: `.claude/agents/file-storage-orchestrator.md`
**Expertise**: File uploads, cloud storage (R2/S3), multipart uploads, file validation

### 5. Background Job Manager Agent
**File**: `.claude/agents/background-job-manager.md`
**Expertise**: Job queues (BullMQ), Redis, worker processes, scheduled tasks, retry logic

### 6. Admin Panel Architect Agent
**File**: `.claude/agents/admin-panel-architect.md`
**Expertise**: Admin interfaces, CRUD operations, data tables, analytics dashboards, moderation tools

### 7. SEO & Metadata Specialist Agent
**File**: `.claude/agents/seo-metadata-specialist.md`
**Expertise**: SEO best practices, structured data, sitemaps, meta tags, Open Graph, social sharing

### Workflow & Process Agents

### 8. Project Architect Agent
**File**: `.claude/agents/project-architect.md`
**Expertise**: Planning, task breakdown, architectural decisions, technology choices, cross-agent coordination

### 9. Code Quality Specialist Agent
**File**: `.claude/agents/code-quality-specialist.md`
**Expertise**: Code review, refactoring, design patterns, TypeScript best practices, maintainability

### 10. Implementation Coordinator Agent
**File**: `.claude/agents/implementation-coordinator.md`
**Expertise**: Workflow management, agent orchestration, progress tracking, quality gates, task coordination

### 11. Test Strategy Agent
**File**: `.claude/agents/test-strategy.md`
**Expertise**: Test planning, validation strategies, test coverage, quality assurance, test implementation

---

## Automatic Agent Invocation Rules

### Security Guardian Agent - Auto-Invoke When:

#### Trigger Keywords in User Request:
- "security" + "audit" OR "review"
- "vulnerability" OR "vulnerabilities"
- "access control" OR "authorization" OR "permissions"
- "audit log" + "review" OR "check"
- "penetration test" OR "pen test"
- "security issue" OR "security concern"
- "threat" + "model" OR "assessment"
- "OWASP" OR "XSS" OR "CSRF" OR "SQL injection"
- "PCI" OR "GDPR" OR "compliance"

#### Trigger File Operations:
- Creating/modifying authentication files (`src/lib/auth.ts`, `src/hooks/use-auth.ts`)
- Creating/modifying authorization logic in API routes
- Creating/modifying webhook handlers (`src/app/api/webhooks/*`)
- Creating/modifying download endpoints (`src/app/api/library/download/*`, `src/app/api/media/*`)
- Modifying audit logging (`AuditLog` model or audit log creation code)
- Modifying user roles or permissions (`UserRole` model)

#### Trigger Code Patterns:
- Adding new API endpoints (review for auth/authz)
- Modifying database queries with user data
- Adding file upload functionality
- Creating payment-related endpoints
- Modifying password hashing or JWT logic

#### Examples:
```
User: "Review the security of our download system"
→ INVOKE: Security Guardian Agent

User: "I need to audit our authentication flow"
→ INVOKE: Security Guardian Agent

User: "Check if our API endpoints have proper authorization"
→ INVOKE: Security Guardian Agent

User: "Create a new admin endpoint to delete users"
→ INVOKE: Security Guardian Agent (review before implementing)
```

### xLights Specialist Agent - Auto-Invoke When:

#### Trigger Keywords in User Request:
- "xLights" (any mention)
- "FSEQ" OR "XSQ" OR "XML" + "sequence"
- "sequence" + "metadata" OR "validation"
- "file upload" + "sequence" OR "xLights"
- "product" + "validation" OR "metadata"
- "channel count" OR "frame rate" OR "FPS"
- "mega tree" OR "matrix" OR "pixel tree" OR "arch"
- "props" OR "models" + "xLights"
- "version compatibility" + "xLights"

#### Trigger File Operations:
- Creating/modifying product creation pages (`src/app/dashboard/products/new/*`)
- Creating/modifying file upload endpoints (`src/app/api/upload/*`)
- Creating/modifying product validation logic
- Modifying `Product`, `ProductFile`, or `ProductVersion` models
- Creating/modifying product display pages (`src/app/p/[slug]/*`)
- Modifying xLights-specific metadata fields

#### Trigger Code Patterns:
- File type validation for sequences
- Metadata extraction from uploaded files
- Product category or targeting logic
- Version compatibility checks
- File format parsing (FSEQ, XSQ headers)

#### Examples:
```
User: "Help me extract metadata from FSEQ files"
→ INVOKE: xLights Specialist Agent

User: "Create product validation for xLights sequences"
→ INVOKE: xLights Specialist Agent

User: "I need to add support for XSQ file uploads"
→ INVOKE: xLights Specialist Agent

User: "How should we display sequence specifications?"
→ INVOKE: xLights Specialist Agent
```

### Stripe Payment Orchestrator Agent - Auto-Invoke When:

#### Trigger Keywords in User Request:
- "Stripe" (any mention)
- "payment" OR "checkout" OR "purchase"
- "webhook" + "Stripe" OR "payment"
- "refund" OR "chargeback"
- "platform fee" OR "application fee"
- "Stripe Connect" OR "connected account"
- "creator onboarding" + "payment"
- "payout" OR "revenue"
- "checkout session"
- "order" + "create" OR "process"

#### Trigger File Operations:
- Creating/modifying checkout endpoints (`src/app/api/checkout/*`)
- Creating/modifying webhook handlers (`src/app/api/webhooks/stripe/*`)
- Creating/modifying order processing logic
- Modifying `Order`, `OrderItem`, `Entitlement`, or `CheckoutSession` models
- Creating/modifying payment-related pages
- Modifying creator account setup/onboarding

#### Trigger Code Patterns:
- Stripe API calls (checkout sessions, webhooks)
- Order creation or status updates
- Entitlement granting/revoking
- Platform fee calculations
- Payment intent handling
- Idempotency key usage

#### Examples:
```
User: "Create the Stripe checkout integration"
→ INVOKE: Stripe Payment Orchestrator Agent

User: "Fix webhook handling for completed payments"
→ INVOKE: Stripe Payment Orchestrator Agent

User: "Help with Stripe Connect onboarding flow"
→ INVOKE: Stripe Payment Orchestrator Agent

User: "Debug why orders aren't being created after payment"
→ INVOKE: Stripe Payment Orchestrator Agent
```

### File Storage Orchestrator Agent - Auto-Invoke When:

#### Trigger Keywords in User Request:
- "file upload" OR "upload system"
- "multipart upload" OR "resumable upload"
- "cloud storage" OR "R2" OR "S3"
- "file validation" OR "file type checking"
- "SHA-256" OR "file hash" OR "deduplication"
- "chunk" + "upload"
- "storage key" OR "storage integration"
- "virus scan" + "file"

#### Trigger File Operations:
- Creating/modifying upload endpoints (`src/app/api/upload/*`)
- Creating/modifying cloud storage integration
- Creating/modifying file validation logic
- Modifying `ProductFile` or `UploadSession` models
- Creating file processing pipelines

#### Trigger Code Patterns:
- Multipart upload implementation
- File chunking logic
- Cloud storage SDK usage (AWS S3, Cloudflare R2)
- File hash calculation
- Temporary file management

#### Examples:
```
User: "Implement multipart file upload system"
→ INVOKE: File Storage Orchestrator Agent

User: "Integrate Cloudflare R2 for file storage"
→ INVOKE: File Storage Orchestrator Agent

User: "Add file validation and virus scanning"
→ INVOKE: File Storage Orchestrator Agent (primary) + Security Guardian (review)

User: "Handle resumable uploads with progress tracking"
→ INVOKE: File Storage Orchestrator Agent
```

### Background Job Manager Agent - Auto-Invoke When:

#### Trigger Keywords in User Request:
- "background job" OR "job queue"
- "BullMQ" OR "Bull" OR "queue system"
- "worker" + "process"
- "scheduled job" OR "cron job"
- "retry logic" OR "exponential backoff"
- "Redis" + "queue"
- "async" + "processing"
- "job monitoring" OR "queue monitoring"

#### Trigger File Operations:
- Creating/modifying job queue setup (`src/lib/jobs/*`)
- Creating/modifying worker implementations
- Creating/modifying scheduled task definitions
- Adding background processing logic

#### Trigger Code Patterns:
- Queue creation (BullMQ, Bull)
- Worker process implementation
- Job retry strategies
- Cron job scheduling
- Job progress tracking

#### Examples:
```
User: "Create background job system for file processing"
→ INVOKE: Background Job Manager Agent

User: "Implement webhook retry queue with exponential backoff"
→ INVOKE: Background Job Manager Agent

User: "Add scheduled job for daily cleanup"
→ INVOKE: Background Job Manager Agent

User: "Monitor and retry failed jobs"
→ INVOKE: Background Job Manager Agent
```

### Admin Panel Architect Agent - Auto-Invoke When:

#### Trigger Keywords in User Request:
- "admin panel" OR "admin dashboard"
- "user management" + "admin"
- "product moderation" OR "content moderation"
- "refund" + "admin" OR "management"
- "analytics dashboard"
- "CRUD" + "admin"
- "bulk operations"
- "data table" + "admin"

#### Trigger File Operations:
- Creating/modifying admin routes (`src/app/admin/*`)
- Creating/modifying admin API endpoints (`src/app/api/admin/*`)
- Creating admin components or UI
- Adding moderation workflows

#### Trigger Code Patterns:
- Admin role checks
- Data table implementations
- Bulk operation handlers
- Analytics aggregation
- Export functionality (CSV, JSON)

#### Examples:
```
User: "Build admin panel for user management"
→ INVOKE: Admin Panel Architect Agent (primary) + Security Guardian (review)

User: "Create product moderation workflow"
→ INVOKE: Admin Panel Architect Agent

User: "Add analytics dashboard for platform metrics"
→ INVOKE: Admin Panel Architect Agent

User: "Implement bulk refund processing"
→ INVOKE: Admin Panel Architect Agent + Stripe Orchestrator
```

### SEO & Metadata Specialist Agent - Auto-Invoke When:

#### Trigger Keywords in User Request:
- "SEO" OR "search engine optimization"
- "meta tags" OR "metadata"
- "sitemap" + "generate" OR "xml"
- "structured data" OR "Schema.org" OR "JSON-LD"
- "Open Graph" OR "og:image"
- "Twitter Card"
- "canonical URL"
- "robots.txt"

#### Trigger File Operations:
- Creating/modifying sitemap generation (`src/app/sitemap.ts`)
- Creating/modifying robots.txt (`src/app/robots.ts`)
- Adding meta tag components
- Creating structured data implementations
- Adding Open Graph image generation

#### Trigger Code Patterns:
- Meta tag generation
- Structured data schemas
- Sitemap XML generation
- SEO utilities (slug generation, description truncation)

#### Examples:
```
User: "Implement dynamic sitemap for products"
→ INVOKE: SEO & Metadata Specialist Agent

User: "Add Open Graph images for social sharing"
→ INVOKE: SEO & Metadata Specialist Agent

User: "Create structured data for product pages"
→ INVOKE: SEO & Metadata Specialist Agent

User: "Optimize meta tags for better SEO"
→ INVOKE: SEO & Metadata Specialist Agent
```

---

## Multi-Agent Scenarios

Some tasks may require multiple agents. Invoke in sequence:

### Scenario: Creating Product Upload Flow
1. **xLights Specialist** - File validation and metadata extraction
2. **Security Guardian** - File upload security review

### Scenario: Building Checkout System
1. **Stripe Payment Orchestrator** - Payment integration
2. **Security Guardian** - Security audit of payment flow

### Scenario: Implementing Creator Onboarding
1. **Stripe Payment Orchestrator** - Stripe Connect setup
2. **Security Guardian** - Access control review

### Scenario: File Download Feature
1. **xLights Specialist** - File type handling
2. **Security Guardian** - Download security (signed URLs, rate limiting)

### Scenario: Implementing File Upload System
1. **File Storage Orchestrator** - Multipart upload, cloud storage integration
2. **xLights Specialist** - Metadata extraction from FSEQ/XSQ files
3. **Security Guardian** - File validation, virus scanning, security review

### Scenario: Building Background Job System
1. **Background Job Manager** - Queue setup, worker implementation
2. **File Storage Orchestrator** - File processing jobs
3. **Security Guardian** - Job security review

### Scenario: Creating Admin Panel
1. **Admin Panel Architect** - Dashboard, CRUD interfaces
2. **Security Guardian** - Admin authentication, authorization checks

### Scenario: SEO Implementation
1. **SEO & Metadata Specialist** - Meta tags, sitemap, structured data
2. **xLights Specialist** - Product-specific SEO optimization

---

## Agent Invocation Guidelines

### When to Invoke Manually
If user's request doesn't match auto-invoke triggers but involves:
- Complex security decisions
- xLights-specific feature design
- Payment flow architecture
- Compliance requirements
- Domain-specific best practices

### When NOT to Invoke
- Simple CRUD operations (unless security-sensitive)
- UI/styling changes (unless auth/payment UI)
- Documentation updates (unless security docs)
- Database migrations (unless permission changes)
- Testing (unless security testing)

### Invocation Best Practices

1. **Single Agent Tasks**: Invoke one agent if task is clearly in their domain
2. **Multi-Step Tasks**: Invoke agents sequentially as needed
3. **Review Tasks**: Always invoke Security Guardian for code review
4. **Domain Questions**: Invoke specialist when user asks domain-specific questions

---

## Task-to-Agent Mapping

### Authentication & Authorization Tasks
- **Agent**: Security Guardian
- **Tasks**: Login, registration, JWT, roles, permissions, session management

### File Upload & Validation Tasks
- **Agent**: xLights Specialist (primary), Security Guardian (review)
- **Tasks**: File upload, validation, metadata extraction, format parsing

### Payment Processing Tasks
- **Agent**: Stripe Payment Orchestrator (primary), Security Guardian (review)
- **Tasks**: Checkout, webhooks, orders, refunds, Connect onboarding

### Product Management Tasks
- **Agent**: xLights Specialist
- **Tasks**: Product creation, editing, validation, metadata display

### Download & Access Control Tasks
- **Agent**: Security Guardian (primary), xLights Specialist (file handling)
- **Tasks**: Download URLs, entitlements, rate limiting, access logs

### Creator Onboarding Tasks
- **Agent**: Stripe Payment Orchestrator
- **Tasks**: Stripe Connect setup, account linking, payout configuration

### Audit & Compliance Tasks
- **Agent**: Security Guardian
- **Tasks**: Audit logs, compliance checks, threat modeling, security reviews

### Revenue & Analytics Tasks
- **Agent**: Stripe Payment Orchestrator
- **Tasks**: Revenue calculation, fee management, financial reporting

### File Upload & Storage Tasks
- **Agent**: File Storage Orchestrator (primary), Security Guardian (review)
- **Tasks**: Multipart uploads, cloud storage integration, file validation, deduplication

### Background Job Tasks
- **Agent**: Background Job Manager
- **Tasks**: Queue setup, worker implementation, scheduled jobs, retry logic

### Admin Panel Tasks
- **Agent**: Admin Panel Architect (primary), Security Guardian (review)
- **Tasks**: User management, product moderation, analytics dashboards, bulk operations

### SEO & Optimization Tasks
- **Agent**: SEO & Metadata Specialist
- **Tasks**: Meta tags, sitemaps, structured data, Open Graph, social sharing

---

## Example Invocation Flow

### User Request: "Build the product creation flow with file uploads"

**Step 1: Analyze Request**
- Contains: "product creation", "file uploads"
- Domains: xLights products, file handling, security

**Step 2: Invoke xLights Specialist**
- Design product creation form
- Define xLights metadata fields
- Plan file upload structure
- Create file validation logic
- Extract metadata from files

**Step 3: Invoke Security Guardian**
- Review file upload security
- Validate file type checking
- Check authorization on product creation
- Ensure audit logging
- Review for vulnerabilities

**Step 4: Implementation**
- Create UI components
- Build API endpoints
- Implement validation
- Add security measures
- Create tests

---

## Agent Coordination Protocol

When multiple agents are needed:

1. **Identify Primary Agent**: Who has main expertise for the task?
2. **Invoke Primary Agent**: Let them design/implement core functionality
3. **Identify Review Agents**: Who should review the implementation?
4. **Invoke Review Agents**: Security Guardian reviews most features
5. **Synthesize**: Combine insights from all agents
6. **Implement**: Build with all agent recommendations

---

## Priority Rules

If multiple agents could apply, prioritize:

1. **Security Guardian** - Security concerns always take precedence
2. **Domain Expert** - xLights Specialist for sequences, Stripe Orchestrator for payments
3. **Secondary Review** - Other agents review after primary implementation

---

## Special Cases

### New API Endpoint Creation
**Always Invoke**: Security Guardian (mandatory for all API endpoints)
**Sometimes Invoke**: Domain agent if endpoint handles domain-specific logic

### Database Schema Changes
**Always Invoke**: Security Guardian (if affects auth/permissions)
**Sometimes Invoke**: Domain agent if affects domain models

### Bug Fixes
**Invoke**: Relevant domain agent
**Also Invoke**: Security Guardian if bug is security-related

### Performance Optimization
**Invoke**: Domain agent familiar with the code
**Also Invoke**: Security Guardian if optimization touches auth/payment code

---

## Monitoring & Adjustment

These rules should be reviewed and updated:
- When new agents are added
- When project requirements change
- When patterns emerge that need agent expertise
- When user feedback suggests better triggers

---

## Quick Reference Card

| Task Type | Primary Agent | Review Agent |
|-----------|---------------|--------------|
| Auth/Authz | Security Guardian | - |
| File Upload (UI) | xLights Specialist | Security Guardian |
| File Upload (System) | File Storage Orchestrator | Security Guardian |
| Cloud Storage | File Storage Orchestrator | - |
| Payment | Stripe Orchestrator | Security Guardian |
| Product CRUD | xLights Specialist | Security Guardian |
| Download | Security Guardian | xLights Specialist |
| Webhooks | Stripe Orchestrator | Security Guardian |
| Onboarding | Stripe Orchestrator | - |
| Background Jobs | Background Job Manager | - |
| Scheduled Tasks | Background Job Manager | - |
| Admin Panel | Admin Panel Architect | Security Guardian |
| User Management | Admin Panel Architect | Security Guardian |
| Moderation | Admin Panel Architect | - |
| Audit Logs | Security Guardian | - |
| Revenue | Stripe Orchestrator | - |
| Compliance | Security Guardian | - |
| SEO | SEO & Metadata Specialist | - |
| Sitemap | SEO & Metadata Specialist | - |
| Structured Data | SEO & Metadata Specialist | - |

---

### Project Architect Agent - Auto-Invoke When:

#### Trigger Keywords in User Request:
- "plan" + "feature" OR "implementation"
- "architecture" + "design" OR "decision"
- "break down" + "task" OR "feature"
- "roadmap" OR "planning"
- "how should we" + "implement" OR "build"
- "design" + "system" OR "architecture"
- "approach" + "decide" OR "choose"

#### Trigger File Operations:
- Planning a new major feature
- Making architectural decisions
- Designing database schema changes
- Evaluating technology choices

#### Examples:
```
User: "Plan the implementation of creator analytics dashboard"
→ INVOKE: Project Architect Agent

User: "How should we architect the notification system?"
→ INVOKE: Project Architect Agent

User: "Break down the task of adding product reviews"
→ INVOKE: Project Architect Agent

User: "Help me decide between approach A and B for caching"
→ INVOKE: Project Architect Agent
```

### Code Quality Specialist Agent - Auto-Invoke When:

#### Trigger Keywords in User Request:
- "review" + "code" OR "quality"
- "refactor" OR "refactoring"
- "code smell" OR "anti-pattern"
- "improve" + "code" OR "quality"
- "best practices" + "code"
- "clean up" + "code"
- "optimize" + "code" (quality, not performance)

#### Trigger File Operations:
- After implementing a feature (code review)
- Before finalizing implementation
- When code quality issues are suspected
- During refactoring sessions

#### Examples:
```
User: "Review the code quality of the new dashboard"
→ INVOKE: Code Quality Specialist Agent

User: "Help me refactor this component to be more maintainable"
→ INVOKE: Code Quality Specialist Agent

User: "Check for code smells in the authentication system"
→ INVOKE: Code Quality Specialist Agent

User: "Review this code for TypeScript best practices"
→ INVOKE: Code Quality Specialist Agent
```

### Implementation Coordinator Agent - Auto-Invoke When:

#### Trigger Keywords in User Request:
- "implement" + "feature" (large/complex)
- "build" + "system" OR "feature"
- "coordinate" + "implementation"
- "execute" + "plan"
- "manage" + "implementation"
- Starting a multi-step feature implementation

#### Trigger File Operations:
- Implementing a feature from a plan
- Coordinating multiple specialists
- Managing complex workflows
- Tracking implementation progress

#### Examples:
```
User: "Implement the Stripe Connect onboarding flow"
→ INVOKE: Implementation Coordinator Agent

User: "Build the file upload system with all features"
→ INVOKE: Implementation Coordinator Agent

User: "Execute the plan for the admin panel"
→ INVOKE: Implementation Coordinator Agent
```

### Test Strategy Agent - Auto-Invoke When:

#### Trigger Keywords in User Request:
- "test" + "plan" OR "strategy"
- "testing" + "approach" OR "coverage"
- "write tests" + "for"
- "validate" + "feature"
- "quality assurance" OR "QA"
- "test cases" OR "test scenarios"
- "manual test" + "checklist"

#### Trigger File Operations:
- Before deploying a feature
- After implementing critical functionality
- When planning test coverage
- During QA phase

#### Examples:
```
User: "Create a test plan for the checkout flow"
→ INVOKE: Test Strategy Agent

User: "Help me write tests for the authentication system"
→ INVOKE: Test Strategy Agent

User: "What should I test before deploying file uploads?"
→ INVOKE: Test Strategy Agent

User: "Create a manual testing checklist for the dashboard"
→ INVOKE: Test Strategy Agent
```

---

## Workflow Agent Coordination

### Typical Full Feature Workflow

```
1. Planning Phase
   → Project Architect: Creates implementation plan
   → Domain Agents: Consulted for domain-specific design

2. Implementation Phase
   → Implementation Coordinator: Manages execution
   → Domain Agents: Provide expertise during implementation
   → Code Quality Specialist: Reviews code as it's written

3. Review Phase
   → Security Guardian: Security review (if applicable)
   → Code Quality Specialist: Final code review
   → Test Strategy: Validates testing approach

4. Testing Phase
   → Test Strategy: Test planning and execution
   → Domain Agents: Domain-specific test validation

5. Finalization
   → Code Quality Specialist: Final review
   → Implementation Coordinator: Marks complete
```

### Quick Reference: Workflow Agents

| When to Use | Agent | Purpose |
|-------------|-------|---------|
| Starting a feature | Project Architect | Plan and design |
| Building a feature | Implementation Coordinator | Execute and track |
| Code review needed | Code Quality Specialist | Review and improve |
| Testing needed | Test Strategy | Plan and validate tests |

---

**Remember**: When in doubt, invoke the Security Guardian. Security is not optional in a marketplace platform.

**New Workflow**: For complex features, start with Project Architect → Implementation Coordinator → Code Quality Specialist → Test Strategy.
