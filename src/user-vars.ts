import { get } from "lodash";

type Comparison = "eq" | "lt" | "gt" | "in";
type Priority = "first" | "last";
type BasicType = "var" | "literal";
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
    value: string | Value[] | TableRow[];
    varType: "basic" | "list" | "table";
}

/**
 * Should evaluate to either another variable's value or a string
 */
export interface BasicVar extends Var {
    value: string;
    basicType: BasicType;
    varType: "basic";
}

/**
 * Reference to a variable, used in lists and tables
 */
export interface Reference {
	value: string;
	varType: "ref"
}

/**
 * Value for list items and table outputs
 */
export type Value = Reference | string;

/**
 * Should evaluate to an array of BasicVars
 */
export interface ListVar extends Var {
    value: Value[];
    varType: "list";
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
	conditions: Condition[];
	output: Literal;
}

/**
 * Table variable, should evaluate to the single output of the first or last row where all conditions are true
 */
export interface TableVar extends Var {
    priority: Priority;
    default: Value;
    value: TableRow[];
    varType: "table";
}

/**
 * Evaluated table data returned from full table output
 */
export interface TableData {
	out: Literal;
	outIndex: number;
	values: TableRowData[];
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
 * Object that should be deserialized into a BasicVar
 */
export interface BasicRecipe {
    value: string;
    basicType: "var" | "literal";
}

/**
 * Object or string to deserialize into a BasicVar
 */
export type ValueRecipe = BasicRecipe | string;

/**
 * Object that should be deserialized into a Condition
 */
export interface ConditionRecipe {
    val1: ValueRecipe;
    comparison: Comparison;
    val2: ValueRecipe | ValueRecipe[];
}

/**
 * Object that should be deserialized into a TableRow
 */
export interface RowRecipe {
    conditions: ConditionRecipe[];
    output: ValueRecipe;
}

/**
 * Array of RowRecipes to deserialize into a TableVar
 */
export type TableRecipe = RowRecipe[];

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
	eq: (arg1: Literal, arg2: Literal) => arg1 === arg2,
	lt: (arg1: string, arg2: string) => parseFloat(arg1) < parseFloat(arg2),
	gt: (arg1: string, arg2: string) => parseFloat(arg1) > parseFloat(arg2),
	"in": (arg1: string, arg2: string[]) => arg2.indexOf(arg1) > -1
};
/**
 * Creates a new UserVars object for holding user defined dynamic variables
 * @class
 * @property {boolean}  globalRoot   - True if the global variables are contained at the root level, else false
 * @property {string[]} scopes       - List of scopes currently in use
 * @property {Vars}     vars         - Variable mapping, {name: value}, scoped vars are nested into scope name
 */
export class UserVars {
    globalRoot: boolean;
    scopes: string[];
    vars: Vars;

