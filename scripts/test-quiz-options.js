// Copy the functions from lib/utils.ts for testing
function parseQuizOptions(options) {
  if (!options) return [];
  
  // Ensure options is a string
  if (typeof options !== 'string') {
    console.warn("parseQuizOptions received non-string input:", options);
    return [];
  }
  
  // Remove any leading/trailing whitespace
  const trimmedOptions = options.trim();
  if (!trimmedOptions) return [];
  
  try {
    // First, try to parse as JSON
    const parsed = JSON.parse(trimmedOptions);
    
    // If it's already an array, return it
    if (Array.isArray(parsed)) {
      return parsed.filter(option => typeof option === 'string' && option.trim().length > 0);
    }
    
    // If it's a string that looks like an array, try to parse it
    if (typeof parsed === 'string') {
      try {
        const innerParsed = JSON.parse(parsed);
        if (Array.isArray(innerParsed)) {
          return innerParsed.filter(option => typeof option === 'string' && option.trim().length > 0);
        }
      } catch {
        // If inner parsing fails, treat as comma-separated
        // Remove brackets and quotes, then split by comma
        const cleaned = parsed.replace(/^\[|\]$/g, '').replace(/"/g, '');
        return cleaned.split(',').map(option => option.trim()).filter(option => option.length > 0);
      }
    }
    
    return [];
  } catch (jsonError) {
    // If JSON parsing fails, try to handle as comma-separated string
    try {
      // Remove any quotes and brackets that might be present
      const cleanedOptions = trimmedOptions
        .replace(/^\[|\]$/g, '') // Remove outer brackets
        .replace(/^"|"$/g, '') // Remove outer quotes
        .replace(/"/g, ''); // Remove all inner quotes
      
      // Split by comma and clean up each option
      const optionsArray = cleanedOptions
        .split(',')
        .map(option => option.trim())
        .filter(option => option.length > 0);
      
      return optionsArray;
    } catch (splitError) {
      console.error("Error parsing quiz options:", { original: options, jsonError, splitError });
      return [];
    }
  }
}

function stringifyQuizOptions(options) {
  if (!options || !Array.isArray(options) || options.length === 0) {
    return null;
  }
  
  // Filter out empty options and trim whitespace
  const cleanOptions = options
    .filter(option => typeof option === 'string' && option.trim().length > 0)
    .map(option => option.trim());
  
  if (cleanOptions.length === 0) {
    return null;
  }
  
  return JSON.stringify(cleanOptions);
}

function validateQuizOptions(options) {
  if (!Array.isArray(options)) {
    return { isValid: false, error: "Options must be an array" };
  }
  
  if (options.length === 0) {
    return { isValid: false, error: "At least one option is required" };
  }
  
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    if (typeof option !== 'string') {
      return { isValid: false, error: `Option ${i + 1} must be a string` };
    }
    
    if (option.trim().length === 0) {
      return { isValid: false, error: `Option ${i + 1} cannot be empty` };
    }
    
    if (option.length > 500) {
      return { isValid: false, error: `Option ${i + 1} is too long (max 500 characters)` };
    }
  }
  
  return { isValid: true };
}

// Test cases for quiz options
const testCases = [
  // Valid JSON arrays
  {
    input: '["خيار 1", "خيار 2", "خيار 3"]',
    expected: ["خيار 1", "خيار 2", "خيار 3"],
    description: "Valid JSON array"
  },
  {
    input: '["Option A", "Option B"]',
    expected: ["Option A", "Option B"],
    description: "Valid JSON array with English options"
  },
  
  // Comma-separated strings
  {
    input: "خيار 1, خيار 2, خيار 3",
    expected: ["خيار 1", "خيار 2", "خيار 3"],
    description: "Comma-separated string"
  },
  {
    input: "Option A, Option B, Option C",
    expected: ["Option A", "Option B", "Option C"],
    description: "Comma-separated string with English options"
  },
  
  // Malformed JSON
  {
    input: '["خيار 1", "خيار 2", "خيار 3"',
    expected: ["خيار 1", "خيار 2", "خيار 3"],
    description: "Malformed JSON (missing closing bracket)"
  },
  {
    input: '["خيار 1", "خيار 2", "خيار 3",]',
    expected: ["خيار 1", "خيار 2", "خيار 3"],
    description: "Malformed JSON (trailing comma)"
  },
  
  // String that looks like JSON
  {
    input: '"["خيار 1", "خيار 2", "خيار 3"]"',
    expected: ["خيار 1", "خيار 2", "خيار 3"],
    description: "String containing JSON array"
  },
  
  // Edge cases
  {
    input: null,
    expected: [],
    description: "Null input"
  },
  {
    input: "",
    expected: [],
    description: "Empty string"
  },
  {
    input: "   ",
    expected: [],
    description: "Whitespace only"
  },
  {
    input: "خيار 1, , خيار 3",
    expected: ["خيار 1", "خيار 3"],
    description: "Comma-separated with empty option"
  },
  {
    input: '["خيار 1", "", "خيار 3"]',
    expected: ["خيار 1", "خيار 3"],
    description: "JSON array with empty option"
  },
  // Test for non-string input (the bug we just fixed)
  {
    input: ["خيار 1", "خيار 2"],
    expected: [],
    description: "Array input (should return empty array)"
  }
];

// Test stringifyQuizOptions function
const stringifyTestCases = [
  {
    input: ["خيار 1", "خيار 2", "خيار 3"],
    expected: '["خيار 1","خيار 2","خيار 3"]',
    description: "Valid array"
  },
  {
    input: ["Option A", "Option B"],
    expected: '["Option A","Option B"]',
    description: "Valid array with English options"
  },
  {
    input: [],
    expected: null,
    description: "Empty array"
  },
  {
    input: ["", "خيار 2", ""],
    expected: '["خيار 2"]',
    description: "Array with empty options"
  },
  {
    input: null,
    expected: null,
    description: "Null input"
  }
];

// Test validateQuizOptions function
const validationTestCases = [
  {
    input: ["خيار 1", "خيار 2", "خيار 3"],
    expected: { isValid: true },
    description: "Valid options"
  },
  {
    input: [],
    expected: { isValid: false, error: "At least one option is required" },
    description: "Empty array"
  },
  {
    input: ["", "خيار 2"],
    expected: { isValid: false, error: "Option 1 cannot be empty" },
    description: "Array with empty option"
  },
  {
    input: ["خيار 1", 123],
    expected: { isValid: false, error: "Option 2 must be a string" },
    description: "Array with non-string option"
  }
];

function runTests() {
  console.log("🧪 Testing Quiz Options Functions\n");
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test parseQuizOptions
  console.log("📋 Testing parseQuizOptions function:");
  testCases.forEach((testCase, index) => {
    totalTests++;
    const result = parseQuizOptions(testCase.input);
    const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
    
    console.log(`  ${passed ? '✅' : '❌'} Test ${index + 1}: ${testCase.description}`);
    if (!passed) {
      console.log(`    Expected: ${JSON.stringify(testCase.expected)}`);
      console.log(`    Got: ${JSON.stringify(result)}`);
    }
    
    if (passed) passedTests++;
  });
  
  console.log();
  
  // Test stringifyQuizOptions
  console.log("📋 Testing stringifyQuizOptions function:");
  stringifyTestCases.forEach((testCase, index) => {
    totalTests++;
    const result = stringifyQuizOptions(testCase.input);
    const passed = result === testCase.expected;
    
    console.log(`  ${passed ? '✅' : '❌'} Test ${index + 1}: ${testCase.description}`);
    if (!passed) {
      console.log(`    Expected: ${testCase.expected}`);
      console.log(`    Got: ${result}`);
    }
    
    if (passed) passedTests++;
  });
  
  console.log();
  
  // Test validateQuizOptions
  console.log("📋 Testing validateQuizOptions function:");
  validationTestCases.forEach((testCase, index) => {
    totalTests++;
    const result = validateQuizOptions(testCase.input);
    const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
    
    console.log(`  ${passed ? '✅' : '❌'} Test ${index + 1}: ${testCase.description}`);
    if (!passed) {
      console.log(`    Expected: ${JSON.stringify(testCase.expected)}`);
      console.log(`    Got: ${JSON.stringify(result)}`);
    }
    
    if (passed) passedTests++;
  });
  
  console.log();
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log("🎉 All tests passed! The quiz options system is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Please check the implementation.");
  }
}

// Run the tests
runTests(); 