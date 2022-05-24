# UserVars

UserVars is a Typescript library made to let end users create variables and use them wherever they're supported by the application. It includes dependency chains, decision trees, and mathematical expressions. All input and storage is valid JSON, removing the need for custom serialization logic.

---

## Installation

To install, run the following command in a shell with npm installed:

```bash
$ npm install uservars
```

---

## Usage

To begin using the library, you must first create a new `UserVars` object to interact with the it. After that, you can start adding variables. This is done with the `UserVars.setVar()` function. It requires input conforming to one of the four variable types, outlined [here](#types).

---

## Types

All variable types included in this library have four common properties:

- `name`
  The last part of the path to retrieve its value.
- `scope`
  The top level name of the variable. If "global", it can be omitted from the path anywhere it is referred to.
- `value`
  The value stored in the variable. Depending on which type of variable it is, this will have a different required structure.
- `varType`
  This is used internally to tell what kind of variable is being evaluated, and if it doesn't match the actual structure an error will be thrown.

### Basic

```ts
{
	"name": string,
	"scope": string,
	"value": string,
	"varType": "basic",
	"basicType": "literal" | "var"
}
```

---

## Docs

### UserVars
