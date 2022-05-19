import { get } from "lodash";

type Comparison = "eq" | "lt" | "gt" | "in";
type Priority = "first" | "last";
type BasicType = "var" | "literal";

/**
 * Mapping of variable path to its dependents or dependencies
 */
export interface Deps {
    [key: string]: string[];
}

/**
 * Generic variable data
 */
export interface RawVar {
    name: string;
    scope: string;
    value: string | Value[] | TableRow[];
    varType: "basic" | "list" | "table";
}

/**
 * Should evaluate to either another variable's value or a string
 */
export interface BasicVar extends RawVar {
    value: string;
    basicType: "var" | "literal";
    varType: "basic";
}

/**
 * Value for list items and table outputs
 */
export type Value = BasicVar | string;

/**
 * Should evaluate to an array of BasicVars
 */
export interface ListVar extends RawVar {
    value: Value[];
    varType: "list";
}

/**
 * Condition for table rows, the row is output if this is true
 */
export interface Condition {
    val1: Value;
    comparison: Comparison;
    val2: Value | ListVar;
}

/**
 * Row for table, should evaluate to `output`
 */
export interface TableRow {
    conditions: Condition[];
    output: Value;
}

/**
 * Table variable, should evaluate to the single output of the first or last row where all conditions are true
 */
export interface TableVar extends RawVar {
    priority: Priority;
    default: Value;
    value: TableRow[];
    varType: "table";
}

/**
 * Array of RawVars under the same scope
 */
export interface RawScope {
    [name: string]: RawVar;
}

/**
 * Array of RawVars in the global scope and RawScopes containing RawVars
 */
export interface RawVars {
    [name: string]: RawVar | RawScope;
}

/**
 * Array of evaluated variables under the same scope
 */
export interface Scope {
    [name: string]: string | string[];
}

/**
 * Array of evaluated variables in the global scope and Scopes containing other evaluated variables
 */
export interface Vars {
    [name: string]: string | string[] | Scope;
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
 * Checks whether obj is a RawVar
 * @param obj Object to assert
 * @returns {boolean} Whether obj is a RawVar
 */
function isRawVar(obj: string | string[] | RawVar | RawScope | Scope): obj is RawVar {
	return typeof obj !== "string" && !(obj instanceof Array) && "varType" in obj && typeof obj.varType === "string";
}

/**
 * Creates a new UserVars object for holding user defined dynamic variables
 * @class
 * @property {Deps}     dependents   - Dependency map of {dependency: dependent[]}, used to cascade variable updates
 * @property {Deps}     dependencies - Dependency map of {dependent: dependency[]}, used to remove dependents from dependents and for finding dependency loops
 * @property {boolean}  globalRoot   - True if the global variables are contained at the root level, else false
 * @property {RawVars}  rawVars      - Raw, unevaluated variable data
 * @property {string[]} scopes       - List of scopes currently in use
 * @property {Vars}     vars         - Evaluated variables, maps name to string value
 */
export class UserVars {
    dependents: Deps;
	dependencies: Deps;
    globalRoot: boolean;
    maxRecursion: number;
    rawVars: RawVars;
    scopes: string[];
    vars: Vars;