    /**
     * Creates a new UserVars object for holding user defined dynamic variables
     * @param {boolean} globalRoot  - True if the global variables are contained at the root level, else false
     */
    constructor(globalRoot: boolean) {
        this.globalRoot = Boolean(globalRoot);

        this.scopes = [];
        this.vars = {};
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
     * @param {Var}  value                         - Variable to add to the list
     * @param {boolean} [overwriteWithScope=false] - True if existing variable with conflicting name or scope should be overwritten
     * @returns {boolean} True if variable was set
     */
    setVar(value: Var, overwriteWithScope: boolean = false): boolean {
        // variable goes to root
        if (value.scope === "global" && this.globalRoot) {
            if (!this.vars[value.name] || overwriteWithScope) {
                this.vars[value.name] = value;
                return true;
            }

            return false;
        } else { // variable goes to a scope
            // added or already existed
            if (this.#addScope(value.scope, overwriteWithScope)) {
                // can safely ignore because Vars[value.scope] was made into a RawScope by #addScope
                // @ts-ignore
                this.vars[value.scope][value.name] = value;
                return true;
            } else { // couldn't add
                return false;
            }
        }
    }

    /**
     * Evaluates a Var into a string or string[]
     * @param {Var} value         - The value to evaluate
     * @param {string} origin     - The original var's path for circular dependency detection
     * @returns {Literal} The evaluated value
     */
    evaluate(value: Var, origin?: string): Literal {
		const thisPath = this.getPath(value.name, value.scope);

        if (origin === thisPath) {
            return "[CIRCULAR DEPENDENCY]";
        }

		if (!origin) {
			origin = thisPath;
		}

        if (value.varType === "basic") {
            const basic = value as BasicVar;

            if (basic.basicType === "literal") {
                return basic.value;
            }

            const path = this.normalizePath(basic.value, basic.scope);
            const referenced = get(this.vars, path, null);

            // referenced is a variable
            if (isVar(referenced)) {
				return this.evaluate(referenced, origin);
            } else if (referenced !== null) {
                // referenced is a Scope
                return "[VARIABLE POINTS TO SCOPE]";
            }

            return "[MISSING REFERENCE]";
        } else if (value.varType === "list") {
			const output: string[] = [];
			const list = value as ListVar;

			list.value.forEach((e) => {
				if (typeof e === "string") {
					output.push(e);
				} else {
					try {
						const path = this.normalizePath(e.value, list.scope);
						const current = this.evaluate(this.getRawVar(path), origin);

						if (current instanceof Array) {
							output.push(`[LIST ${e.value}]`);
						} else {
							output.push(current);
						}
					} catch (err) {
						if (err instanceof ReferenceError) {
							output.push(`[${e.value}]`);
						} else {
							throw err;
						}
					}
				}
			});
			
			return output;
		} else if (value.varType === "table") {
			const table = value as TableVar;

			if (table.priority === "first") {
				for (let i = 0; i < table.value.length; i++) {
					const row = table.value[i]
					let out = true;

					for (let e of row.conditions) {
						if (!this.#evalCondition(e, table)) {
							out = false;
							break;
						}
					}

					if (out) {
						if (typeof table.value[i].output === "string") {
							return <string> table.value[i].output;
						} else {
							const path = this.normalizePath((<Reference> table.value[i].output).value, table.scope)

							return this.evaluate(this.getRawVar(path), origin);
						}
					}
				}
			} else {
				for (let i = table.value.length - 1; i > 0; i--) {
					const row = table.value[i]
					let out = true;

					for (let e of row.conditions) {
						if (!this.#evalCondition(e, table)) {
							out = false;
							break;
						}
					}

					if (out) {
						if (typeof table.value[i].output === "string") {
							return <string> table.value[i].output;
						} else {
							const path = this.normalizePath((<Reference> table.value[i].output).value, table.scope)

							return this.evaluate(this.getRawVar(path), origin);
						}
					}
				}
			}
		}

        return "[NOT IMPLEMENTED]";
    }

	/**
	 * Evaluates a condition from a table row, returning true or false
	 * @param {Condition} cond - The condition to evaluate
	 * @return {boolean} Whether the condition passes
	 */
	#evalCondition(cond: Condition, table: TableVar): boolean {
		let val1;
		let val2;

		if (typeof cond.val1 === "string") {
			val1 = cond.val1;
		} else {
			val1 = cond.val1.value;
			val1 = this.normalizePath(val1, table.scope);
			val1 = this.evaluate(this.getRawVar(val1), origin);
		}
		
		if (typeof cond.val2 === "string") {
			val2 = cond.val2;
		} else {
			val2 = cond.val2.value;
			val2 = this.normalizePath(val2, table.scope);
			val2 = this.evaluate(this.getRawVar(val2), origin)
		}	

		if (cond.comparison === "eq") {
			if (!comparisons.eq(val1, val2)) {
				return false
			}
		} else if (cond.comparison === "gt") {
			if (typeof val1 === "string" && typeof val2 === "string") {
				if (!comparisons.gt(val1, val2)) {
					return false
				}
			} else {
				// type mismatch
				return false;
			}
		} else if (cond.comparison === "lt") {
			if (typeof val1 === "string" && typeof val2 === "string") {
				if (!comparisons.lt(val1, val2)) {
					return false
				}
			} else {
				// type mismatch
				return false;
			}
		} else if (cond.comparison === "in") {
			if (typeof val1 === "string" && val2 instanceof Array) {
				if (!comparisons.in(val1, val2)) {
					return false
				}
			} else {
				// type mismatch
				return false;
			}
		}

		return true;
	}
	
