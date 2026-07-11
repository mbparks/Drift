# Drift v7.4.2 — Runtime Stability

Drift is a local-first field inquiry platform for observing change, diagnosing friction, preserving perspectives, testing predictions, verifying interventions, and carrying lessons forward.

## v7.4 Portfolio Learning

This release turns inquiry records into explainable organizational learning:

- ranks lessons by documented confidence, applicability, and relevance to other inquiries;
- identifies recurring unresolved friction across the portfolio;
- surfaces completed and verified interventions as effectiveness candidates;
- detects repeated investigation blind spots;
- compares forecast learning by domain;
- proposes standard practices from repeated lessons and verified interventions;
- proposes reusable inquiry templates from repeated subject areas;
- lets users inspect every supporting source, create validation actions, save candidates, and launch new inquiries.

All analysis is deterministic, local, and user-controlled. Repetition is presented as a reason to investigate, not proof of causation or universal applicability.

## Run

Serve the folder from any static web server and open `index.html`. All application data remains in browser storage unless explicitly exported.


## v7.4.2 runtime correction

This patch fixes the `all is not defined` inquiry overview failure by moving inquiry record aggregation into `app-core.js`. It also corrects recent-activity record links to call the actual v6.2 record inspector entry point and expands the Open Inquiry integration test to verify both dependencies.
