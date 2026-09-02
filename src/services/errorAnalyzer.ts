import { ErrorInfo } from '../types';

export function analyzePythonError(rawError: string, fullCode: string): ErrorInfo {
  const lines = fullCode.split('\n');
  const errStr = String(rawError || '');

  // Extract line number
  // Formats:
  // "ParseError: bad input on line 3"
  // "SyntaxError: invalid syntax on line 4"
  // "NameError: name 'pirnt' is not defined on line 2"
  // "at <stdin>:3:5"
  // "on line 3"
  let lineNumber: number | undefined;
  let columnNumber: number | undefined;

  const lineMatch = errStr.match(/on line (\d+)/i) || 
                    errStr.match(/:(\d+):(\d+)/) || 
                    errStr.match(/line (\d+)/i);

  if (lineMatch) {
    lineNumber = parseInt(lineMatch[1], 10);
    if (lineMatch[2]) {
      columnNumber = parseInt(lineMatch[2], 10);
    }
  }

  // Extract error class/type
  let errorType = 'RuntimeError';
  const typeMatch = errStr.match(/^([A-Za-z0-9_]+Error|ParseError|SyntaxError|TokenError)/i);
  if (typeMatch) {
    errorType = typeMatch[1];
  } else if (errStr.includes('SyntaxError') || errStr.includes('ParseError')) {
    errorType = 'SyntaxError';
  } else if (errStr.includes('IndentationError')) {
    errorType = 'IndentationError';
  } else if (errStr.includes('NameError')) {
    errorType = 'NameError';
  } else if (errStr.includes('ZeroDivisionError')) {
    errorType = 'ZeroDivisionError';
  } else if (errStr.includes('TypeError')) {
    errorType = 'TypeError';
  }

  // Get the offending line content
  let targetCodeLine = '';
  if (lineNumber && lineNumber >= 1 && lineNumber <= lines.length) {
    targetCodeLine = lines[lineNumber - 1];
  }

  let explanation = 'An error occurred during Python code execution.';
  const suggestions: string[] = [];
  let autoFix: ErrorInfo['autoFix'] = undefined;

  const trimmedLine = targetCodeLine.trim();

  // 1. Check for missing colon on control structures or definitions
  const colonKeywords = ['if', 'elif', 'else', 'for', 'while', 'def', 'class', 'try', 'except', 'finally', 'with'];
  const startsWithColonKw = colonKeywords.some(kw => {
    return trimmedLine.startsWith(kw + ' ') || trimmedLine === kw || trimmedLine.startsWith(kw + ':');
  });

  if ((errorType === 'SyntaxError' || errorType === 'ParseError') && startsWithColonKw && !trimmedLine.endsWith(':')) {
    explanation = `Missing colon ':' at the end of '${trimmedLine.split(' ')[0]}' statement.`;
    suggestions.push(`Python requires a colon (:) at the end of compound statements like 'if', 'for', 'while', and 'def'.`);
    suggestions.push(`Add a ':' character to line ${lineNumber}.`);

    if (lineNumber) {
      const fixedLines = [...lines];
      fixedLines[lineNumber - 1] = targetCodeLine + ':';
      autoFix = {
        label: 'Add missing colon (:)',
        newCode: fixedLines.join('\n'),
        targetLine: lineNumber,
        description: `Append ':' to line ${lineNumber}: "${trimmedLine}:"`,
      };
    }
  }
  // 2. Check for single '=' in comparison (e.g. if x = 5:)
  else if ((errorType === 'SyntaxError' || errorType === 'ParseError') && /^\s*(if|elif|while)\s+.+=[^=].*:?$/.test(targetCodeLine)) {
    explanation = "Invalid assignment '=' used inside conditional expression.";
    suggestions.push("In Python, '=' is used for assigning variables, while '==' is used for comparing equality.");
    suggestions.push("Change the '=' operator to '==' to compare values.");

    if (lineNumber) {
      const fixedLine = targetCodeLine.replace(/([^=!<>]|^)=([^=]|$)/, '$1==$2');
      const fixedLines = [...lines];
      fixedLines[lineNumber - 1] = fixedLine;
      autoFix = {
        label: "Change '=' to '=='",
        newCode: fixedLines.join('\n'),
        targetLine: lineNumber,
        description: `Replace single '=' with comparison '==' on line ${lineNumber}`,
      };
    }
  }
  // 3. NameError with common typos
  else if (errorType === 'NameError') {
    const nameMatch = errStr.match(/name '([^']+)' is not defined/i) || errStr.match(/'([^']+)'/);
    const varName = nameMatch ? nameMatch[1] : '';

    const commonTypos: Record<string, string> = {
      pirnt: 'print',
      pritn: 'print',
      prnt: 'print',
      ptint: 'print',
      inputt: 'input',
      inpt: 'input',
      turetl: 'turtle',
      tutle: 'turtle',
      turtel: 'turtle',
      trutle: 'turtle',
      ragne: 'range',
      raneg: 'range',
      lenght: 'len',
      strng: 'str',
      flot: 'float',
      foreward: 'forward',
      bakward: 'backward',
    };

    if (varName === 'turtle' && !fullCode.includes('import turtle')) {
      explanation = "Turtle module is used but not imported.";
      suggestions.push("Add 'import turtle' at the top of your Python file.");
      autoFix = {
        label: "Add 'import turtle'",
        newCode: 'import turtle\n' + fullCode,
        targetLine: 1,
        description: "Insert 'import turtle' at the very beginning of the file",
      };
    } else if (varName && commonTypos[varName.toLowerCase()]) {
      const correction = commonTypos[varName.toLowerCase()];
      explanation = `Unknown identifier '${varName}'. Did you mean '${correction}'?`;
      suggestions.push(`Spelling mistake detected: replace '${varName}' with '${correction}'.`);
      suggestions.push(`Make sure all functions and variable names are spelled correctly.`);

      if (lineNumber && targetCodeLine.includes(varName)) {
        const fixedLine = targetCodeLine.replace(new RegExp(`\\b${varName}\\b`, 'g'), correction);
        const fixedLines = [...lines];
        fixedLines[lineNumber - 1] = fixedLine;
        autoFix = {
          label: `Replace '${varName}' with '${correction}'`,
          newCode: fixedLines.join('\n'),
          targetLine: lineNumber,
          description: `Fix typo '${varName}' -> '${correction}' on line ${lineNumber}`,
        };
      }
    } else if (varName) {
      explanation = `The name '${varName}' is not defined in this scope.`;
      suggestions.push(`Check if '${varName}' was created or assigned before line ${lineNumber || 'this'}.`);
      suggestions.push(`Verify correct capitalization (Python is case-sensitive: 'MyVar' is different from 'myvar').`);
      suggestions.push(`If '${varName}' is from a module, make sure you imported it first.`);
    }
  }
  // 4. IndentationError
  else if (errorType === 'IndentationError') {
    if (errStr.includes('expected an indented block')) {
      explanation = `Expected an indented code block after line ${(lineNumber ? lineNumber - 1 : 'previous')}.`;
      suggestions.push(`In Python, lines following 'def', 'if', 'for', 'while', etc. must be indented.`);
      suggestions.push(`Indent this line by adding 4 spaces or pressing Tab.`);

      if (lineNumber) {
        const fixedLines = [...lines];
        fixedLines[lineNumber - 1] = '    ' + targetCodeLine;
        autoFix = {
          label: 'Indent line with 4 spaces',
          newCode: fixedLines.join('\n'),
          targetLine: lineNumber,
          description: `Add standard 4-space indentation to line ${lineNumber}`,
        };
      }
    } else {
      explanation = "Inconsistent indentation detected.";
      suggestions.push("Check for mixed tabs and spaces or misaligned indentation levels.");
      suggestions.push("Standard Python indentation uses exactly 4 spaces per block level.");
    }
  }
  // 5. ZeroDivisionError
  else if (errorType === 'ZeroDivisionError') {
    explanation = "Math Error: Attempted to divide or calculate modulo by zero (0).";
    suggestions.push("Division by zero is undefined in mathematics and raises an error in Python.");
    suggestions.push("Verify variables in division denominators to ensure they are never equal to 0.");
    suggestions.push("Add a guard check: `if denominator != 0: result = numerator / denominator`.");
  }
  // 6. TypeError
  else if (errorType === 'TypeError') {
    if (errStr.includes('unsupported operand type') || errStr.includes('can only concatenate')) {
      explanation = "Cannot perform operation between incompatible data types.";
      suggestions.push("You may be trying to concatenate a string and a number (e.g. 'Age: ' + 25).");
      suggestions.push("Use `str(number)` to convert numbers to strings, or use f-strings: `f'Age: {number}'`.");
    } else if (errStr.includes('takes') && errStr.includes('positional arguments')) {
      explanation = "Wrong number of arguments passed to function.";
      suggestions.push("Check the function definition to see how many parameters it requires.");
    } else {
      explanation = "Type error: Incompatible types or invalid operation for this data type.";
      suggestions.push("Check that the variables passed have the expected types (int, str, list, etc.).");
    }
  }
  // 7. Generic SyntaxError
  else if (errorType === 'SyntaxError' || errorType === 'ParseError') {
    // Check unmatched parentheses
    const openParens = (targetCodeLine.match(/\(/g) || []).length;
    const closeParens = (targetCodeLine.match(/\)/g) || []).length;
    const openBrackets = (targetCodeLine.match(/\[/g) || []).length;
    const closeBrackets = (targetCodeLine.match(/\]/g) || []).length;

    if (openParens > closeParens) {
      explanation = "Unclosed parenthesis '(' on this line.";
      suggestions.push(`Line has ${openParens} opening '(' but only ${closeParens} closing ')'.`);
      suggestions.push("Add the matching closing parenthesis ')' at the end of the statement.");
      if (lineNumber) {
        const fixedLines = [...lines];
        fixedLines[lineNumber - 1] = targetCodeLine + ')';
        autoFix = {
          label: "Add closing ')'",
          newCode: fixedLines.join('\n'),
          targetLine: lineNumber,
          description: `Append missing ')' to line ${lineNumber}`,
        };
      }
    } else if (openBrackets > closeBrackets) {
      explanation = "Unclosed square bracket '[' on this line.";
      suggestions.push("Ensure every opening bracket '[' is paired with a closing bracket ']'.");
    } else if (errStr.includes('EOL while scanning string literal')) {
      explanation = "Unterminated string literal (missing quotation mark).";
      suggestions.push("A string was opened with ' or \" but was not closed before the end of the line.");
      suggestions.push("Add the matching closing quotation mark.");
    } else {
      explanation = "Invalid Python syntax detected on this line.";
      suggestions.push("Review line syntax carefully. Look for missing commas, mismatched symbols, or keywords out of place.");
      suggestions.push("Check Python documentation or starter examples for reference.");
    }
  }
  // 8. AttributeError
  else if (errorType === 'AttributeError') {
    explanation = "Object has no such method or property.";
    suggestions.push("Verify the spelling of the method you are calling.");
    if (trimmedLine.includes('turtle.') || trimmedLine.startsWith('t.')) {
      suggestions.push("Common turtle methods: .forward(x), .backward(x), .left(deg), .right(deg), .penup(), .pendown(), .circle(r), .color(c).");
    }
  }

  return {
    rawMessage: errStr,
    errorType,
    line: lineNumber,
    column: columnNumber,
    codeLine: targetCodeLine || undefined,
    explanation,
    suggestions,
    autoFix,
  };
}
