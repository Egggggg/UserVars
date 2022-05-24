import { get } from "lodash";
import { Parser } from "expr-eval";

type Comparison = string; // "eq", "lt", "gt", or "in"
type Priority = string; // "first" or "last"
type BasicType = string; // "var" or "literal"
type Literal = string | string[];

/**
 * Mapping of variable path to its dependents or dependencies
 */
export interface Deps {
    [key: string]: string[];
}

/**
 * Generic variable data
 */
export interface Var {
    name: string;
    scope: string;
    value: string | Value | Value[] | TableRow[];
    varType: string; //"basic", "list", "table", or "expression"
}

/**
 * Should evaluate to either another variable's value or a string
 * varType is "basic"
 */
export interface BasicVar extends Var {
    value: string;
    basicType: BasicType;
}

/**
 * Reference to a variable, used in lists and tables
 * varType is "reference"
 */
export interface Reference {
	value: string;
	varType: string;
}

/**
 * Value for list items and table outputs
 */
export type Value = Reference | string;

/**
 * Should evaluate to an array of BasicVars
 * varType is "list"
 */
export interface ListVar extends Var {
    value: Value[];
    varType: string;
}

/**
 * Condition for table rows, the row is output if this is true
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
	comparison: Comparison;
	val2: Literal;
}

/**
 * Row for table, should evaluate to `output`
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
	outIndex: number;
	value: TableRowData[];
	default: Literal;
	priority: string; // "first" or "last"
}

/**
 * A mathematical expression to be evaluated
 * varType is "expression"
 */
export interface ExpressionVar extends Var {
	functions?: Value[],
	vars: {
		[name: string]: Value
	},
	value: Value,
	varType: string;
}

/**
 * Array of Vars under the same scope
 */
export interface Scope {
    [name: string]: Var;
}

/**
 * Array of Vars in the global scope and RawScopes containing Vars
 */
export interface Vars {
    [name: string]: Var | Scope;
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

const comparisons = {
	eq: (arg1: Literal, arg2: Literal) => {
		if (typeof arg1 !== typeof arg2) {
			return false;
		}

		if (typeof arg1 === "string") {
			return arg1 === arg2;
		}

		// both are lists
		return arg1.filter(i => !arg2.includes(i)).concat((<string[]>arg2).filter(i => !arg1.includes(i))).length === 0
	},
	lt: (arg1: Literal, arg2: Literal) => {
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

		return num1 < num2;
	},
	gt: (arg1: Literal, arg2: Literal) => {
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

		return num1 > num2;
	},
	"in": (arg1: Literal, arg2: string[]) => {
		if (typeof arg1 === "string") {
			return arg2.includes(arg1);
		}

		return arg1.every(i => arg2.includes(i));
	}
};
/**
 * Creates a new UserVars object for holding user defined dynamic variables
 * @class
 * @property {string[]} scopes       - List of scopes currently in use
 * @property {Vars}     vars         - Variable mapping, {name: value}, scoped vars are nested into scope name
 */
export class UserVars {
    scopes: string[];
    vars: Vars;
	parser: Parser;

    /**
     * Creates a new UserVars object for holding user defined dynamic variables
     */
    constructor() {
        this.scopes = [];
        this.vars = {};

		this.parser = new Parser();
    }

    /**
     * Adds the passed scope to the list. This is done automatically with addVar and the build methods
     * @param {string}  scope     - Name of the scope to add to the list
     * @param {boolean} [overwrite=true] - True if existing global variables with conflicting name should be overwritten
     * @returns {boolean} True if scope was added or already existed
     */
    #addScope(scope: string, overwrite: boolean = true): boolean {
        // scope is not in this.scopes
        if (this.scopes.indexOf(scope) === -1) {
            // there is nothing at this.vars[scope]
            // or
            // this.vars[scope] is a Var, not a RawScope, and should be overwritten
            if (
                !this.vars[scope] ||
                (overwrite && "varType" in this.vars[scope])
            ) {
                this.scopes.push(scope);
                this.vars[scope] = {};
                this.vars[scope] = {};

                return true;
            }
        } else {
            // scope already exists
            return true;
        }

