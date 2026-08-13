# Skill patterns

These patterns emerged from skills built by early adopters and Anthropic's internal
teams. They are approaches that worked well, **not prescriptive templates**.

---

## Choosing the framing: problem-first vs tool-first

The Home Depot analogy: you can walk in with a problem ("I need to fix a kitchen
cabinet") and have an employee point you at the right tools; or you can pick out a
new drill and ask how to use it for your job.

- **Problem-first:** "I need to set up a project workspace" → the skill orchestrates
  the right MCP calls in the right sequence. The user describes outcomes; the skill
  handles the tools.
- **Tool-first:** "I have the Notion MCP connected" → the skill teaches Claude the
  optimal workflows and best practices. The user already has the access; the skill
  brings the expertise.

Most skills lean one way. Knowing which one fits helps pick the pattern.

---

## Pattern 1: Sequential workflow orchestration

**Use when:** the user needs multi-step processes in a specific order.

```markdown
## Workflow: Onboard New Customer

### Step 1: Create Account
Call MCP tool: `create_customer`
Parameters: name, email, company

### Step 2: Setup Payment
Call MCP tool: `setup_payment_method`
Wait for: payment method verification

### Step 3: Create Subscription
Call MCP tool: `create_subscription`
Parameters: plan_id, customer_id (from Step 1)

### Step 4: Send Welcome Email
Call MCP tool: `send_email`
Template: welcome_email_template
```

**Key techniques:**
- Explicit step order
- Dependencies between steps
- Validation at each stage
- Rollback instructions on failure

---

## Pattern 2: Multi-MCP coordination

**Use when:** the workflow spans several services.

Example — design-to-development handoff:

```markdown
### Phase 1: Design Export (Figma MCP)
1. Export design assets from Figma
2. Generate design specifications
3. Create an asset manifest

### Phase 2: Asset Storage (Drive MCP)
1. Create the project folder in Drive
2. Upload all assets
3. Generate shareable links

### Phase 3: Task Creation (Linear MCP)
1. Create development tasks
2. Attach asset links to the tasks
3. Assign to the engineering team

### Phase 4: Notification (Slack MCP)
1. Post the handoff summary in #engineering
2. Include asset links and task references
```

**Key techniques:**
- Clear phase separation
- Data passing between MCPs
- Validation before advancing a phase
- Centralized error handling

---

## Pattern 3: Iterative refinement

**Use when:** output quality improves with iteration.

Example — report generation:

```markdown
## Iterative Report Creation

### Initial Draft
1. Fetch data via MCP
2. Generate the first report draft
3. Save to a temporary file

### Quality Check
1. Run the validation script: `scripts/check_report.py`
2. Identify problems:
   - Missing sections
   - Inconsistent formatting
   - Data validation errors

### Refinement Loop
1. Resolve each identified problem
2. Regenerate the affected sections
3. Re-validate
4. Repeat until the quality threshold is met

### Finalization
1. Apply final formatting
2. Generate a summary
3. Save the final version
```

**Key techniques:**
- Explicit quality criteria
- Iterative improvement
- Validation scripts
- **Knowing when to stop iterating**

---

## Pattern 4: Contextual tool selection

**Use when:** same outcome, different tools depending on the context.

Example — file storage:

```markdown
## Smart File Storage

### Decision Tree
1. Check the file's type and size
2. Determine the best location:
   - Large files (>10MB): use the cloud storage MCP
   - Collaborative documents: use the Notion/Docs MCP
   - Code files: use the GitHub MCP
   - Temporary files: use local storage

### Execute Storage
Per the decision:
- Call the appropriate MCP tool
- Apply service-specific metadata
- Generate an access link

### Provide Context to User
Explain why that storage was chosen
```

**Key techniques:**
- Clear decision criteria
- Fallback options
- Transparency about the decisions made

---

## Pattern 5: Domain intelligence

**Use when:** the skill brings specialized knowledge beyond tool access.

Example — financial compliance:

```markdown
## Payment Processing with Compliance

### Before Processing (Compliance Check)
1. Fetch the transaction details via MCP
2. Apply the compliance rules:
   - Check sanctions lists
   - Verify per-jurisdiction permissions
   - Assess the risk level
3. Document the compliance decision

### Processing
IF compliance passed:
  - Call the payment processing MCP tool
  - Apply the relevant fraud checks
  - Process the transaction
ELSE:
  - Flag for review
  - Create a compliance case

### Audit Trail
- Log every compliance check
- Record the processing decisions
- Generate an audit report
```

**Key techniques:**
- Domain expertise embedded in the logic
- Compliance before action
- Thorough documentation
- Clear governance

---

## Use case categories

### Category 1: Document and asset creation

**For:** consistent, high-quality output — documents, presentations, apps, designs,
code.

Real example: the `frontend-design` skill (also the docx, pptx, xlsx ones).

**Key techniques:**
- Embedded style guides and brand standards
- Template structures for consistent output
- Quality checklists before finalizing
- No external tools — uses Claude's built-in capabilities

### Category 2: Workflow automation

**For:** multi-step processes that benefit from a consistent methodology, including
coordination across several MCP servers.

Real example: the `skill-creator` skill itself.

**Key techniques:**
- Step-by-step workflow with validation gates
- Templates for common structures
- Built-in review and improvement suggestions
- Iterative refinement loops

### Category 3: MCP enhancement

**For:** workflow guidance that amplifies the tool access an MCP server provides.

Real example: the `sentry-code-review` skill (from Sentry).

**Key techniques:**
- Coordinates multiple MCP calls in sequence
- Embeds domain expertise
- Supplies context the user would otherwise have to specify
- Error handling for common MCP problems

---

## MCP and skills: the kitchen analogy

- **MCP provides the professional kitchen:** access to tools, ingredients and
  equipment. It's *what Claude can do*.
- **Skills provide the recipes:** step-by-step instructions for creating something
  valuable. It's *how Claude should do it*.

| MCP (connectivity) | Skills (knowledge) |
|---|---|
| Connects Claude to your service (Notion, Asana, Linear) | Teaches Claude to use your service effectively |
| Gives access to real-time data and tool invocation | Captures workflows and best practices |
| What Claude can do | How Claude should do it |
