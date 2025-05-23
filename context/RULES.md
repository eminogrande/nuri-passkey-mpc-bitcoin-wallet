# Project Development Rules

This document outlines the agreed-upon rules for the development of this project.

**1. Task Definition Before Action (Comprehensive & Self-Contained):**
    All development work must be based on a task that is first defined as an issue-style document in the `/tasks` directory. This task document must be as self-contained and informative as possible, including:
    *   A clear, concise **ID, Status, Priority, Assignee.**
    *   A clear **Description** of the problem or feature.
    *   A specific **Objective**.
    *   **Relevant Context & Documentation:**
        *   Direct links or precise references to any external SDK documentation or specific internal project documents (e.g., `briefing/portal-sdk-docs/specific_doc.md`, `PROJECT_DESCRIPTION_AND_PLAN.md`).
        *   A "Touches Areas" field listing key files or modules likely to be modified (e.g., `App.tsx`, `src/AuthContext.tsx`).
    *   **Dependencies:** A clear "Dependencies: Task XXX, Task YYY" field if the task relies on other tasks being completed first.
    *   Detailed, actionable **Sub-Tasks** for implementation.
    *   Clear **Testing Steps & Acceptance Criteria** (covering manual verification and definitions for automated tests, as per Rule #6).
    *   All standard **Post-Completion Documentation Sub-Tasks** (as per Rule #5, #6).
    *   **Versioning** information (as per Rule #4).
    *   *(AI Assistant (Cline) Responsibility: Cline will endeavor to include this contextual information when drafting new tasks, adhering to Rule #11 (Small Tasks) and Rule #12 (Explicit Briefing). Cline will also verify that stated dependencies are met or confirm with the user before proceeding with task implementation.)*

**2. Rule Creation:**
    The AI assistant will not create or suggest new rules beyond those explicitly provided by the user. All project rules must originate from the user.

**3. Documentation Review and Assumption Avoidance:**
    Cline (the AI assistant) must not assume how functionalities work. Always check all available project documentation thoroughly before making implementation suggestions or modifications. This includes, but is not limited to:
    *   The `PROJECT_DESCRIPTION_AND_PLAN.md` document.
    *   All files within the local `briefing/portal-sdk-docs/` folder.
    *   Existing code and configurations.
    If documentation is unclear, seems contradictory, or is missing for a specific feature, this should be highlighted for discussion.
    *Clarification on Web Access: Cline does not have live, general web browsing capabilities to check external websites or URLs for documentation beyond the information provided or its training data.*

**4. Version Bumping Policy:**
    *   The application's version number (following Semantic Versioning, e.g., `MAJOR.MINOR.PATCH`) will be bumped after the completion and verification of each task that results in a meaningful change to the codebase (e.g., new feature, significant refactoring, bug fix).
    *   Cline (the AI assistant) will assist in suggesting the type of version bump (PATCH, MINOR) for user approval.
    *   Each task definition in the `/tasks` directory must include:
        *   A field: `**Version Bump on Completion:** Yes/No`
        *   If Yes, a field: `**Proposed New Version:** X.Y.Z`
        *   A sub-task: `[ ] If version bump is 'Yes', update version in package.json and app.config.ts to the new version and mark this sub-task complete.`

**5. Comprehensive Task Documentation in `COMPLETED_SETUP_LOG.md`:**
    *   Upon completion of any task defined in the `/tasks` directory, a summary of the work done, key changes, outcomes, and any important decisions made must be documented in `COMPLETED_SETUP_LOG.md`.
    *   Each task definition in the `/tasks` directory must include as a final sub-task: `[ ] Update COMPLETED_SETUP_LOG.md with a summary of this task's completion, including changes made and verification results.`

**6. Mandatory Testing, Automated Tests, & `TESTS.md` Documentation:**
    *   Every task that involves code changes or introduces new functionality must include specific testing steps, encompassing both manual verification and automated tests where applicable.
    *   These tests must pass for the task to be considered complete.
    *   Each task definition in the `briefing/tasks/` directory must clearly outline its "Testing Steps & Acceptance Criteria."

    *   **Comprehensive Feedback for Debugging and Verification:**
        *   **Console Logging:** Critical operations, API calls, SDK interactions, and significant state changes should include descriptive console logs (e.g., `console.log` for success/info, `console.error` for errors) to aid local debugging. Task definitions should specify key information to be logged.
        *   **In-App Feedback (Especially for Device/TestFlight Testing):** For operations whose success/failure is not immediately obvious in the UI (e.g., background API calls, SDK interactions like wallet creation), and especially when testing on physical devices via TestFlight where console logs are hard to access:
            *   Tasks should include implementing temporary or permanent in-app visual feedback (e.g., status messages, loading indicators, success/error alerts or text displays).
            *   This ensures the outcome of the operation can be verified directly within the app during testing.
            *   If feedback is temporary for debugging, a follow-up sub-task to remove or refine it should be considered.
        *   **Automated Tests:** (As already defined below)
    *   **Automated Tests:**
        *   For tasks involving new or modified application logic or UI components, corresponding automated tests (e.g., unit, integration using a framework like Jest) must be written.
        *   Automated test files should reside in a dedicated `__tests__/` directory at the project root, with clear naming conventions (e.g., `FileName.test.tsx`).
        *   Automated test code must be well-commented to explain the purpose of each test suite and individual test case.
        *   The task definition in `briefing/tasks/*.md` must include a specific sub-task for writing these automated tests.
    *   **`briefing/TESTS.md` Documentation:**
        *   A separate document, `briefing/TESTS.md`, will be maintained to provide a high-level inventory and simple language explanation of all key tests defined for the project (both manual verification procedures and automated tests). This includes:
            *   The purpose of each test (what it verifies).
            *   A simple description of how the test works.
        *   Each task definition in `briefing/tasks/*.md` that introduces or modifies tests (manual or automated) must include a sub-task: `[ ] Document this task's test(s) and their workings in briefing/TESTS.md.`
    *   **Immediate Post-Change Verification:** After any code modification by Cline, a quick manual check of the directly affected UI/functionality must be performed by the user. If the change impacts a file modified by a recent, dependent task, the user should also verify that the prior task's core functionality remains intact. Cline will prompt for this verification.

---

**7. Extreme Caution with Build-Critical Configurations:**
    *   Changes to files or settings that directly impact the build process (e.g., `.gitignore` in relation to native folders, `app.config.ts` for native project generation, `eas.json`, `package.json` dependencies affecting native modules) must be approached with extreme caution.
    *   **Understand Implications:** Before making such changes, the potential impact on local development, EAS builds, and native project generation (prebuild) must be thoroughly understood.
    *   **Immediate Testing:** After any such change, an immediate test build (e.g., local `npx expo run:ios/android` or a targeted EAS development build) must be performed to verify the system remains operational and the change had the intended effect without unintended side effects.
    *   **Iterative Approach:** Prefer small, incremental changes with testing after each step over large, bundled changes to build configurations.
    *   *(Learned from Task 003/005 - `ios` directory and `.gitignore` interaction leading to "No Podfile" build errors).*

---

**8. Pre-Change & Pre-Build Checklists (Collaborative Safeguard):**
    *   **Purpose:** To minimize errors and ensure shared understanding before critical actions.
    *   **Before Modifying Build-Critical Configurations (see Rule 7):**
        *   [ ] **Understand Impact:** Clearly articulate the intended change and its expected impact on local dev, EAS builds, and native projects.
        *   [ ] **Review Relevant Docs/Tasks:** Check `PROJECT_DESCRIPTION_AND_PLAN.md`, `briefing/RULES.md`, related tasks in `briefing/tasks/`, and `COMPLETED_SETUP_LOG.md` for relevant history or guidelines.
        *   [ ] **Backup Strategy:** If modifying local uncommitted files (e.g., native directories before a `--clean` prebuild), ensure a backup or recovery plan exists.
        *   [ ] **Incremental Steps:** Plan the change in the smallest possible increments.
    *   **Before Initiating an EAS Build (especially after changes):**
        *   [ ] **Verify Git Status:** Ensure all intended changes are committed and pushed to the correct branch.
        *   [ ] **Confirm Profile:** Double-check the correct EAS build profile (`development`, `production`, etc.) is being used.
        *   [ ] **Check `expo doctor`:** Run `npx expo-doctor` locally to catch any new project configuration issues.
        *   [ ] **Review Recent Changes:** Briefly review the latest commits/changes that might impact the build.
    *   **AI Assistant (Cline) Adherence:** Cline must mentally (or explicitly if complex) go through relevant checklist items before proposing or executing critical actions.

**9. Project Diary & Contextual Review (Continuous Learning):**
    *   **Purpose:** To maintain a collective memory of the project's evolution, decisions, and learnings, protecting new and existing team members from repeating past mistakes.
    *   **Routine Practice:** Before starting a new task, when troubleshooting, or when proposing significant changes, all team members (including AI assistants) *must* review:
        *   The current task definition.
        *   Related past tasks in `briefing/tasks/`.
        *   Entries in `briefing/COMPLETED_SETUP_LOG.md` relevant to the components or systems being worked on.
        *   Current project rules in `briefing/RULES.md`.
    *   **Documentation as Diary:** Treat task files and the `COMPLETED_SETUP_LOG.md` as a living "project diary." Entries should be clear, concise, and capture not just *what* was done, but *why* and what was *learned*.
    *   **Onboarding:** This practice is critical for onboarding new members, allowing them to understand the project's history and rationale behind current states.

---

**10. Task-Based Commits for Traceability and Rollback:**
    *   **Purpose:** To ensure all code changes are traceable to a specific task and to facilitate easier rollbacks or understanding of changes.
    *   **Practice:**
        *   All code modifications, configuration changes, and additions made as part of a defined task (from `briefing/tasks/`) should be committed to the Git repository.
        *   Commit messages should ideally reference the Task ID (e.g., "Fix: Resolve icon display issue (Task 003)").
        *   Major sub-steps within a complex task can also be committed incrementally.
        *   This practice ensures that the project's Git history aligns with the task-based workflow, providing clear checkpoints and making it easier to roll back to a state before a specific task's changes if necessary.
    *   **AI Assistant (Cline) Responsibility:** When guiding through changes, Cline will remind the user to commit changes related to the current task before moving to significantly different work or concluding a task.

---

**11. Small, Digestible Tasks with Clear Dependencies:**
    *   **Purpose:** To ensure changes are minimal, easily testable, and manageable. Promotes iterative development and reduces risk.
    *   **Practice:**
        *   Break down larger features or objectives into the smallest possible, independently completable and testable tasks.
        *   Each task should ideally correspond to a single conceptual change or a very small set of related changes.
        *   If a task has dependencies on other tasks (i.e., it cannot be started or completed until another task is done), these dependencies must be clearly stated in the task description (e.g., "Depends on: Task 00X").
        *   Each task should clearly outline which areas of the codebase it touches.
        *   Prefer more, smaller tasks over fewer, larger tasks.
    *   **Alignment with Git Workflow:** Each completed task should ideally result in a focused Pull Request (PR) if using a PR-based workflow, and its changes committed with a reference to the Task ID.
    *   **AI Assistant (Cline) Responsibility:** Cline will strive to define tasks in this granular manner and will highlight dependencies.
    *   **Task Scope and Non-Regression:** When a task modifies existing code, its scope must be strictly limited to the new functionality. It must not regress or remove functionality implemented in prior, dependent tasks unless explicitly stated as an objective of the current task. Acceptance criteria should reflect this, and Cline will aim to verify this non-regression.

---

**12. Strict Adherence to Explicit Task Briefing in Task Definition and Implementation:**
    *   **Purpose:** To ensure the AI assistant (Cline) does not introduce unrequested features, UI elements, or logic into task definitions or during implementation.
    *   **Practice for Task Definition:**
        *   When defining a new task based on user request, Cline must only include objectives, sub-tasks, and acceptance criteria that directly correspond to what the user has explicitly stated or asked for.
        *   Avoid adding "nice-to-have" features, placeholder UI elements (like status messages unless requested), or speculative logic (like navigation flows not yet discussed) into the task definition.
    *   **Practice for Implementation:**
        *   When executing a task, Cline must implement *only* what is defined in that task's "Detailed Sub-Tasks" and meet its "Acceptance Criteria."
        *   If Cline believes additional elements are beneficial, they should be proposed to the user as a *separate, potential follow-up task* rather than being incorporated into the current one without explicit approval.
    *   **Clarity over Assumption:** If the user's request is brief, Cline should ask clarifying questions to ensure the task scope is well-understood before defining it, rather than making assumptions.

---

**13. Cline's Operational Ethos: Precision, Diligence, and Rule Adherence:**
    *   **Purpose:** To define the expected working style of the AI assistant (Cline) to maximize accuracy and reliability.
    *   **Principles:**
        *   **Critical Thinking & Diligence:** Before proposing actions (especially code changes or new task definitions), Cline will internally review all relevant rules, context, recent changes, and potential impacts. This includes "over-thinking" potential failure points or regressions.
        *   **Get it Right the First Time:** While iteration is part of development, the goal is to maximize the chances of the *first attempt* at a task's implementation being correct by thorough planning and adherence to defined processes.
        *   **No Over-Engineering / Strict Scope Adherence:** Cline will strictly adhere to the defined scope of the current task (Rule #11, #12) and avoid introducing complexity or features not explicitly requested.
        *   **Unyielding Rule Adherence:** All defined project rules in `briefing/RULES.md` are paramount and must be followed meticulously.
        *   **Proactive Verification:** Cline will proactively suggest verification steps (manual or automated) after changes and will highlight if a proposed change might conflict with existing functionality or rules.

---

**14. Precision in Code Modification Tools (`replace_in_file`):**
    *   **Purpose:** To minimize the risk of unintended side effects when modifying files.
    *   **Practice:**
        *   When using tools like `replace_in_file`, the `SEARCH` block must be as minimal and precise as possible to target *only* the lines intended for modification.
        *   Context lines around the change should be used judiciously for uniqueness but not so broadly as to risk including unrelated code that might be accidentally altered or removed.
        *   The AI assistant (Cline) is responsible for crafting these diffs with extreme care, especially in shared or complex files, and should double-check the diff's scope before proposing it.