        // there is a global variable with the same name as scope, but cannot overwrite it
        return false;
    }

    /**
     * Adds the passed variable to Vars, and the evaluated value to vars.
     * This is done automatically with the build methods
     * @param {Var}  value                - Variable to add to the list
     * @param {boolean} [overwrite=false] - True if existing variable with conflicting name or scope should be overwritten
     * @returns {boolean} True if variable was set
     */
    setVar(value: Var, overwrite: boolean = false): boolean {
        // variable goes to root
        if (value.scope === "global") {
            if (!this.vars[value.name] || overwrite) {
                this.vars[value.name] = value;
                return true;
            }

            return false;
        } else { // variable goes to a scope
            // added or already existed
            if (this.#addScope(value.scope, overwrite)) {
				if (!(<Scope>this.vars[value.scope])[value.name] || overwrite) {
					(<Scope>this.vars[value.scope])[value.name] = value;
					return true;
				}

				// variable at path exists and can't be overwritten
				return false;
            } else { // couldn't add scope
                return false;
            }
        }
    }

	/**
	 * Helper function for setting multiple variables at once
	 * @param {Var[]} values - Array of variable data to pass to setVar
	 * @returns {boolean[]} Array of boolean representing whether each variable was added
	 */
	setVarBulk(...values: Var[]): boolean[] {
		const output: boolean[] = [];

		for (let i of values) {
			output.push(this.setVar(i));
		}

		return output;
	}

    /**
     * Evaluates a Var into a string or string[]
     * @param {Var}     value    - The value to evaluate
     * @param {string}  [origin=pathToVar]   - The original var's path for circular dependency detection
	 * @param {boolean} recursed - false on first iteration, true after that, should only be set to true internally
     * @returns {Literal} The evaluated value
     */
    #evaluate(value: Var, origin: string = this.getPath(value.name, value.scope), recursed: boolean = false): Literal {
		const thisPath = this.getPath(value.name, value.scope);

        if (recursed && origin === thisPath) {
            return "[CIRCULAR DEPENDENCY]";
        }

