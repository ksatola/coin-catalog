# Development Task List

This file records implementation tasks that have been identified but are not yet complete. Tasks are removed or marked complete only after implementation and verification.

## Phase 8 — Collections / Coin Editing

### Pending

- [ ] **Separate collection save from coin-detail save in coin editing.** The collection assignment/move must have its own save action and must not be part of the main `Zapisz zmiany` action for coin details.
- [ ] **Keep coin-detail save focused on coin attributes.** The main coin edit save should update coin details without moving the coin between collections.
- [ ] **Define and implement independent collection-save behavior.** Collection changes must use the existing atomic coin-move mechanism without coupling it to the coin-detail update flow.
- [ ] **Add automated tests for the separated save mechanisms.** Cover collection change/save independently from coin-detail update, including the case where both collection and coin attributes have been edited before either save action is used.
- [ ] **Add regression coverage for the interaction with categories.** Category assignment/removal must remain an independent save mechanism and must not be affected by collection or coin-detail saves.
- [ ] **Fix vertical spacing in the coin edit UI.** The current margin/spacing adjustment around the edit header, Collection section, and Photos section did not produce the intended visual result. Revisit later and make the spacing match the gaps between the subsequent form sections.

### Notes

- The spacing issue is intentionally deferred for now.
- The current category mechanism is the reference pattern for independent save behavior: category assignment/removal is handled by its own controls and API calls.
