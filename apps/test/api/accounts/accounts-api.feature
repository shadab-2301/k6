@api @Accounts @Regression
Feature: Accounts API

    API-only scenario that talks directly to the backend, no browser/UI involved.
    Authentication is a separate, dedicated API login (see api-auth-provider.ts),
    independent of the UI login flow used by the browser scenarios in this module.
    This demonstrates the API automation framework integrated alongside the
    existing UI POM structure: central endpoint registry, schema validation, and
    environment-aware test data.

    Scenario: Verify accounts list endpoint returns accounts
        When the user requests the accounts list via API
        Then the API response status should be 200
        And the API response should match its schema
        And the API response should contain at least the expected number of accounts for the current environment
        And the API response total count from jpath should match the accounts returned
