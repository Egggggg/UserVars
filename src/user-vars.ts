import { get } from "lodash";
import { Parser } from "expr-eval";

type Comparison = string; // "eq", "lt", "gt", or "in"
type Priority = string; // "first" or "last"
type Literal = string | string[];

/**
 * Generic variable data
 */
export interface Var {
  name: string;
  scope: string;
  value: Value | Value[] | TableRow[];
  varType: string; //"basic", "list", "table", or "expression"
}

/**
 * Should evaluate to either another variable's value or a string
 * varType is "basic"
 */
export interface BasicVar extends Var {
  value: Value;
}

type Value = string | TypedValue;

/**
 * Basic value
 */
export interface TypedValue {
  value: string;
  type: string; // "literal", "reference", or "expression"
}

/**
 * String literal, evaluates literally
 */
export interface StringLiteral extends TypedValue {
  value: string;
  type: string; // "literal"
}

/**
 * Reference to a variable, used in lists and tables
 */
export interface Reference extends TypedValue {
  value: string;
  type: string; // "reference"
}

/**
 * Inline expression
 */
export interface InlineExpression extends TypedValue {
  value: string;
  vars: {
    [name: string]: Value;
  };
  type: string; // "expression"
}

/**
 * Should evaluate to an array of BasicVars
 * varType is "list"
 */
export interface ListVar extends Var {
  value: Value[];
  varType: string;
}

/**
 * Condition for table rows, the row is output if all of these are true
 */
export interface Condition {
  val1: Value;
  comparison: Comparison;
  val2: Value;
}

/**
 * Condition returned from full table output
 */
export interface ConditionData {
  val1: Literal;
  val1Path: string;
  comparison: Comparison;
  val2: Literal;
  val2Path: string;
}

/**
 * Row for table
 */
export interface TableRow {
  conditions: Condition[];
  output: Value;
}

/**
 * Table row returned from full table output
 */
export interface TableRowData {
  conditions: ConditionData[];
  output: Literal;
  outputPath: string;
}

/**
 * Table variable, should evaluate to the single output of the first or last row where all conditions are true
 * varType is "table"
 */
export interface TableVar extends Var {
  priority: Priority;
  default: Value;
  value: TableRow[];
  varType: string;
}

/**
 * Evaluated table data returned from full table output
 */
export interface TableData {
  output: Literal;
  outputPath: string;
  outIndex: number;
  value: TableRowData[];
  default: Literal;
  defaultPath: string;
  priority: string; // "first" or "last"
}

/**
 * A mathematical expression to be evaluated
 * varType is "expression"
 */
export interface ExpressionVar extends Var {
  functions?: Value[];
  vars: {
    [name: string]: Value;
  };
  value: Value;
  varType: string;
}

/**
 * Mapping of Vars under the same scope
 */
export interface Scope {
  [name: string]: Var;
}

/**
 * Mapping of Vars in the global scope and Scopes containing Vars
 */
export interface Vars {
  [name: string]: Var | Scope;
}

/**
 * Mapping of variable path to its dependents
 */
export interface Deps {
  [key: string]: Set<string>;
}

export interface Cache {
  [path: string]: Literal | TableData;
}

export interface Changed {
  [path: string]: boolean;
}

export interface AllVars {
  [name: string]: Literal | TableData | OutputScope;
}

export interface OutputScope {
  [name: string]: Literal | TableData;
}

export interface AllVarsFlat {
  [name: string]: Literal | TableData;
}

/**
 * Checks whether obj is a Var
 * @param obj Object to assert
 * @returns {boolean} Whether obj is a Var
 */
function isVar(obj: Var | Scope | null): obj is Var {
  if (!obj) return false;
  return "varType" in obj && typeof obj.varType === "string";
}

function parseLtGt(arg1: Literal, arg2: Literal) {
  let num1: number;
  let num2: number;

  if (typeof arg1 === "string") {
    num1 = parseFloat(arg1);
  } else {
    num1 = arg1.length;
  }

  if (typeof arg2 === "string") {
    num2 = parseFloat(arg2);
  } else {
    num2 = arg2.length;
  }

  return { num1, num2 };
}

/**
 * Normalizes a path relative to its scope.
 * Only takes into account "../" and the first and last period delimited values
 * Usually not needed if scope is global.
 * @param {string} path             - The path to normalize
 * @param {string} [scope="global"] - The scope the path is relative to
 * @returns {string} The normalized path
 */
