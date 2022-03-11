import { BasicVar, Deps, ListVar, RawVar, RawVars, TableVar, Vars } from "./index.d";

/**
 * Creates a new UserVars object for holding user defined dynamic variables
 * @class
 * @property {Deps}     deps       - Dependency map that gets checked when variables are updated
 * @property {boolean}  globalRoot - True if the global variables are contained at the root level, else false
 * @property {RawVars}  rawVars    - Raw, unevaluated variable data
 * @property {string[]} scopes     - List of scopes currently in use
 * @property {Vars}     vars       - Evaluated variables, maps name to string value
 */
export default class UserVars {
    deps: Deps;
    globalRoot: boolean;
    rawVars: RawVars;
    scopes: string[];
    vars: Vars;

    /**
     * Creates a new UserVars object for holding user defined dynamic variables
     * @param {boolean} globalRoot  - True if the global variables are contained at the root level, else false
     */
    constructor(globalRoot: boolean) {
        this.globalRoot = Boolean(globalRoot);

        this.deps = {};
        this.rawVars = {};
        this.scopes = [];
        this.vars = {};
    }

    /**
     * Adds the passed scope to the list. This is done automatically with addVar and the build methods
     * @param {string}  scope     - Name of the scope to add to the list
     * @param {boolean} overwrite - True if existing global variables with conflicting name should be overwritten
     * @returns {boolean} True if scope was added or already existed
     */
    #addScope(scope: string, overwrite: boolean = true): boolean {
        // scope is not in this.scopes
        if (this.scopes.indexOf(scope) === -1) {
            // there is nothing at this.rawVars[scope]
            // or
            // this.rawVars[scope] is a RawVar, not a RawScope, and should be overwritten
            if (!this.rawVars[scope] || (overwrite && this.rawVars[scope]?.varType)) {
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
     * Adds the passed variable to the list. This is done automatically with the build methods
     * @param {RawVar}  value  - Variable to add to the list
     * @param {boolean} overwrite - True if existing variable with conflicting name or scope should be overwritten
     * @returns {boolean} True if variable was set
     */
    addVar(value: RawVar, overwrite: boolean = true): boolean {
        // variable goes to root
        if (value.scope === "global" && this.globalRoot) {
            // variable doesn't exist yet
            if (!this.rawVars[value.name]) {
                this.rawVars[value.name] = value;
                this.vars[value.name] = this.evaluate(value);
                return true;
            } else {
                // variable exists and should be overwritten
                if (overwrite) {
                    this.rawVars[value.name] = value;
                    this.vars[value.name] = this.evaluate(value);
                    return true;
                }
            }

            return false;
        } else { // variable goes to a scope
            // added or already existed
            if (this.#addScope(value.scope, overwrite)) {
                // can safely ignore because this.rawVars[variable.scope] was made into a RawScope by this.#addScope
                // @ts-ignore
                this.rawVars[value.scope][value.name] = value;
                // @ts-ignore
                this.rawVars[value.scope][value.name] = this.evaluate(value);
                return true;
            } else {
                return false;
            }
        }
    }

    /**
     * Evaluates a RawVar into a string or string[]
     * @param {RawVar} value - Value to evaluate
     * @returns {string | string[]} Evaluated value
     */
    evaluate(value: RawVar): string | string[] {
        if (value.varType === "basic") {
            value = value as BasicVar;

        }
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
}