        if (value.varType === "basic") {
			if (typeof value.value !== "string") throw new TypeError(`Basic variable value must be of type string (${value.scope}.${value.name})`);
			if (!("basicType" in value)) throw new TypeError(`Basic variables must have a "basicType" property (${value.scope}.${value.name})`);

            const basic = value as BasicVar;

            if (basic.basicType === "literal") {
                return basic.value;
            }

			return this.#followReference(basic.value, basic.scope, origin);
        } else if (value.varType === "list") {
			if (
				!(value.value instanceof Array) 
				|| (<Array<string | Value | TableRow>>value.value).filter((i) => {
					typeof i !== "string"
				}).length > 0) throw new TypeError(`List variable value must be of type string[] (${value.scope}.${value.name})`);

			const output: string[] = [];
			const list = value as ListVar;

			list.value.forEach((e) => {
				if (typeof e === "string") {
					output.push(e);
				} else {
					const current = this.#followReference(e.value, list.scope, origin);

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
			if (!("priority" in value) || !["first", "last"].includes((<TableVar>value).priority)) throw new TypeError(`Table "variable" priority field must be either "first" or "last" (${value.scope}.${value.name}))`);
			if (!("default" in value) || (!(typeof (<TableVar>value).default === "string") && !("varType" in <Reference>(<TableVar>value).default))) throw new TypeError(`Table "default" field must be of type Value (${value.scope}.${value.name})`);
			if (
				!(value.value instanceof Array) 
				|| (<Array<string | Value | TableRow>>value.value).filter((i) => {
					typeof i === "string" || "varType" in i
				}).length > 0) throw new TypeError(`Table variable values must be of type TableRow[] (${value.scope}.${value.name})`);

			const table = value as TableVar;

			if (table.priority === "first") {
				for (let i = 0; i < table.value.length; i++) {
					const row = table.value[i]
					let out = true

					for (let e of row.conditions) {
						if (!this.#evalCondition(e, table.scope, origin, false)) {
							out = false;
							break;
						}
					}

					if (out) {
						if (typeof table.value[i].output === "string") {
							return <string> table.value[i].output;
						}

						return this.#followReference((<Reference> table.value[i].output).value, table.scope, origin);
					}
				}
			} else {
				for (let i = table.value.length - 1; i > -1; i--) {
					const row = table.value[i]
					let out = true;

					for (let e of row.conditions) {
						if (!this.#evalCondition(e, table.scope, origin, false)) {
							out = false;
							break;
						}
					}

					if (out) {
						if (typeof table.value[i].output === "string") {
							return <string> table.value[i].output;
						}

						return this.#followReference((<Reference> table.value[i].output).value, table.scope, origin);
					}
				}
			}

			if (typeof table.default === "string") {
				return table.default;
			}

			return this.#followReference(table.default.value, table.scope, origin);
		} else if (value.varType === "expression") {
			if (
				!("vars" in value) || 
					Object.keys((<ExpressionVar>value).vars).filter((i) => {
						typeof i !== "string" && !("varType" in i)
					}).length > 0
			) throw new TypeError(`Expression "vars" field must be of type {[name: string]: Value} (${value.scope}.${value.name})`);

			if (
				"functions" in value && (
					!((<ExpressionVar>value).functions instanceof Array) ||
					(<Value[]>(<ExpressionVar>value).functions).filter((i) => {
						typeof i !== "string" && !("varType" in i)
					}).length > 0)
			) throw new TypeError(`Expression "functions" field must be of type Value[] (${value.scope}.${value.name})`);

			let expr = value as ExpressionVar;
			let toParse: string;
			
			if (typeof expr.value === "string") {
				toParse = expr.value;
			} else {
				const followed = this.#followReference(expr.value, expr.scope, origin);

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
					} else {
						const func = this.#followReference(i, expr.scope, origin);
	
						if (func instanceof Array) {
							for (let e of func) {
								functions += `${e}; `;
							}

							continue;
						};
	
						if (func === "[MISSING REFERENCE]") {
							return `[MISSING ${i.value}]`;
						}
	
						functions += `${func}; `;
					}
				}
			}

			toParse = `${functions}${toParse}`;
			let parsed = this.parser.parse(toParse)

			let vars = parsed.variables();
			let input: {[name: string]: string} = {};

			// evaluate all variables to be passed into parsed.evaluate()
			for (let i of Object.keys(expr.vars)) {
				if (!vars.includes(i)) continue;

				const current = expr.vars[i];

				if (typeof current === "string") {
					input[i] = current;
					continue;
				}

				const followed = this.#followReference(current, expr.scope, origin);

				if (followed === "[MISSING REFERENCE]") return `[MISSING ${current}]`;
				
				input[i] = followed.toString();
			}

			return parsed.evaluate(input).toString();
		}

        return "[NOT IMPLEMENTED]";
    }

	/**
	 * Evaluates a condition from a table row, returning true or false
	 * @param {Condition} cond   - The condition to evaluate
	 * @param {string}    scope  - The scope paths will be evaluated relative to
	 * @param {string}    origin - For circular dependency detection
	 * @param {boolean}   full   - Whether operand values should be returned 
	 * @return {boolean} Whether the condition passes
	 */
	#evalCondition(cond: Condition, scope: string, origin: string, full: boolean): boolean | {output: boolean, val1: Literal, val2: Literal} {
		let val1;
		let val2;

		if (typeof cond.val1 === "string") {
			val1 = cond.val1;
		} else {
			val1 = cond.val1.value;
			val1 = this.#followReference(val1, scope, origin);
		}
		
		if (typeof cond.val2 === "string") {
			val2 = cond.val2;
		} else {
			val2 = cond.val2.value;
			val2 = this.#followReference(val2, scope, origin);
		}	

		if (cond.comparison === "eq") {
			if (!comparisons.eq(val1, val2)) {
				return !full ? false : {output: false, val1, val2};
			}
		} else if (cond.comparison === "lt") {
			if (!comparisons.lt(val1, val2)) {
				return !full ? false : {output: false, val1, val2};
			}
		} else if (cond.comparison === "gt") {
			if (!comparisons.gt(val1, val2)) {
				return !full ? false : {output: false, val1, val2};
			}
		} else if (cond.comparison === "in") {
			if (val2 instanceof Array) {
				if (!comparisons.in(val1, val2)) {
					return !full ? false : {output: false, val1, val2};
				}
			} else {
				// type mismatch
				return !full ? false : {output: false, val1, val2};
			}
		}

