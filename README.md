# UserVars

UserVars is a Typescript library made to let end users create variables and use them wherever they're supported by the application. It includes dependency chains, decision trees, and mathematical expressions. All input and storage is valid JSON, removing the need for custom serialization logic.

---

## Installation

```bash
$ npm install uservars
```

---

## Usage

Examples can be found in [this file](./examples.ts).

- Examples for literal variables start from the top.
- Examples for references start with `basicLiteral`.
- Examples for scopes start with `basicScoped`.

To begin using the library, you must first import it, and then create a new `UserVars` object to interact with it.

```ts
import { UserVars } from "uservars";

const userVars = new UserVars();
```

After that, you can start adding variables. This is done with the `UserVars.setVar` function. It requires input conforming to one of the four variable types shown [here](#variable-types). In many cases (anywhere `Reference` is listed as a possible type), string literals can be replaced by [References](#reference) to other variables. This library also has scopes. These let you separate variables, so you can reuse names and do other scope magic. To go back up to global from a scoped variable, add `../` to the start of the path.

---

## Variable Types

All variable types included in this library have four common fields:

- `name` The last part of the path used to reference the variable. Must match the Regex pattern `/^[A‑Z\d_]+$/i`
- `scope` The top level name of the variable. If "global", it can be omitted from the path anywhere the variable is referred to. Must match the Regex pattern `/^[A‑Z\d_]+$/i`
- `value` The value stored in the variable. Depending on which type of variable it is, this will have a different required structure.
- `varType` This is used internally to tell what kind of variable is being evaluated. If it doesn't match the actual structure a `TypeError` will be thrown.

### Basic

- `value` Either the literal value of the variable, or a [Reference](#reference) object pointing to another variable relative to `scope`.

```ts
{
    "name": string,
    "scope": string,
    "value": string | Reference,
    "varType": "basic"
}
```

### List

- `value` An array of either strings or [References](#reference). The variable evaluates to the whole list, with references being resolved to their end values. This is flattened at the end of resolution to allow combining lists.

```ts
{
    "name": string,
    "scope": string,
    "value": Array<string | Reference>,
    "varType": "list"
}
```

### Table

Table variables were once called `parameterized variables`, which might help you understand what they do. When they are evaluated, the items in `value` are each evaluated in order from first to last (if `priority` is `"first"`) or last to first (if `priority` is `"last"`). Whichever TableRow outputs its value first is output for the full table. If none are output, `default` is output instead.

- `value` An array of [TableRows](#tablerow). The output value of either the first or last row where all conditions pass is output for the whole variable, or `default` if none pass.
- `default` The default value to output if no rows are output, or a [Reference](#reference) to it.
- `priority` `"first"` to output the first passing row, or `"last"` to output the last one.

```ts
{
    "name": string,
    "scope": string,
    "value": Array<TableRow>,
    "varType": "table"
    "default": string | Reference,
    "priority": "first" | "last",
}
```

### Expression

Expressions execute `value` using functions from `functions` and variables from `vars`. https://github.com/silentmatt/expr-eval is used to safely perform the math.

- `functions` [OPTIONAL] Each item of this array is prepended to `value` in order, so the functions can be used in the expression. Referenced lists of functions are flattened. These should be formatted like `name(x) = x + 2`.
- `value` Either a string, which will be used literally, or a [Reference](#reference) which will be resolved first. This is what is actually executed.
- `vars` A mapping of variable names used in `value` to either strings or [References](#reference). The resolved values of these are used to replace variables with the same names in `value`.

```ts
{
    "name": string,
    "scope": string,
    "value": string | Reference,
    "vars": {[name: string]: string | Reference},
    "functions"?: Array<string | Reference>
}
```

---

## Auxiliary Types

### Reference

References are used wherever you want to refer to another variable from within a variable. They can be used pretty much anywhere a string is accepted in `value` and related fields.

- `value` The path to the referenced variable, relative to the scope of the variable it's a part of.
- `reference` Just needs to be truthy to distinguish it from invalid data.

```ts
{
    "value": string,
    "reference": true
}
```

### TableRow

TableRows are used exclusively in the `value` field of Tables, which is an array of them. They are evaluated with the table, and are only output if all of their conditions pass.

- `conditions` An array of conditions that must pass in order for the row to output its value.
- `output` The value or reference to the variable containing the value that should be output if all conditions pass.

```ts
{
    "conditions": Array<Condition>,
    "output": string | Reference
}
```

### Condition

Conditions are used to decide which TableRow's value gets output from a Table.

- `val1` The first operand to be compared with `val2`.
- `comparison` The comparison type to be made. Depending on what this is set to, `val1` and `val2` may be altered to fit the comparison.
  - `eq` No conversions, uses strict equality (===), with shallow comparisons for Lists.
  - `lt/gt` Converts strings to floats and Lists to numbers representing their length.
  - `in` Checks if `var1` is contained within `var2`. `var2` must be a List, and if `var1` is a list it checks for full intersection of `var1` into `var2`.
- `val2` The second operand to be compared with `val1`.

```ts
{
    "val1": string | Reference,
    "comparison": "eq" | "lt" | "gt" | "in",
    "val2": string | Reference
}
```

### TableData

Full data of a Table, including all Conditions and outputs, and their paths.

- `output` The final output value.
- `outputPath` The path `output` came from, or an empty string if none.
- `outIndex` The row of `value` that output the final value, or -1 for default.
- `value` An array of [TableRowData](#tablerowdata).
- `default` The default value that would be output if nothing else was.
- `defaultPath` The path `default` came from, or an empty string if none.
- `priority` Either `"first"` or `"last"`, just for convenience.

```ts
{
	"output": Literal,
	"outputPath": string,
	"outIndex": number,
	"value": Array<TableRowData>,
	"default": Literal,
	"defaultPath": string,
	"priority": string
}
```

### TableRowData

Full data of a TableRow, including all conditions and outputs, and their paths.

- `conditions` Array of [ConditionData](#conditiondata) that was evaluated to see if this row should be output.
- `output` The resolved value of the output field of the matching [TableRow](#tablerow).
- `outputPath` The path `output` came from, or an empty string if none.

```ts
{
	"conditions": Array<ConditionData>,
	"output": Literal,
	"outputPath": string
}
```

### ConditionData

Full data of a Condition, including paths.

- `val1` The resolved value of `val1` from the matching [Condition](#condition).
- `val1Path` The path `val1` came from, or an empty string if none.
- `comparison` Either `"eq"`, `"lt"`, `"gt"`, or `"in"`.
- `val2` The resolved value of `val2` from the matching [Condition](#condition).
- `val2Path` The path `val2` came from, or an empty string if none.

```ts
{
	"val1": Literal,
	"val1Path": string,
	"comparison": Comparison,
	"val2": Literal,
	"val2Path": string
}
```

---

## Docs

### UserVars.setVar(value: Var, forceOverwrite: boolean = false)

Sets a variable according to `value`.

#### Arguments

- `value` A [Var](#variable-types) containing all the data needed to set the variable.
- `forceOverwrite` [OPTIONAL] `true` if variable can overwrite a scope with the same name and vice versa, or `false` if not

### UserVars.setVarBulk(...values: Array<string>)

Wrapper for calling `UserVars.setVar` multiple times with each item of `values`.

#### Arguments

- `values` An array of [Vars](#variable-types) to be passed to `UserVars.setVar`.

### UserVars.getVar(path: string, full?: boolean)

Evaluates a variable (or hits the cache), and returns the output.

#### Arguments

- `path` The absolute path to the variable you want to get.
- `full` [OPTIONAL] If the variable at `path` is a Table, this controls whether just the output is returned (`false`) or the full [TableData](#tabledata) (`true`).

### UserVars.getRawVar(path: string)

Returns the raw JSON data behind the variable at `path`.

#### Arguments

- `path` The path to get the variable data from.