    /**
     * Creates a new UserVars object for holding user defined dynamic variables
     * @param {boolean} globalRoot  - True if the global variables are contained at the root level, else false
     * @param {number} [maxRecursion=10] - Maximum number of times evaluate can call itself
     */
    constructor(globalRoot: boolean, maxRecursion?: number) {
        this.globalRoot = Boolean(globalRoot);
        this.maxRecursion = maxRecursion || 10;

        this.dependents = {};
		this.dependencies = {};
        this.rawVars = {};
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
            // there is nothing at this.rawVars[scope]
            // or
            // this.rawVars[scope] is a RawVar, not a RawScope, and should be overwritten
            if (
                !this.rawVars[scope] ||
                (overwrite && "varType" in this.rawVars[scope])
            ) {
                this.scopes.push(scope);
                this.rawVars[scope] = {};
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
     * Adds the passed variable to RawVars, and the evaluated value to vars.
     * This is done automatically with the build methods
     * @param {RawVar}  value            - Variable to add to the list
     * @param {boolean} [overwriteWithScope=true] - True if existing variable with conflicting name or scope should be overwritten
     * @returns {boolean} True if variable was set
     */
    setVar(value: RawVar, overwriteWithScope: boolean = true): boolean {
        // variable goes to root
        if (value.scope === "global" && this.globalRoot) {
            if (!this.rawVars[value.name] || overwriteWithScope) {
                this.rawVars[value.name] = value;

                this.#setEvaluated(
                    value.name,
                    value.scope,
                    this.evaluate(value)
                );

                try {
                    this.#updateDependents(this.getPath(value.name, value.scope));
                } catch (err) {
                    if (!(err instanceof ReferenceError)) {
                        throw err;
                    }
                }

                return true;
            }

            return false;
        } else {
            // variable goes to a scope

            // added or already existed
            if (this.#addScope(value.scope, overwriteWithScope)) {
                // can safely ignore because rawVars[value.scope] was made into a RawScope by #addScope
                // @ts-ignore
                this.rawVars[value.scope][value.name] = value;

                this.#setEvaluated(
					value.name,
					value.scope,
					this.evaluate(value)
				);

                try {
                    this.#updateDependents(this.getPath(value.name, value.scope));
                } catch (err) {
                    if (!(err instanceof ReferenceError)) {
                        throw err;
                    }
                }

                return true;
            } else {
                return false;
            }
        }
    }

    /**
     * Adds a dependent to a dependent list
     * @param {string} dependency - The absolute path to the dependent list to add to
     * @param {string} dependent  - The absolute path to the dependent to add
     * @private
     */
    #addDependent(dependency: string, dependent: string) {
        if (!this.dependents[dependency]) {
            this.dependents[dependency] = [];
        }

        this.dependents[dependency].push(dependent);
    }