    /**
     * Gets the path to a variable from its scope and name
     * @param {string} name             - The name of the variable
     * @param {string} [scope="global"] - The scope of the variable
     * @returns {string} The path to the variable, accounting for globalRoot and
     */
    getPath(name: string, scope?: string): string {
        if (!scope) {
            scope = "global";
        }

        if (scope !== "global") {
            // return to global
            if (name.startsWith("../")) {
                name = name.replace("../", "");

                // global is root, so return the name at root
                // or
                // name already includes a scope, so include it
                if (this.globalRoot || name.indexOf(".") > -1) {
                    return name;
                }

                return `global.${name}`;
            }

            return `${scope}.${name}`;
        } else {
            if (this.globalRoot) {
                return name;
            }

            return `global.${name}`;
        }
    }

    getVarAbstract(
        locator: string | {
            name: string;
            scope: string;
        }
    ): Var {
        if (typeof locator !== "string") {
			locator = `${locator.scope}.${locator.name}`;
        }

		const result = get(this.vars, locator, null);

		if (isVar(result)) {
			return result;
		} else if (result) {
			throw new ReferenceError(`${locator} points to a scope`);
		}

		throw new ReferenceError(`Variable ${locator} not found`);
    }

    /**
     * Gets a Var from a string path
     * @param {string} locator - The path to the variable
     * @returns {Var} The Var found at the locator
     */
    getRawVar(locator: string): Var;

    /**
     * Gets a Var from a name and a scope, under scope.name
     * @param {Object} locator - The container object for the actual parameters
     * @param {string} locator.name  - The name of the variable
     * @param {string} locator.scope - The scope the variable is under
     * @returns {Var} The Var found at scope.name
     */
    getRawVar(locator: { name: string; scope: string }): Var;

    /**
     * Gets a Var from a path or a name and a scope
     * @param {Object | string} locator - The container object for the actual parameters, or the absolute path
     * @param {string} locator.name     - The name of the variable
     * @param {string} locator.scope    - The scope the variable is under
     * @returns {Var} The variable found at scope.name or locator
     */
    getRawVar(
        locator?:
            | string
            | {
                  name: string;
                  scope: string;
              }
    ): Var {
        // @ts-ignore
        return this.getVarAbstract(locator);
    }

    /**
     * Gets a Var from a string path
     * @param {string} locator - The path to the variable
	 * @param {boolean} full - Whether the variable should be fully evaluated if it's a table, will return 
     * @returns {Var} The Var found at the locator
     */
	 getVar(locator: string, full?: boolean): Literal;

	 /**
	  * Gets a Var from a name and a scope, under scope.name
	  * @param {Object} locator - The container object for the actual parameters
	  * @param {string} locator.name  - The name of the variable
	  * @param {string} locator.scope - The scope the variable is under
	  * @param {boolean} full - Whether the variable should be fully evaluated if it's a table, will return 
	  * @returns {Var} The Var found at scope.name
	  */
	 getVar(locator: { name: string; scope: string }, full?: boolean): Literal;
 
	 /**
	  * Gets a Var from a path or a name and a scope
	  * @param {Object | string} locator - The container object for the actual parameters, or the absolute path
	  * @param {string} locator.name     - The name of the variable
	  * @param {string} locator.scope    - The scope the variable is under
	  * @param {boolean} full - Whether the variable should be fully evaluated if it's a table, will return 
	  * @returns {Var} The variable found at scope.name or locator
	  */
	 getVar(
		locator:
			| string
			| {
				name: string;
				scope: string;
			},
		full?: boolean
	 ): Literal {
		 // @ts-ignore
		 const variable = this.getVarAbstract(locator);

		 // if (variable.varType !== "table" || !full) {
			return this.evaluate(variable);
		 // }
	 }

    /**
     * Normalizes a path relative to its scope.
     * Only takes into account "../" and the first and last period delimited values
     * Usually not needed if scope is global.
     * @param {string} path             - The path to normalize
     * @param {string} [scope="global"] - The scope the path is relative to
     * @returns {string} The normalized path
     */
    normalizePath(path: string, scope?: string): string {
        if (!scope) {
            scope = "global";
        }

        let up = false;

        if (path.startsWith("../") && scope !== "global") {
            up = true;
            path = path.replace("../", "");
        }

        // remove multiple periods in a row
        path = path.replace(/\.+/, ".");

        let split = path.split(".");
        const multipleParts = split.length > 1;

        split = [split[0], split[split.length - 1]];

        if ((scope === "global" || up) && !multipleParts) {
            if (!this.globalRoot) {
                return `global.${split[0]}`;
            }

            return split[0];
        }

        if (!multipleParts) {
            return `${scope}.${split[0]}`;
        }

        return split.join(".");
    }
}