		return !full ? true : {output: true, val1, val2};
	}
	
	/**
	 * Evaluates and returns full data of a table, including all row outputs and condition operands
	 * @param {TableVar} table - Table to evaluate
	 * @returns {TableData} The fully evaluated table data
	 */
	#evaluateFull(table: TableVar): TableData {
		const output = {
			output: "",
			outIndex: -1,
			value: [],
			default: "",
			priority: table.priority
		} as TableData;

		const origin = this.getPath(table.name, table.scope);
		let found = false;

		for (let i = 0; i < table.value.length; i++) {
			const row = table.value[i];
			const rowData = {
				conditions: [],
				output: ""
			} as TableRowData;
			let out = true;

			for (let e of row.conditions) {
				const cond = <{output: boolean, val1: Literal, val2: Literal}> this.#evalCondition(e, table.scope, origin, true);

				rowData.conditions.push({val1: cond.val1, val2: cond.val2, comparison: e.comparison});

				if (!cond.output) {
					out = false;
				}
			}

			let rowOut;

			if (typeof row.output === "string") {
				rowOut = row.output;
			} else {
				rowOut = this.#followReference(row.output, table.scope, origin);
			}

			output.value.push({...rowData, output: rowOut});

			if (out && (!found || table.priority === "last")) {
				found = true;
				output.output = rowOut;
				output.outIndex = i;
			}
		}

		let defaultVal;

		if (typeof table.default === "string") {
			defaultVal = table.default;
		} else {
			defaultVal = this.#followReference(table.default.value, table.scope, origin);
		}

		output.default = defaultVal;

		if (!found) output.output = defaultVal;

		return output;
	}

    /**
     * Gets the path to a variable from its scope and name
     * @param {string} name             - The name of the variable
     * @param {string} [scope="global"] - The scope of the variable
     * @returns {string} The path to the variable
     */
    getPath(name: string, scope: string = "global"): string {
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

	/**
	 * 
	 * @param {string} path - 
	 * @returns 
	 */
    getVarAbstract(path: string): Var {
		const result = get(this.vars, this.normalizePath(path), null);

		if (isVar(result)) {
			return result;
		} else if (result) {
			throw new TypeError(`Variable ${path} is malformed`);
		}

		throw new ReferenceError(`Variable ${path} not found`);
    }

    /**
     * Gets a Var from a string path
     * @param {string} path - The path to the variable
     * @returns {Var} The Var found at scope.name
     */
    getRawVar(path: string): Var {
        return this.getVarAbstract(path);
    }

    /**
     * Gets a Var from a string path
     * @param {string} path - The path to the variable
	 * @param {boolean} full - Whether the variable should be fully evaluated if it's a table, will return 
     * @returns {Var} The Var found at the path
     */
	getVar(path: string, full?: boolean): Literal | TableData {
		const variable = this.getVarAbstract(path);

		if (full && variable.varType === "table") {
			return this.#evaluateFull(<TableVar> variable);
		}

		return this.#evaluate(variable, undefined, false);
	}

    /**
     * Normalizes a path relative to its scope.
     * Only takes into account "../" and the first and last period delimited values
     * Usually not needed if scope is global.
     * @param {string} path             - The path to normalize
     * @param {string} [scope="global"] - The scope the path is relative to
     * @returns {string} The normalized path
     */
    normalizePath(path: string, scope: string = "global"): string {
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

	#followReference(ref: Reference | string, scope: string, origin: string): Literal {
		if (typeof ref !== "string") {
			ref = ref.value;
		}

		try {
			const path = this.normalizePath(ref, scope);

			return this.#evaluate(this.getRawVar(path), origin, true);
		} catch (err) {
			if (err instanceof ReferenceError) {
				return("[MISSING REFERENCE]");
			} else {
				throw err;
			}
		}
	}
}