    /**
     * Updates all dependents in a dependent list
     * Useful for when the dependency is changed
	 * @param {string}  path  - The path to the dependency
     * @param {boolean} clean - True if nonexistent dependents should be removed
     * @private
     */
    #updateDependents(
        path: string,
        clean: boolean = true
    ): void {
        let dependentList = this.dependents[path];

        if (!dependentList) {
			return;
        }

        // Thrown errors should get through, this method cannot proceed without success here
        this.getVar(path);
        let toClean = [];

        dependentList.forEach((dependent) => {
            let raw: RawVar;

            try {
                raw = this.getRawVar(dependent);

                this.setVar(raw);
            } catch (err) {
                if (err instanceof ReferenceError) {
                    if (clean) {
                        toClean.push(dependent);
                    }
                } else {
                    throw err;
                }
            }
        });
    }

    /**
     * Evaluates a RawVar into a string or string[]
     * @param {RawVar} value     - The value to evaluate
     * @param {number} [depth=0] - Current recursion depth
     * @returns {string | string[]} The evaluated value
     */
    evaluate(value: RawVar, depth?: number): string | string[] {
        if (!depth) {
            depth = 0;
        }

		const thisPath = this.getPath(value.name, value.scope);

        depth++;

        if (depth > this.maxRecursion) {
            return "[TOO MUCH RECURSION]";
        }

        if (value.varType === "basic") {
            const basic = value as BasicVar;

            if (basic.basicType === "literal") {
                return basic.value;
            }

            // basicType is var

            if (basic.value === this.getPath(basic.name, basic.scope)) {
                return "[CIRCULAR DEPENDENCY]";
            }

            const path = this.normalizePath(basic.value, basic.scope);
            const referenced = get(this.vars, path, null);

            // referenced is a variable
            if (typeof referenced === "string" || referenced instanceof Array) {
                this.#addDependent(path, thisPath);

				return referenced;
            } else if (referenced !== null) {
                // referenced is a Scope
                return "[VARIABLE POINTS TO SCOPE]";
            }

            // referenced is null

            const rawReferenced = get(this.rawVars, basic.value, null);

            // rawReferenced is a variable
            if (rawReferenced?.varType) {
                const varReferenced = rawReferenced as RawVar;

                this.#addDependent(path, thisPath);
                return this.evaluate(varReferenced, depth);
            } else if (rawReferenced !== null) {
                // rawReferenced is a RawScope
                return "[VARIABLE POINTS TO SCOPE]";
            }

            // rawReference is null
            this.#addDependent(path, thisPath);
            return "[MISSING REFERENCE]";
        } else if (value.varType === "list") {
			const output = [];
			const list = value as ListVar;

			list.value.forEach((e) => {
				if (typeof e === "string") {
					output.push(e);
				} else {
					this.#addDependent(e.value, thisPath);

					try {
						const current = this.getVar(e.value);
						output.push(current);
					} catch (err) {
						if (err instanceof ReferenceError) {
							output.push(e.value);
						} else {
							throw err;
						}
					}
				}
			});
		}

        return "[NOT YET IMPLEMENTED]";
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

    static getVarAbstract(
        object: Vars | RawVars,
        locator: string | {
            name: string;
            scope: string;
        }
    ): string | string[] | RawVar {
        if (typeof locator === "string") {
            const result = get(object, locator, null);

            if (typeof result === "string" || (result instanceof Array && result.filter((e) => typeof e !== "string").length > 0) || (result !== null && isRawVar(result))) {
				return result;
            }

			throw new ReferenceError(`Variable ${locator} not found`);
        } else {
			const { name, scope } = locator;
            const result = get(object, `${scope}.${name}`, null);

            if (typeof result === "string" || (result instanceof Array && result.filter((e) => typeof e !== "string").length > 0) || (result !== null && isRawVar(result))) {
				return result;
            }

			throw new ReferenceError(`Variable ${scope}.${name} not found`);
        }
    }

    /**
     * Gets an evaluated variable from a string path
     * @param {string} locator - The path to the variable
     * @returns {string | string[]} The value found at locator
     */
    getVar(locator: string): string | string[];

    /**
     * Gets an evaluated variable from a name and a scope, under scope.name
     * @param {Object} locator - The container object for the actual parameters
     * @param {string} locator.name  - The name of the variable
     * @param {string} locator.scope - The scope the variable is under
     * @returns {string | string[]} The value found at scope.name
     */
    getVar(locator: { name: string; scope: string }): string | string[];

    /**
     * Gets an evaluated variable from a path or a name and a scope
     * @param {Object | string} locator - The container object for the parameters, or the path
     * @param {string} locator.name     - The name of the variable
     * @param {string} locator.scope    - The scope the variable is under
     * @returns {string | string[]} The value found at scope.name or path
     */
    getVar(
        locator?:
            | string
            | {
                  name: string;
                  scope: string;
              }
    ): string | string[] {
        // @ts-ignore
        return UserVars.getVarAbstract(this.vars, locator);
    }

    /**
     * Gets a RawVar from a string path
     * @param {string} locator - The path to the variable
     * @returns {RawVar} The RawVar found at the locator
     */
    getRawVar(locator: string): RawVar;

    /**
     * Gets a RawVar from a name and a scope, under scope.name
     * @param {Object} locator - The container object for the actual parameters
     * @param {string} locator.name  - The name of the variable
     * @param {string} locator.scope - The scope the variable is under
     * @returns {RawVar} The RawVar found at scope.name
     */
    getRawVar(locator: { name: string; scope: string }): RawVar;

    /**
     * Gets a RawVar from a path or a name and a scope
     * @param {Object | string} locator - The container object for the actual parameters, or the absolute path
     * @param {string} locator.name     - The name of the variable
     * @param {string} locator.scope    - The scope the variable is under
     * @returns {RawVar} The variable found at scope.name or locator
     */
    getRawVar(
        locator?:
            | string
            | {
                  name: string;
                  scope: string;
              }
    ): RawVar {
        // @ts-ignore
        return UserVars.getVarAbstract(this.rawVars, locator);
    }

    /**
     * Sets the evaluated value of a variable in the vars map
     * @param {string} name             - The name of the variable to set
     * @param {string} scope            - The scope of the variable to set
     * @param {string | string[]} value - The value of the variable to set
     */
    #setEvaluated(name: string, scope: string, value: string | string[]) {
        if (scope === "global" && this.globalRoot) {
            this.vars[name] = value;
        } else {
            this.#addScope(scope);
            // @ts-ignore
            this.vars[scope][name] = value;
        }
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
