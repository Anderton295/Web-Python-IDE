import type { languages } from 'monaco-editor';

// Python built-ins, turtle commands, keywords and snippets
export function registerPythonAutocomplete(monaco: any): void {
  if (!monaco || !monaco.languages) return;

  // Check if already registered
  if ((window as any).__python_autocomplete_registered) return;
  (window as any).__python_autocomplete_registered = true;

  monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: languages.CompletionItem[] = [];

      // 1. Python Keywords
      const keywords = [
        { label: 'def', insertText: 'def ${1:function_name}(${2:params}):\n\t${0}', doc: 'Define a function' },
        { label: 'class', insertText: 'class ${1:ClassName}:\n\tdef __init__(self${2:, args}):\n\t\t${0}', doc: 'Define a class' },
        { label: 'import', insertText: 'import ${1:module}', doc: 'Import a module' },
        { label: 'from', insertText: 'from ${1:module} import ${2:name}', doc: 'Import specific names from module' },
        { label: 'if', insertText: 'if ${1:condition}:\n\t${0}', doc: 'If condition statement' },
        { label: 'elif', insertText: 'elif ${1:condition}:\n\t${0}', doc: 'Else-if condition statement' },
        { label: 'else', insertText: 'else:\n\t${0}', doc: 'Else condition statement' },
        { label: 'for', insertText: 'for ${1:item} in ${2:iterable}:\n\t${0}', doc: 'For loop statement' },
        { label: 'while', insertText: 'while ${1:condition}:\n\t${0}', doc: 'While loop statement' },
        { label: 'return', insertText: 'return ${0}', doc: 'Return value from function' },
        { label: 'try', insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${0}', doc: 'Try-except block' },
        { label: 'with', insertText: 'with open("${1:file.txt}", "${2:r}") as ${3:f}:\n\t${0}', doc: 'Context manager' },
        { label: 'lambda', insertText: 'lambda ${1:x}: ${0}', doc: 'Anonymous lambda function' },
        { label: 'True', insertText: 'True', doc: 'Boolean True' },
        { label: 'False', insertText: 'False', doc: 'Boolean False' },
        { label: 'None', insertText: 'None', doc: 'None value' },
        { label: 'pass', insertText: 'pass', doc: 'No-op statement' },
        { label: 'break', insertText: 'break', doc: 'Break out of current loop' },
        { label: 'continue', insertText: 'continue', doc: 'Continue to next loop iteration' },
      ];

      keywords.forEach(kw => {
        suggestions.push({
          label: kw.label,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: kw.doc,
          range,
        });
      });

      // 2. Python Built-in functions
      const builtins = [
        { label: 'print', insertText: 'print(${1:value})', doc: 'print(*objects, sep=" ", end="\\n")\nPrint objects to the console' },
        { label: 'input', insertText: 'input("${1:Enter prompt: }")', doc: 'input([prompt]) -> str\nRead a string from console input' },
        { label: 'range', insertText: 'range(${1:stop})', doc: 'range(stop) or range(start, stop[, step])\nReturn a sequence of numbers' },
        { label: 'len', insertText: 'len(${1:obj})', doc: 'len(s) -> int\nReturn number of items in container' },
        { label: 'int', insertText: 'int(${1:x})', doc: 'Convert number or string to integer' },
        { label: 'float', insertText: 'float(${1:x})', doc: 'Convert number or string to float' },
        { label: 'str', insertText: 'str(${1:x})', doc: 'Convert object to string representation' },
        { label: 'list', insertText: 'list(${1:iterable})', doc: 'Create a list or convert iterable to list' },
        { label: 'dict', insertText: 'dict(${1})', doc: 'Create a dictionary object' },
        { label: 'set', insertText: 'set(${1:iterable})', doc: 'Create an unordered set of unique elements' },
        { label: 'enumerate', insertText: 'enumerate(${1:iterable})', doc: 'enumerate(iterable, start=0)\nReturn index and item pairs' },
        { label: 'zip', insertText: 'zip(${1:iter1}, ${2:iter2})', doc: 'Combine elements from multiple iterables' },
        { label: 'sum', insertText: 'sum(${1:iterable})', doc: 'Return sum of elements in iterable' },
        { label: 'min', insertText: 'min(${1:iterable})', doc: 'Return smallest element' },
        { label: 'max', insertText: 'max(${1:iterable})', doc: 'Return largest element' },
        { label: 'abs', insertText: 'abs(${1:x})', doc: 'Return absolute value of a number' },
        { label: 'round', insertText: 'round(${1:number}, ${2:2})', doc: 'Round a number to specified decimals' },
        { label: 'sorted', insertText: 'sorted(${1:iterable})', doc: 'Return a new sorted list from iterable' },
        { label: 'type', insertText: 'type(${1:obj})', doc: 'Return object\'s type' },
      ];

      builtins.forEach(b => {
        suggestions.push({
          label: b.label,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: b.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: b.doc,
          range,
        });
      });

      // 3. Turtle Graphics Module functions & methods
      const turtleMethods = [
        { label: 'turtle.forward', insertText: 'forward(${1:100})', doc: 't.forward(distance) or turtle.forward(100)\nMove turtle forward by distance units' },
        { label: 'turtle.backward', insertText: 'backward(${1:50})', doc: 't.backward(distance)\nMove turtle backward by distance units' },
        { label: 'turtle.left', insertText: 'left(${1:90})', doc: 't.left(angle)\nTurn turtle counter-clockwise by angle degrees' },
        { label: 'turtle.right', insertText: 'right(${1:90})', doc: 't.right(angle)\nTurn turtle clockwise by angle degrees' },
        { label: 'turtle.goto', insertText: 'goto(${1:0}, ${2:0})', doc: 't.goto(x, y)\nMove turtle to absolute position (x, y)' },
        { label: 'turtle.penup', insertText: 'penup()', doc: 't.penup()\nLift pen up so turtle moves without drawing' },
        { label: 'turtle.pendown', insertText: 'pendown()', doc: 't.pendown()\nLower pen down so turtle draws when moving' },
        { label: 'turtle.pensize', insertText: 'pensize(${1:2})', doc: 't.pensize(width)\nSet drawing line thickness' },
        { label: 'turtle.pencolor', insertText: 'pencolor("${1:#38bdf8}")', doc: 't.pencolor(color)\nSet pen color (name like "red" or hex "#38bdf8")' },
        { label: 'turtle.fillcolor', insertText: 'fillcolor("${1:#f43f5e}")', doc: 't.fillcolor(color)\nSet interior fill color' },
        { label: 'turtle.color', insertText: 'color("${1:pen_color}", "${2:fill_color}")', doc: 't.color(pencolor, fillcolor)\nSet both pen and fill colors' },
        { label: 'turtle.begin_fill', insertText: 'begin_fill()', doc: 't.begin_fill()\nCall just before starting shape to fill' },
        { label: 'turtle.end_fill', insertText: 'end_fill()', doc: 't.end_fill()\nFill shape drawn since begin_fill()' },
        { label: 'turtle.circle', insertText: 'circle(${1:50})', doc: 't.circle(radius, extent=None)\nDraw a circle with given radius' },
        { label: 'turtle.dot', insertText: 'dot(${1:20}, "${2:red}")', doc: 't.dot(size, color)\nDraw a circular filled dot' },
        { label: 'turtle.speed', insertText: 'speed(${1:0})', doc: 't.speed(speed)\n0: fastest (no animation), 1: slowest, 10: fast' },
        { label: 'turtle.bgcolor', insertText: 'bgcolor("${1:#0f172a}")', doc: 'turtle.bgcolor(color)\nSet canvas background color' },
        { label: 'turtle.hideturtle', insertText: 'hideturtle()', doc: 't.hideturtle()\nHide the turtle arrowhead cursor' },
        { label: 'turtle.showturtle', insertText: 'showturtle()', doc: 't.showturtle()\nShow the turtle arrowhead cursor' },
        { label: 'turtle.clear', insertText: 'clear()', doc: 't.clear()\nClear turtle drawings from canvas' },
        { label: 'turtle.reset', insertText: 'reset()', doc: 't.reset()\nClear drawings and reset turtle to center' },
        { label: 'turtle.done', insertText: 'turtle.done()', doc: 'turtle.done()\nFinalize turtle drawing window' },
        { label: 'turtle.shape', insertText: 'shape("${1|turtle,arrow,circle,square,triangle,classic|}")', doc: 't.shape(name)\nSet turtle cursor shape' },
        { label: 'turtle.stamp', insertText: 'stamp()', doc: 't.stamp()\nStamp copy of turtle cursor shape onto canvas' },
      ];

      turtleMethods.forEach(t => {
        suggestions.push({
          label: t.label,
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: t.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: t.doc,
          range,
        });

        // Also add short form (e.g. forward, left, right, penup, pendown)
        const shortName = t.label.replace('turtle.', '');
        suggestions.push({
          label: shortName,
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: t.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: `[Turtle] ${t.doc}`,
          range,
        });
      });

      // 4. Code Snippets
      suggestions.push({
        label: 'snippet:turtle_setup',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: [
          'import turtle',
          '',
          't = turtle.Turtle()',
          't.speed(0)',
          'turtle.bgcolor("${1:#0f172a}")',
          't.color("${2:#38bdf8}")',
          't.pensize(${3:2})',
          '',
          '# Drawing commands here',
          '${0}',
          '',
          'turtle.done()',
        ].join('\n'),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Complete boilerplate for a Turtle Graphics script',
        range,
      });

      suggestions.push({
        label: 'snippet:turtle_star',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: [
          'for i in range(${1:5}):',
          '\tt.forward(${2:100})',
          '\tt.right(${3:144})',
        ].join('\n'),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Draw a 5-pointed star with Turtle',
        range,
      });

      suggestions.push({
        label: 'snippet:for_range',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'for ${1:i} in range(${2:10}):\n\t${0:print(i)}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Loop over a numerical range',
        range,
      });

      return { suggestions };
    },
  });
}
