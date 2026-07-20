```markdown
# sdle-study-path Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill covers the core development patterns and conventions used in the `sdle-study-path` JavaScript repository. It outlines file organization, import/export styles, and testing practices to help contributors maintain consistency and quality in the codebase. No specific framework is used, so patterns are based on standard JavaScript.

## Coding Conventions

### File Naming
- **Style:** Snake case  
  **Example:**  
  ```
  user_profile.js
  data_manager.js
  ```

### Import Style
- **Relative imports** are used to reference local modules.  
  **Example:**  
  ```javascript
  import { fetchData } from './data_manager.js';
  ```

### Export Style
- **Named exports** are preferred over default exports.  
  **Example:**  
  ```javascript
  // In data_manager.js
  export function fetchData() { ... }
  export const DATA_LIMIT = 100;
  ```

  ```javascript
  // In another file
  import { fetchData, DATA_LIMIT } from './data_manager.js';
  ```

### Commit Patterns
- **Type:** Freeform (no enforced prefixes)
- **Average length:** ~75 characters per commit message

## Workflows

### Adding a New Module
**Trigger:** When you need to introduce a new feature or utility  
**Command:** `/add-module`

1. Create a new file using snake_case (e.g., `feature_name.js`).
2. Implement your functions or constants using named exports.
3. Import your module into relevant files using relative paths.
4. Write corresponding tests in a file named `feature_name.test.js`.
5. Commit changes with a descriptive message.

### Updating an Existing Module
**Trigger:** When modifying or extending existing functionality  
**Command:** `/update-module`

1. Locate the module file (e.g., `existing_feature.js`).
2. Make necessary changes, maintaining named exports.
3. Update or add tests in the corresponding `existing_feature.test.js`.
4. Commit with a clear message describing the update.

### Running Tests
**Trigger:** To verify code correctness after changes  
**Command:** `/run-tests`

1. Identify all test files matching the `*.test.*` pattern.
2. Run tests using your preferred JavaScript test runner (not specified in repo).
3. Review results and fix any failing tests before committing.

## Testing Patterns

- **Test files** are named using the pattern: `*.test.*` (e.g., `user_profile.test.js`).
- **Testing framework** is not specified; use any standard JavaScript testing tool (e.g., Jest, Mocha).
- **Test Example:**
  ```javascript
  // user_profile.test.js
  import { getUserProfile } from './user_profile.js';

  test('returns correct user data', () => {
    const result = getUserProfile(1);
    expect(result.name).toBe('Alice');
  });
  ```

## Commands
| Command         | Purpose                                   |
|-----------------|-------------------------------------------|
| /add-module     | Scaffold and implement a new module       |
| /update-module  | Update an existing module                 |
| /run-tests      | Run all test files in the repository      |
```