function normalizePath(path: string, scope: string = "global"): string {
  let up = false;

  if (path.startsWith("../") && scope !== "global") {
    up = true;
    path = path.replace("../", "");
  }

  if (path.startsWith("global.")) {
    path = path.replace("global.", "");
  }

  // remove multiple periods in a row
  path = path.replace(/\.+/g, ".");

  let split = path.split(".");
  const multipleParts = split.length > 1;

  split = [split[0], split[split.length - 1]];

  if ((scope === "global" || up) && !multipleParts) {
    return split[0];
  }

  if (!multipleParts) {
    return `${scope}.${split[0]}`;
  }

  return split.join(".");
}

/**
 * Gets the path to a variable from its scope and name
 * @param {string} name             - The name of the variable
 * @param {string} [scope="global"] - The scope of the variable
 * @returns {string} The path to the variable
 */
function getPath(name: string, scope: string = "global"): string {
  if (scope !== "global") {
    // return to global
    if (name.startsWith("../")) {
      name = name.replace("../", "");
      return name;
    }

    return `${scope}.${name}`;
  } else {
    return name;
  }
}

const comparisons = {
  eq: (arg1: Literal, arg2: Literal) => {
    if (typeof arg1 !== typeof arg2) {
      return false;
    }

    if (typeof arg1 === "string") {
      return arg1 === arg2;
    }

    // both are lists
    return (
      arg1
        .filter((i) => !arg2.includes(i))
        .concat((<string[]>arg2).filter((i) => !arg1.includes(i))).length === 0
    );
  },
  lt: (arg1: Literal, arg2: Literal) => {
    const { num1, num2 } = parseLtGt(arg1, arg2);
    return num1 < num2;
  },
  gt: (arg1: Literal, arg2: Literal) => {
    const { num1, num2 } = parseLtGt(arg1, arg2);
    return num1 > num2;
  },
  in: (arg1: Literal, arg2: string[]) => {
    if (typeof arg1 === "string") {
      return arg2.includes(arg1);
    }

    return arg1.every((i) => arg2.includes(i));
  }
};
/**
 * Creates a new UserVars object for holding user defined dynamic variables
 * @class
 * @property {Vars}     vars    - Variable mapping, {name: value}, scoped vars are nested into scope name
 * @property {Parser}   parser  - Parser for expressions
 * @property {Cache}    cache   - Resolved values of variables
 * @property {Deps}     deps    - Mapping from path to dependents
 * @property {Changed}  changed - Record of which variables need to be re-evaluated
 */
export class UserVars {
  vars: Vars;
  parser: Parser;
  cache: Cache;
  deps: Deps;
  changed: Changed;

  /**
   * Creates a new UserVars object for holding user defined dynamic variables
   */
  constructor() {
    this.vars = {};
    this.cache = {};
    this.deps = {};
    this.changed = {};

    this.parser = new Parser();
  }

  /**
   * Adds the passed scope to the list. This is done automatically with addVar and the build methods
   * @param {string}  scope     - Name of the scope to add to the list
   * @param {boolean} [overwrite=true] - True if existing global variables with conflicting name should be overwritten
   * @returns {boolean} True if scope was added or already existed
   */
  #addScope(scope: string, overwrite: boolean = false): boolean {
    if (!this.vars[scope] || (overwrite && isVar(this.vars[scope]))) {
      // there is nothing at this.vars[scope]
      // or
      // this.vars[scope] is a Var, not a Scope, and should be overwritten
      this.vars[scope] = {};

      return true;
    }

    if (this.vars[scope] && !overwrite && !isVar(this.vars[scope])) {
      // scope exists as scope
      return true;
    }

