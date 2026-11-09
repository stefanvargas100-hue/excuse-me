---
name: test-first
description: Use whenever writing or changing code that has behaviour worth checking (new features, bug fixes, game rules, calculations, data handling). Write the test first, watch it fail, then implement. Skip for pure wording, styling or throwaway scripts.
---

# Test first, then implement

Write the test before the code, so the test cannot be shaped to fit what the code happens to do.

## Steps

1. **Pick what matters.** Test the most important behaviour: the thing that, if broken, would make the feature useless or hurt the user (core rules, scoring, saving and loading data, anything money, security or progress related, and any bug you are fixing). Do not test every line, getters, layout, or wording.
2. **Write the test first.** Describe the expected result in plain terms from the user's goal ("a perfect dash gives a speed boost"), not from how you plan to build it.
3. **Run it and watch it fail.** It must fail for the right reason (feature missing), not because of a typo. A test that has never failed proves nothing. If it passes before any code exists, the test is wrong.
4. **Implement** the smallest change that makes it pass.
5. **Run the full suite.** Everything must pass before committing.

## Rules that keep it honest

- Never edit a test just to make it pass. Change a test only if the requirement itself changed, and say so in the report.
- Never weaken a check (looser numbers, removed assertions) to get green.
- For a bug fix, first write a test that reproduces the bug, then fix it.
- If a behaviour is hard to test automatically (looks, feel, touch timing), say so and name what the Director should check by hand instead.

## Reporting

In plain language: what was tested, that it failed first and now passes, and anything deliberately left untested. No code tour.
