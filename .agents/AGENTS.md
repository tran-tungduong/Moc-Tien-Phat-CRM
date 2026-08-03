# Workspace Rules

## User Preferences
- **Skip Browser Automation / DOM Preview**: Do NOT run `browser_subagent` or interactive browser testing after UI edits unless explicitly requested by the user. Test directly via code verification or let the user inspect locally to save time and tokens.
- **Confirm Before Modifying Code on Inquiries**: When the user asks a question, inquires about app logic, or requests clarification (e.g. "tại sao...", "có phải..."), explain the answer clearly first and wait for explicit user confirmation before modifying source code.
- **Require Explicit User Approval for Implementation Plans**: When presenting an `implementation_plan.md` or any technical plan, do NOT auto-proceed or rely on auto-approval policies. Always STOP and wait for explicit typed confirmation / response from the user before executing any plan steps.