    // there is a global variable with the same name as scope, but cannot overwrite it
    return false;
  }

  /**
   * Adds the passed variable to Vars, and the evaluated value to vars.
   * This is done automatically with the build methods
   * @param {Var}     value                  - Variable to add to the list
   * @param {boolean} [forceOverwrite=false] - Whether scopes and global variables with the same names can overwrite eachother
   * @returns {boolean} True if variable was set
   */
  setVar(value: Var, forceOverwrite: boolean = false): boolean {
    const pattern = /^[A-Z\d_]+$/i;
    const nameMatch = pattern.test(value.name);
    const scopeMatch = pattern.test(value.scope);

    if (!nameMatch) {
      throw `Name must match pattern /^[A-Z\\d_]+$/i exactly (${value.scope}.${value.name})`;
    }

    if (!scopeMatch) {
      throw `Scope must match pattern /^[A-Z\\d_]+$/i exactly (${value.scope}.${value.name})`;
    }

    // variable goes to root
    if (value.scope === "global") {
      if (!this.vars[value.name] || isVar(this.vars[value.name])) {
        this.vars[value.name] = { ...value };

        this.#setChanged(getPath(value.name, value.scope));

        return true;
      }

      if (forceOverwrite) {
        this.vars[value.name] = { ...value };

        this.#setChanged(getPath(value.name, value.scope));

        return true;
      }

      return false;
    } else {
      // variable goes to a scope
      // successfully added or already existed
      if (this.#addScope(value.scope, forceOverwrite)) {
        if (!(<Scope>this.vars[value.scope])[value.name]) {
          (<Scope>this.vars[value.scope])[value.name] = { ...value };

          this.#setChanged(getPath(value.name, value.scope));

          return true;
        }

        // variable at path exists and can't be overwritten
        return false;
      } else {
        // couldn't add scope
        return false;
      }
    }
  }

  /**
   * Helper function for setting multiple variables at once
   * @param {Var[]}   values - Array of variable data to pass to setVar
   * @returns {boolean[]} Array of boolean representing whether each variable was added
   */
  setVarBulk(...values: Var[]): boolean[] {
    const output: boolean[] = [];

    for (let i of values) {
      output.push(this.setVar(i, false));
    }

    return output;
  }

  /**
   * Evaluates a Var into a string or string[]
   * @param {Var}      value         - The value to evaluate
   * @param {string}   [origin=path] - The original var's path for circular dependency detection
   * @param {string[]} [parents=[]]  - List of parent paths to add to deps
   * @returns {Literal} The evaluated value
   */
  #evaluate(value: Var, origin?: Set<string>, parents: string[] = []): Literal {
    if (!parents) parents = [];

    const thisPath = getPath(value.name, value.scope);

    if (!this.deps[thisPath]) this.deps[thisPath] = new Set();

    for (let i of parents) {
      if (!this.deps[thisPath].has(i)) {
        this.deps[thisPath].add(i);
      }
    }

    parents = [...parents, thisPath];

    if (!origin) {
      origin = new Set<string>();
    } else {
      origin = new Set<string>(origin);
    }

    if (!origin.has(thisPath)) {
      origin.add(thisPath);
    } else {
      return "[CIRCULAR DEPENDENCY]";
    }

    if (value.varType === "basic") {
      if (
        typeof value.value !== "string" &&
        (!("type" in value.value) ||
          !["literal", "reference", "expression"].includes(value.value.type))
      ) {
        throw new TypeError(
          `Basic variable value must be of type Value (${value.scope}.${value.name})`
        );
      }

      const basic = value as BasicVar;

      if (typeof basic.value === "string") return basic.value;

      if (basic.value.type === "literal") {
        return basic.value.value;
      }

      return this.#followReference(basic.value, basic.scope, origin, parents);
    } else if (value.varType === "list") {
      if (
        !(value.value instanceof Array) ||
        (<Array<Value | TableRow>>value.value).filter((i) => {
          typeof i !== "string" &&
            (!("type" in i) ||
              !["literal", "reference", "expression"].includes(i.type));
        }).length > 0
      )
        throw new TypeError(
          `List variable value must be of type string[] (${value.scope}.${value.name})`
        );

      const output: string[] = [];
      const list = value as ListVar;

      list.value.forEach((e) => {
        if (typeof e === "string") {
          output.push(e);
        } else if (e.type === "literal") {
          output.push(e.value);
        } else {
          const current = this.#followReference(
            e,
            list.scope,
            <Set<string>>origin,
            parents
          );

          if (current instanceof Array) {
            output.push(...current);
          } else if (current === "[MISSING REFERENCE]") {
            output.push(`[MISSING ${e.value}]`);
          } else {
            output.push(current);
          }
        }
      });

      return output;
    } else if (value.varType === "table") {
      if (
        !("priority" in value) ||
        !["first", "last"].includes((<TableVar>value).priority)
      )
        throw new TypeError(
          `Table "variable" priority field must be either "first" or "last" (${value.scope}.${value.name}))`
        );
      if (
        !("default" in value) ||
        (typeof (<TableVar>value).default !== "string" &&
          !["literal", "reference", "expression"].includes(
            (<TypedValue>(<TableVar>value).default).type
          ))
      )
        throw new TypeError(
          `Table "default" field must be of type Value (${value.scope}.${value.name})`
        );
      if (
        !(value.value instanceof Array) ||
        (<Array<Value | TableRow>>value.value).filter((i) => {
          return typeof i === "string" || "type" in i;
        }).length > 0
      ) {
        throw new TypeError(
          `Table variable values must be of type TableRow[] (${value.scope}.${value.name})`
        );
      }

      const table = value as TableVar;

      if (table.priority === "first") {
        for (let i = 0; i < table.value.length; i++) {
          const row = table.value[i];
          let out = true;

          for (let e of row.conditions) {
            if (!this.#evalCondition(e, table.scope, origin, parents, false)) {
              out = false;
              break;
            }
          }

          if (out) {
            const output = table.value[i].output;

            if (typeof output === "string") return output;

            if (output.type === "literal") {
              return output.value;
            }

            return this.#followReference(output, table.scope, origin, parents);
          }
        }
      } else {
        for (let i = table.value.length - 1; i > -1; i--) {
          const row = table.value[i];
          let out = true;

          for (let e of row.conditions) {
            if (!this.#evalCondition(e, table.scope, origin, parents, false)) {
              out = false;
              break;
            }
          }

          if (out) {
            const output = table.value[i].output;

            if (typeof output === "string") return output;

            if (output.type === "literal") {
              return output.value;
            }

            return this.#followReference(output, table.scope, origin, parents);
          }
        }
      }

      if (typeof table.default === "string") return table.default;

      if (table.default.type === "literal") {
        return table.default.value;
      }

      return this.#followReference(table.default, table.scope, origin, parents);
    } else if (value.varType === "expression") {
      if (
        !("vars" in value) ||
        Object.values((<ExpressionVar>value).vars).filter((i) => {
          typeof i !== "string" &&
            (!("type" in i) ||
              !["literal", "reference", "expression"].includes(i.type));
        }).length > 0
      )
        throw new TypeError(
          `Expression "vars" field must be of type {[name: string]: Value} (${value.scope}.${value.name})`
        );

      if (
        "functions" in value &&
        (<Value[]>(<ExpressionVar>value).functions).filter((i) => {
          typeof i !== "string" &&
            (!("type" in i) ||
              !["literal", "reference", "expression"].includes(i.type));
        }).length > 0
      )
        throw new TypeError(
          `Expression "functions" field must be of type Value[] (${value.scope}.${value.name})`
        );

      let expr = value as ExpressionVar;
      let toParse: string;

      if (typeof expr.value === "string") {
        toParse = expr.value;
      } else if (expr.value.type === "literal") {
        toParse = expr.value.value;
      } else {
        const followed = this.#followReference(
          expr.value,
          expr.scope,
          origin,
          parents
        );

        if (followed instanceof Array) {
          return `[LIST ${expr.value.value}]`;
        }

        toParse = followed;
      }

      let functions = "";

      if ("functions" in expr) {
        // prepend toParse with functions, to be used in expr.value
        // @ts-ignore
        for (let i of expr.functions) {
          if (typeof i === "string") {
            functions += `${i}; `;
          } else if (i.type === "literal") {
            functions += `${i.value}; `;
          } else {
            const func = this.#followReference(i, expr.scope, origin, parents);

            if (func instanceof Array) {
              for (let e of func) {
                functions += `${e}; `;
              }

              continue;
            }

            if (func === "[MISSING REFERENCE]") {
              return `[MISSING ${i.value}]`;
            }

            functions += `${func}; `;
          }
        }
      }

      toParse = `${functions}${toParse}`;
      let parsed = this.parser.parse(toParse);

      let vars = parsed.variables();
      let input: { [name: string]: string | number[] } = {};

      // evaluate all variables to be passed into parsed.evaluate()
      for (let i of Object.keys(expr.vars)) {
        if (!vars.includes(i)) continue;

        const current = expr.vars[i];

        if (typeof current === "string") {
          input[i] = current;
          continue;
        }

        if (current.type === "literal") {
          input[i] = current.value;
          continue;
        }

        const followed = this.#followReference(
          current,
          expr.scope,
          origin,
          parents
        );

        if (followed === "[MISSING REFERENCE]") return `[MISSING ${current}]`;

        if (typeof followed === "string") {
          input[i] = followed;
        } else {
          input[i] = followed.map((e) => parseFloat(e));
        }
      }

      // @ts-ignore
      const evaluated = parsed.evaluate(input).toString();

      if (evaluated.match(/,/g)) {
        return evaluated.split(",");
      }

      return evaluated;
    }

    return "[NOT IMPLEMENTED]";
  }

  /**
   * Evaluates a condition from a table row, returning true or false
   * @param {Condition} cond    - The condition to evaluate
   * @param {string}    scope   - The scope paths will be evaluated relative to
   * @param {string}    origin  - For circular dependency detection
   * @param {string[]}  parents - List of parent paths to pass to #evaluate
   * @param {boolean}   full    - Whether operand values should be returned
   * @return {boolean} Whether the condition passes
   */
  #evalCondition(
    cond: Condition,
    scope: string,
    origin: Set<string>,
    parents: string[],
    full: boolean
  ): boolean | { output: boolean; val1: Literal; val2: Literal } {
    let val1: Literal;
    let val2: Literal;

    if (typeof cond.val1 === "string") {
      val1 = cond.val1;
    } else if (cond.val1.type === "literal") {
      val1 = cond.val1.value;
    } else {
      val1 = this.#followReference(cond.val1, scope, origin, parents);
    }

    if (typeof cond.val2 === "string") {
      val2 = cond.val2;
    } else if (cond.val2.type === "literal") {
      val2 = cond.val2.value;
    } else {
      val2 = this.#followReference(cond.val2, scope, origin, parents);
    }

    if (cond.comparison === "eq") {
      if (!comparisons.eq(val1, val2)) {
        return !full ? false : { output: false, val1, val2 };
      }
    } else if (cond.comparison === "lt") {
      if (!comparisons.lt(val1, val2)) {
        return !full ? false : { output: false, val1, val2 };
      }
    } else if (cond.comparison === "gt") {
      if (!comparisons.gt(val1, val2)) {
        return !full ? false : { output: false, val1, val2 };
      }
    } else if (cond.comparison === "in") {
      if (val2 instanceof Array) {
        if (!comparisons.in(val1, val2)) {
          return !full ? false : { output: false, val1, val2 };
        }
      } else {
        // type mismatch
        return !full ? false : { output: false, val1, val2 };
      }
    }

    return !full ? true : { output: true, val1, val2 };
  }

  /**
   * Evaluates and returns full data of a table, including all row outputs and condition operands
   * @param {TableVar} table - Table to evaluate
   * @returns {TableData} The fully evaluated table data
   */
  #evaluateFull(table: TableVar): TableData {
    const output = {
      output: "",
      outputPath: "",
      outIndex: -1,
      value: [],
      default: "",
      defaultPath: "",
      priority: table.priority
    } as TableData;

    const thisPath = getPath(table.name, table.scope);
    const origin = new Set<string>();
    origin.add(thisPath);

    const parents = [thisPath];
    let found = false;

    for (let i = 0; i < table.value.length; i++) {
      const row = table.value[i];
      const rowData = {
        conditions: [],
        output: "",
        outputPath: ""
      } as TableRowData;
      let out = true;

      for (let e of row.conditions) {
        const cond = <{ output: boolean; val1: Literal; val2: Literal }>(
          this.#evalCondition(e, table.scope, origin, parents, true)
        );
        let val1Path = "";
        let val2Path = "";

        if (typeof e.val1 !== "string" && e.val1.type !== "literal") {
          val1Path = e.val1.value;
        }

        if (typeof e.val2 !== "string" && e.val2.type !== "literal") {
          val2Path = e.val2.value;
        }

        rowData.conditions.push({
          val1: cond.val1,
          val1Path,
          val2: cond.val2,
          val2Path,
          comparison: e.comparison
        });

        if (!cond.output) {
          out = false;
        }
      }

      let rowOut;
      let rowOutPath = "";

      if (typeof row.output === "string") {
        rowOut = row.output;
      } else if (row.output.type === "literal") {
        rowOut = row.output.value;
      } else {
        rowOut = this.#followReference(
          row.output,
          table.scope,
          origin,
          parents
        );
        rowOutPath = row.output.value;
      }

      output.value.push({ ...rowData, output: rowOut, outputPath: rowOutPath });

      if (out && (!found || table.priority === "last")) {
        found = true;
        output.output = rowOut;
        output.outIndex = i;

        if (typeof row.output !== "string" && row.output.type !== "literal") {
          output.outputPath = row.output.value;
        }
      }
    }

    let defaultVal;
    let defaultPath = "";

    if (typeof table.default === "string") {
      defaultVal = table.default;
    } else if (table.default.type === "literal") {
      defaultVal = table.default.value;
    } else {
      defaultVal = this.#followReference(
        table.default,
        table.scope,
        origin,
        parents
      );
      defaultPath = table.default.value;
    }

    output.default = defaultVal;
    output.defaultPath = defaultPath;

    if (!found) {
      output.output = defaultVal;

      if (typeof table.default !== "string" && table.default.type !== "literal")
        output.outputPath = output.defaultPath;
    }

    return output;
  }

  /**
   * Gets a Var from a string path
   * @param {string} path - The path to the variable
   * @returns {Var} The Var found at scope.name
   */
  getRawVar(path: string): Var {
    const result = get(this.vars, normalizePath(path), null);

    if (isVar(result)) {
      return result;
    } else if (result) {
      throw new TypeError(`Variable ${path} is malformed (is it a scope?)`);
    }

    throw new ReferenceError(`Variable ${path} not found`);
  }

  /**
   * Gets a Var from a string path
   * @param {string}  path - The path to the variable
   * @param {boolean} full - Whether the variable should be fully evaluated if it's a table, will return TableData
   * @returns {Var} The Var found at the path
   */
  getVar(path: string, full?: boolean): Literal | TableData {
    const variable = this.getRawVar(path);

    if (full && variable.varType === "table") {
      if (!this.changed[`${path}-full`] && this.cache[`${path}-full`]) {
        return this.cache[`${path}-full`];
      }

      const value = this.#evaluateFull(<TableVar>variable);

      this.cache[`${path}-full`] = value;
      this.changed[`${path}-full`] = false;

      return value;
    }

    if (!this.changed[path] && this.cache[path]) {
      return this.cache[path];
    }

    const value = this.#evaluate(variable, undefined);

    this.cache[path] = value;
    this.changed[path] = false;

    return value;
  }

  /**
   * Returns the values of all variables, structured, optionally with full TableData
   * @param {boolean} flat - Whether the output data should be a flat mapping of paths to literals, or scopes should be entries containing values
   * @param {boolean} full - Whether the variable should be fully evaluated if it's a table, will return TableData
   */
  getAllVars(flat?: boolean, full?: boolean): AllVars | AllVarsFlat {
    if (flat) {
      const output: AllVarsFlat = {};

      for (let i of Object.keys(this.vars)) {
        let current = this.vars[i];

        if (isVar(current)) {
          output[i] = this.getVar(i, full);
        } else {
          for (let e of Object.keys(current)) {
            output[`${i}.${e}`] = this.getVar(`${i}.${e}`, full);
          }
        }
      }

      return output;
    } else {
      const output: AllVars = {};

      for (let i of Object.keys(this.vars)) {
        let current = this.vars[i];

        if (isVar(current)) {
          output[i] = this.getVar(i, full);
        } else {
          output[i] = {} as OutputScope;

          for (let e of Object.keys(current)) {
            // @ts-ignore
            output[i][e] = this.getVar(`${i}.${e}`, full);
          }
        }
      }

      return output;
    }
  }

  #followReference(
    ref: TypedValue,
    scope: string,
    origin: Set<string>,
    parents: string[]
  ): Literal {
    if (ref.type === "expression") {
      let parsed = this.parser.parse(ref.value);
      let vars = parsed.variables();
      let input: { [name: string]: string | number[] } = {};

      for (let i of Object.keys((<InlineExpression>ref).vars)) {
        if (!vars.includes(i)) continue;

        const current = (<InlineExpression>ref).vars[i];

        if (typeof current === "string") {
          input[i] = current;
          continue;
        }

        if (current.type === "literal") {
          input[i] = current.value;
          continue;
        }

        const path = normalizePath(current.value, scope);
        const followed = this.#followReference(
          { value: path, type: "reference" },
          scope,
          origin,
          parents
        );

        if (followed === "[MISSING REFERENCE]") return `[MISSING ${current}]`;

        if (typeof followed === "string") {
          input[i] = followed;
        } else {
          input[i] = followed.map((e) => parseFloat(e));
        }
      }

      // @ts-ignore
      const evaluated = parsed.evaluate(input).toString();

      if (evaluated.match(/,/g)) {
        return evaluated.split(",");
      }

      return evaluated;
    }

    try {
      const path = normalizePath(ref.value, scope);
      const value = this.#evaluate(this.getRawVar(path), origin, parents);

      this.cache[path] = value;
      this.changed[path] = false;

      return value;
    } catch (err) {
      if (err instanceof ReferenceError) {
        return "[MISSING REFERENCE]";
      } else {
        throw err;
      }
    }
  }

  #setChanged(path: string) {
    this.changed[path] = true;

    if (!this.deps[path]) return;

    for (let i of this.deps[path]) {
      this.#setChanged(i);
    }
  }
}
