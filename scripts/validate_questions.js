#!/usr/bin/env node
/**
 * SDLE Question Bank Validator
 * Validates the structure and integrity of questions.js data file
 * 
 * Usage: node validate_questions.js [path/to/questions.js]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_QUESTIONS_PATH = path.join(__dirname, '..', 'data', 'questions.js');
const REQUIRED_FIELDS = ['id', 'topic', 'q', 'options', 'answer'];
const OPTIONAL_FIELDS = ['explanation', 'subtopics', 'difficulty', 'source', 'department', 'usable', 'truth_pass', 'book_support'];
const VALID_TOPICS = ['restorative', 'perio', 'endo', 'oms', 'ortho_pedo', 'ethics', 'mixed'];
const MAX_QUESTION_LENGTH = 500;
const MAX_OPTION_LENGTH = 200;
const MAX_EXPLANATION_LENGTH = 1000;

// Statistics
const stats = {
  total: 0,
  valid: 0,
  warnings: 0,
  errors: 0,
  byTopic: {},
  byDifficulty: {},
  unusable: 0,
  missingExplanation: 0,
  duplicateIds: new Set(),
};

const errors = [];
const warnings = [];

/**
 * Parse the questions.js file (it's an IIFE that assigns to global variable)
 */
function parseQuestionsFile(filePath) {
  console.log(`📄 Reading ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract JSON array from the IIFE wrapper
  // The file format is: (function(){ ... })(window); with questions assigned to window.questions
  // Or: var questions = [...]; or just [...]
  
  let jsonStart = content.indexOf('[');
  let jsonEnd = content.lastIndexOf(']');
  
  if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
    throw new Error('Could not find JSON array in questions.js file');
  }
  
  const jsonString = content.substring(jsonStart, jsonEnd + 1);
  
  console.log(`📊 Parsing ${jsonString.length.toLocaleString()} characters of JSON...`);
  
  try {
    const questions = JSON.parse(jsonString);
    console.log(`✅ Successfully parsed ${questions.length.toLocaleString()} questions`);
    return questions;
  } catch (parseError) {
    // Try to find the position of the error
    const match = parseError.message.match(/position (\d+)/);
    if (match) {
      const pos = parseInt(match[1]);
      const context = jsonString.substring(Math.max(0, pos - 50), Math.min(jsonString.length, pos + 50));
      throw new Error(`JSON parse error at position ${pos}: ${parseError.message}\nContext: ...${context}...`);
    }
    throw parseError;
  }
}

/**
 * Validate a single question object
 */
function validateQuestion(question, index) {
  const questionErrors = [];
  const questionWarnings = [];
  
  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in question)) {
      questionErrors.push(`Missing required field: "${field}"`);
    }
  }
  
  if (questionErrors.length > 0) {
    return { valid: false, errors: questionErrors, warnings: questionWarnings };
  }
  
  // Validate ID format
  if (typeof question.id !== 'string' || question.id.trim() === '') {
    questionErrors.push('Invalid or missing id (must be non-empty string)');
  }
  
  // Check for duplicate IDs
  if (stats.duplicateIds.has(question.id)) {
    questionErrors.push(`Duplicate ID: "${question.id}"`);
  } else {
    stats.duplicateIds.add(question.id);
  }
  
  // Validate topic
  if (!VALID_TOPICS.includes(question.topic)) {
    questionWarnings.push(`Unknown topic: "${question.topic}" (expected one of: ${VALID_TOPICS.join(', ')})`);
  }
  
  // Update topic stats
  stats.byTopic[question.topic] = (stats.byTopic[question.topic] || 0) + 1;
  
  // Validate difficulty if present
  if (question.difficulty && !['easy', 'medium', 'hard', 'exam'].includes(question.difficulty)) {
    questionWarnings.push(`Unknown difficulty: "${question.difficulty}"`);
  } else if (question.difficulty) {
    stats.byDifficulty[question.difficulty] = (stats.byDifficulty[question.difficulty] || 0) + 1;
  }
  
  // Validate options array
  if (!Array.isArray(question.options)) {
    questionErrors.push('Options must be an array');
  } else {
    if (question.options.length < 2) {
      questionErrors.push('Must have at least 2 options');
    }
    if (question.options.length > 10) {
      questionWarnings.push(`Unusually high number of options: ${question.options.length}`);
    }
    
    // Validate each option
    question.options.forEach((opt, optIndex) => {
      if (typeof opt !== 'string') {
        questionErrors.push(`Option ${optIndex} is not a string`);
      } else if (opt.length > MAX_OPTION_LENGTH) {
        questionWarnings.push(`Option ${optIndex} exceeds ${MAX_OPTION_LENGTH} characters (${opt.length})`);
      } else if (opt.trim() === '') {
        questionWarnings.push(`Option ${optIndex} is empty or whitespace only`);
      }
    });
  }
  
  // Validate answer index
  if (typeof question.answer !== 'number' || question.answer < 0) {
    questionErrors.push('Answer must be a non-negative number');
  } else if (Array.isArray(question.options) && question.answer >= question.options.length) {
    questionErrors.push(`Answer index (${question.answer}) exceeds options count (${question.options.length})`);
  }
  
  // Validate question text length
  if (typeof question.q !== 'string') {
    questionErrors.push('Question text (q) must be a string');
  } else if (question.q.length > MAX_QUESTION_LENGTH) {
    questionWarnings.push(`Question text exceeds ${MAX_QUESTION_LENGTH} characters (${question.q.length})`);
  } else if (question.q.trim().length < 10) {
    questionWarnings.push('Question text seems too short (< 10 characters)');
  }
  
  // Validate explanation if present
  if (question.explanation) {
    if (typeof question.explanation !== 'string') {
      questionErrors.push('Explanation must be a string');
    } else if (question.explanation.length > MAX_EXPLANATION_LENGTH) {
      questionWarnings.push(`Explanation exceeds ${MAX_EXPLANATION_LENGTH} characters (${question.explanation.length})`);
    }
  } else {
    stats.missingExplanation++;
  }
  
  // Validate usable flag
  if (question.usable === false) {
    stats.unusable++;
    if (!question.exclude_reason) {
      questionWarnings.push('Question marked as unusable but no exclude_reason provided');
    }
  }
  
  // Validate subtopics if present
  if (question.subtopics) {
    if (!Array.isArray(question.subtopics)) {
      questionErrors.push('Subtopics must be an array');
    } else {
      question.subtopics.forEach((st, i) => {
        if (typeof st !== 'string') {
          questionErrors.push(`Subtopic ${i} is not a string`);
        }
      });
    }
  }
  
  // Check for book_support (encouraged for quality)
  if (!question.book_support && question.usable !== false) {
    questionWarnings.push('Missing book_support reference (recommended for quality questions)');
  }
  
  return {
    valid: questionErrors.length === 0,
    errors: questionErrors,
    warnings: questionWarnings
  };
}

/**
 * Main validation function
 */
function validate(filePath = DEFAULT_QUESTIONS_PATH) {
  console.log('🔍 SDLE Question Bank Validator\n');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Parse questions
    const questions = parseQuestionsFile(filePath);
    stats.total = questions.length;
    
    console.log('\n🔎 Validating each question...\n');
    
    // Validate each question
    questions.forEach((question, index) => {
      const result = validateQuestion(question, index);
      
      if (!result.valid) {
        stats.errors++;
        errors.push({
          index,
          id: question.id || 'UNKNOWN',
          errors: result.errors
        });
      } else if (result.warnings.length > 0) {
        stats.warnings++;
        warnings.push({
          index,
          id: question.id,
          warnings: result.warnings
        });
      } else {
        stats.valid++;
      }
      
      // Progress indicator every 1000 questions
      if ((index + 1) % 1000 === 0) {
        process.stdout.write(`\rProcessed ${index + 1}/${questions.length} questions...`);
      }
    });
    
    console.log(`\r✓ Processed ${questions.length}/${questions.length} questions        \n`);
    
    // Print results
    printResults(startTime);
    
    // Exit with error code if there are critical errors
    if (errors.length > 0) {
      console.log('\n❌ Validation FAILED with', errors.length, 'critical error(s)');
      process.exit(1);
    } else {
      console.log('\n✅ Validation PASSED');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  }
}

/**
 * Print validation results
 */
function printResults(startTime) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('=' .repeat(60));
  console.log('📊 VALIDATION RESULTS');
  console.log('=' .repeat(60));
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📝 Total Questions: ${stats.total.toLocaleString()}`);
  console.log(`✅ Valid: ${stats.valid.toLocaleString()} (${((stats.valid / stats.total) * 100).toFixed(1)}%)`);
  console.log(`⚠️  With Warnings: ${stats.warnings.toLocaleString()}`);
  console.log(`❌ Invalid: ${stats.errors.toLocaleString()}`);
  console.log(`🚫 Unusable: ${stats.unusable.toLocaleString()}`);
  console.log(`📚 Missing Explanations: ${stats.missingExplanation.toLocaleString()}`);
  
  console.log('\n📈 BY TOPIC:');
  Object.entries(stats.byTopic)
    .sort((a, b) => b[1] - a[1])
    .forEach(([topic, count]) => {
      console.log(`  ${topic.padEnd(15)} ${count.toLocaleString().padStart(7)} (${((count / stats.total) * 100).toFixed(1)}%)`);
    });
  
  if (Object.keys(stats.byDifficulty).length > 0) {
    console.log('\n📈 BY DIFFICULTY:');
    Object.entries(stats.byDifficulty)
      .sort((a, b) => b[1] - a[1])
      .forEach(([diff, count]) => {
        console.log(`  ${diff.padEnd(15)} ${count.toLocaleString().padStart(7)}`);
      });
  }
  
  // Show sample warnings (first 10)
  if (warnings.length > 0) {
    console.log(`\n⚠️  SAMPLE WARNINGS (showing first 10 of ${warnings.length}):`);
    warnings.slice(0, 10).forEach(({ index, id, warnings: warns }) => {
      console.log(`  [${index}] ${id}:`);
      warns.forEach(w => console.log(`    - ${w}`));
    });
    if (warnings.length > 10) {
      console.log(`  ... and ${warnings.length - 10} more warnings`);
    }
  }
  
  // Show all errors (these are critical)
  if (errors.length > 0) {
    console.log(`\n❌ CRITICAL ERRORS (${errors.length} total):`);
    errors.slice(0, 20).forEach(({ index, id, errors: errs }) => {
      console.log(`  [${index}] ID: ${id}`);
      errs.forEach(e => console.log(`    ❌ ${e}`));
    });
    if (errors.length > 20) {
      console.log(`  ... and ${errors.length - 20} more errors (see full report)`);
    }
  }
  
  // Write detailed report to file
  const reportPath = path.join(__dirname, '..', 'validation_report.json');
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: stats.total,
      valid: stats.valid,
      warnings: stats.warnings,
      errors: stats.errors,
      unusable: stats.unusable,
      missingExplanation: stats.missingExplanation,
      byTopic: stats.byTopic,
      byDifficulty: stats.byDifficulty,
    },
    errors,
    warnings: warnings.slice(0, 100), // Limit warnings in report
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);
}

// Run validation
validate(process.argv[2]);
