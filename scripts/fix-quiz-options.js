const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Safely parses quiz options from JSON string or comma-separated string
 */
function parseQuizOptions(options) {
  if (!options) return [];
  
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
      const innerParsed = JSON.parse(parsed);
      if (Array.isArray(innerParsed)) {
        return innerParsed.filter(option => typeof option === 'string' && option.trim().length > 0);
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

/**
 * Safely stringifies quiz options for storage
 */
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

async function fixQuizOptions() {
  try {
    console.log('Starting quiz options cleanup...');

    // Get all questions with options
    const questions = await prisma.question.findMany({
      where: {
        options: {
          not: null
        }
      },
      select: {
        id: true,
        options: true,
        type: true,
        text: true
      }
    });

    console.log(`Found ${questions.length} questions with options`);

    let fixedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const question of questions) {
      try {
        // Parse the current options
        const currentOptions = parseQuizOptions(question.options);
        
        // Check if the options need fixing
        let needsFix = false;
        let fixedOptions = [];
        
        // Check for various problematic patterns
        if (question.options) {
          const lowerOptions = question.options.toLowerCase();
          
          // Check for inappropriate content
          if (lowerOptions.includes('sex') || lowerOptions.includes('dick') || 
              lowerOptions.includes('pussy') || lowerOptions.includes('ass')) {
            console.log(`Found inappropriate content in question ${question.id}: "${question.options}"`);
            needsFix = true;
            fixedOptions = currentOptions.filter(option => {
              const lowerOption = option.toLowerCase();
              return !lowerOption.includes('sex') && !lowerOption.includes('dick') && 
                     !lowerOption.includes('pussy') && !lowerOption.includes('ass');
            });
          }
          
          // Check for malformed JSON or string formats
          if (!needsFix) {
            const originalString = question.options;
            const parsedOptions = parseQuizOptions(originalString);
            const reStringified = stringifyQuizOptions(parsedOptions);
            
            // If the re-stringified version doesn't match the original, it needs fixing
            if (reStringified !== originalString) {
              needsFix = true;
              fixedOptions = parsedOptions;
              console.log(`Fixing malformed options for question ${question.id}: "${originalString}" -> [${fixedOptions.join(', ')}]`);
            }
          }
        }
        
        // Check if options are empty after cleaning
        if (needsFix && fixedOptions.length === 0) {
          console.log(`Warning: Question ${question.id} has no valid options after cleaning`);
          // For multiple choice questions, we need at least one option
          if (question.type === "MULTIPLE_CHOICE") {
            fixedOptions = ["خيار 1", "خيار 2", "خيار 3", "خيار 4"];
            console.log(`Added default options for question ${question.id}`);
          }
        }
        
        if (needsFix) {
          // Update the question with properly formatted JSON
          await prisma.question.update({
            where: { id: question.id },
            data: { 
              options: stringifyQuizOptions(fixedOptions)
            }
          });
          
          fixedCount++;
          console.log(`Fixed question ${question.id}: "${question.text.substring(0, 50)}..."`);
        } else {
          skippedCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`Error processing question ${question.id}:`, error);
      }
    }

    console.log(`\nCleanup Summary:`);
    console.log(`- Fixed: ${fixedCount} questions`);
    console.log(`- Skipped: ${skippedCount} questions (already correct)`);
    console.log(`- Errors: ${errorCount} questions`);
    console.log(`- Total processed: ${questions.length} questions`);

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixQuizOptions()
  .then(() => {
    console.log('Cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }); 