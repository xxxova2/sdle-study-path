# SDLE Study Path - JavaScript Refactoring Plan

## Overview
Refactor the monolithic 6,500+ line `app.js` into modular ES6 components for better maintainability, testability, and code organization.

## Phase 1: Foundation Modules ✅ COMPLETED

### Created Modules
1. **`js/modules/storage.js`** - Storage layer with error handling
   - localStorage wrapper with quota/privacy mode handling
   - Data normalization utilities (stats, wrongBook, etc.)
   - Persistence key management
   - Helper functions (todayKey, humanLessonTitle)

2. **`js/modules/state.js`** - State management
   - Initial state creation from localStorage
   - Session day rollover logic
   - Plan day tracking
   - Simple/Coach mode handling
   - State persistence

### Next Core Modules (Priority Order)

3. **`js/modules/data-loader.js`** - Data access layer
   - Lazy loading of questions.js (16MB+)
   - Category-based question filtering
   - Question selection algorithms (unseen, wrong book, random)
   - Topic/subtopic indexing

4. **`js/modules/quiz-engine.js`** - Quiz logic
   - Question rendering
   - Answer validation
   - Explanation display
   - Progress tracking
   - Session statistics

5. **`js/modules/router.js`** - View navigation
   - View stack management
   - Route handlers (today, lessons, practice, settings, etc.)
   - Back button support
   - URL hash synchronization (optional)

6. **`js/modules/ui-components.js`** - UI rendering
   - Navigation bar rendering
   - Tab switching
   - Card/flashcard UI
   - Progress bars
   - Modal dialogs

7. **`js/modules/analytics.js`** - Statistics & tracking
   - Performance metrics calculation
   - Topic breakdown
   - History tracking
   - Daily goals monitoring

8. **`js/modules/study-modes.js`** - Different study modes
   - Lesson mode
   - Practice quiz mode
   - Wrong book review
   - Unseen questions
   - Mixed practice

9. **`js/modules/pomodoro.js`** - Timer functionality
   - Timer start/pause/reset
   - Break notifications
   - Session tracking

10. **`js/modules/settings.js`** - User preferences
    - Plan length selection
    - Daily goal configuration
    - Focus mode toggle
    - Simple/Coach mode switch

11. **`js/modules/app.js`** - Main entry point
    - Module initialization
    - Event binding
    - Application bootstrap

## Phase 2: Quality Improvements

### Validation Scripts ✅ STARTED
- **`scripts/validate_questions.js`** - Data integrity checking
  - Schema validation
  - Duplicate detection
  - Reference integrity
  - Quality metrics reporting

### Future Scripts
- `scripts/deduplicate_questions.js` - Remove duplicate questions
- `scripts/optimize_json.js` - Compress/split large data files
- `scripts/generate_indexes.js` - Create topic/subtopic indexes

## Phase 3: Testing Infrastructure

### Test Files to Create
- `tests/unit/storage.test.js`
- `tests/unit/state.test.js`
- `tests/unit/quiz-engine.test.js`
- `tests/integration/app.test.js`

### Recommended Framework
- **Vitest** - Fast, modern, ESM-native
- Alternative: **Jest** with ESM support

## File Structure

```
/workspace
├── js/
│   ├── app.js              # Legacy (to be replaced)
│   ├── modules/            # New modular architecture
│   │   ├── storage.js      ✅ Created
│   │   ├── state.js        ✅ Created
│   │   ├── data-loader.js  # TODO
│   │   ├── quiz-engine.js  # TODO
│   │   ├── router.js       # TODO
│   │   ├── ui-components.js # TODO
│   │   ├── analytics.js    # TODO
│   │   ├── study-modes.js  # TODO
│   │   ├── pomodoro.js     # TODO
│   │   ├── settings.js     # TODO
│   │   └── app.js          # TODO (main entry)
│   └── utils/              # Shared utilities
├── scripts/
│   ├── validate_questions.js ✅ Created
│   └── ...
├── tests/                   # TODO
│   ├── unit/
│   └── integration/
├── data/
│   └── questions.js        # 16MB MCQ data
└── index.html              # Update script tags
```

## Migration Strategy

### Step 1: Parallel Development
- Build new modules alongside legacy code
- No breaking changes to existing functionality

### Step 2: Gradual Replacement
- Replace one feature at a time
- Test each module independently
- Maintain backward compatibility

### Step 3: Switch to Modules
- Update `index.html` to use type="module"
- Import new modular app
- Remove legacy app.js

### Step 4: Cleanup
- Remove deprecated code
- Optimize bundle size
- Add comprehensive tests

## Benefits

1. **Maintainability**: Smaller, focused files
2. **Testability**: Isolated units for testing
3. **Performance**: Lazy loading, code splitting
4. **Collaboration**: Clear module boundaries
5. **Debugging**: Better stack traces, easier to trace issues
6. **Extensibility**: Easy to add new features

## Current Status

✅ **Completed:**
- Data validation script (`validate_questions.js`)
  - Found 6 duplicate IDs in 16,331 questions
  - Identified 1,186 unusable questions (7.3%)
  - Generated detailed validation report
  
- Storage module (`modules/storage.js`)
- State module (`modules/state.js`)

🔄 **In Progress:**
- Module architecture design
- Core refactoring planning

📋 **Next Steps:**
1. Create data-loader module for efficient question access
2. Build quiz-engine module
3. Implement router for view management
4. Set up testing framework (Vitest)
5. Run validation script to fix duplicate IDs

## Usage Examples

### Running Validation Script
```bash
node scripts/validate_questions.js
node scripts/validate_questions.js /path/to/custom/questions.js
```

### Using Modules (after migration)
```javascript
import { store, normalizeStats } from './js/modules/storage.js';
import { createInitialState, ensureSessionDay } from './js/modules/state.js';

const state = createInitialState();
ensureSessionDay(state);
```
