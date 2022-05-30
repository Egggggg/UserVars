# UserVars

UserVars is a Typescript library made to let end users create variables and use them wherever they're supported by the application. It includes dependency chains, decision trees, and mathematical expressions. All input and storage is valid JSON, removing the need for custom serialization logic.

---

## Installation

```bash
$ npm install uservars
```

---

## Usage

Examples can be found in [this file](https://github.com/Egggggg/UserVars/blob/main/examples.js). 

- Examples for literal variables start from the top.
- Examples for references start with `basicLiteral`.
- Examples for scopes start with `basicScoped`.

To begin using the library, you must first import it, and then create a new `UserVars` object to interact with it.

```ts
import { UserVars } from "uservars";

const userVars = new UserVars();
```

After that, you can start adding variables. This is done with the `UserVars.setVar()` function. It requires input conforming to one of the four variable types as shown [here](#variable-types). In many cases (anywhere `Reference` is listed as a possible type), string literals can be replaced by [References](#reference) to other variables. There are also scopes available to use. These let you separate variables, so you can reuse names. To go back up to global from a scoped variable, add `../` to the start of the path.

---

## Variable Types

All variable types included in this library have four common fields:

- `name` The last part of the path used to reference the variable. Must match the Regex pattern `/^[A-Z\d_]+$/i`
- `scope` The top level name of the variable. If "global", it can be omitted from the path anywhere the variable is referred to. Must match the Regex pattern `/^[A-Z\d_]+$/i`
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
