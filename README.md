# UserVars

UserVars is a Typescript library made to let end users create variables and use them wherever they're supported by the application. It includes dependency chains, decision trees, and mathematical expressions. All input and storage is valid JSON, removing the need for custom serialization logic.

---

## Installation

```bash
$ npm install uservars
```

---

## Usage

To begin using the library, you must first import it, and then create a new `UserVars` object to interact with it. After that, you can start adding variables. This is done with the `UserVars.setVar()` function. It requires input conforming to one of the four variable types as shown [here](#types).

---

## Variable Types

All variable types included in this library have four common fields:

- `name` The last part of the path used to reference the variable.
- `scope` The top level name of the variable. If "global", it can be omitted from the path anywhere the variable is referred to.
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
	"value": Array<string | Reference>
	"varType": "list"
}
```

### Table

- `default` The default value to output if no rows are output.
- `priority` `"first"` to output the first passing row, or `"last"` to output the last one.
- `value` An array of [TableRows](#table-row). The output value of either the first or last row where all conditions pass is output for the whole variable, or `default` if none pass.

```ts
{
	"default": string,
	"name": string,
	"priority": "first" | "last",
	"scope": string,
	"value": Array<TableRow>,
	"varType": "table"
}
```

### Expression

Expressions execute `value` using functions from `functions` and variables from `vars`. https://github.com/silentmatt/expr-eval is used to safely perform the math.

- `functions` Each item of this array is prepended to `value` in order, so the functions can be used in the expression. Referenced lists are flattened. These should be formatted like `name(x) = x + 2`.
- `value` Either a string, which will be used literally, or a [Reference](#reference) which will be resolved first. This is what is actually executed.
- `vars` A mapping of variable names used in `value` to either strings or [References](#reference). The resolved values of these are used to replace variables with the same names in `value`.

```ts
{
	"functions": Array<string | Reference>,
	"name": string,
	"scope": string,
	"value": string | Reference,
	"vars": {[name: string]: string | Reference}
}
```

---

## Docs

### UserVars
