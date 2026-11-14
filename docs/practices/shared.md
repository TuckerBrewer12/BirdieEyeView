# Shared coding practices

## Readability and ownership

Give functions one coherent responsibility and use names that describe domain meaning. Extract a helper when it makes a rule or stage understandable and reusable; file length alone is not a reason to split a module. Prefer clear intermediate values to densely combined expressions when calculations require explanation.

Keep a rule with its owner: HTTP parsing and errors at the API boundary, golf invariants in Models, multi-step workflows in Services, aggregate measurements in Analytics, SQL in repositories, and interactive presentation state in frontend hooks/components. Existing violations are migration work, not patterns to copy automatically.

Share genuinely identical rules, constants, and messages. Similar-looking code can have different contracts: exact score labels and chart groups, request DTOs and domain entities, and raw observations and accepted scores need not be one type.

## Data and numbers

Unknown, zero, false, omitted, and explicitly cleared are different states. Preserve the distinction through forms, HTTP requests, models, calculations, SQL, and charts. Give numerical policies names, units, and a rationale. A named constant improves readability but does not validate an unsupported benchmark or estimate.

When changing a measurement, identify the eligible observations, denominator, weighting, history window, and round format. State assumptions behind estimates. Preserve raw evidence separately from values derived or corrected from it.

## Refactor discipline

Keep behavior-preserving cleanup separate from intentional rule fixes when practical. Record the before/after contract and test observable behavior. Avoid introducing frameworks, layers, or dependencies merely to rename or move a few functions.

Coordinate changes across request schemas, model rules, database constraints, and frontend types; changing one layer does not complete an end-to-end feature. Preserve unrelated work in the shared checkout. Use small coherent commits when committing is requested, and describe relevant validation and remaining integration work.

## Configuration

Follow the repository's actual tools rather than assuming a formatting convention. Do not include real credentials, tokens, original private reports, or environment files in documentation/tests. The existing [deployment guide](../../SECURITY_DEPLOYMENT.md) and secret-check script cover operational handling.
