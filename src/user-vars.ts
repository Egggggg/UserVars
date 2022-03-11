import { Deps, RawVar, RawVars, Vars } from "./index.d";

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
    #addScope(scope: string, overwrite: boolean = true) {
        // scope is not in this.scopes
        if (this.scopes.indexOf(scope) === -1) {
            // there is nothing at this.rawVars[scope]
            // or
            // overwrite is true and this.rawVars[scope] is a RawVar, not a RawScope
            if (!this.rawVars[scope] || (overwrite && this.rawVars[scope]?.varType)) {
                this.scopes.push(scope);
                this.rawVars[scope] = {};
                this.vars[scope] = {};

                return true;
            }
        } else {
            return true;
        }

        return false;
    }

    /**
     * Adds the passed variable to the list. This is done automatically with the build methods
     * @param {RawVar}  variable  - Variable to add to the list
     * @param {boolean} overwrite - True if existing variable with conflicting name or scope should be overwritten
     * @returns {boolean} True if variable was added
     */
    addVar(variable: RawVar, overwrite: boolean = true) {
        // variable goes to root
        if (variable.scope === "global" && this.globalRoot) {
            // variable doesn't exist yet
            if (!this.rawVars[variable.name]) {
                this.rawVars[variable.name] = variable;
                return true;
            } else {
                // variable exists and should be overwritten
                if (overwrite) {
                    this.rawVars[variable.name] = variable;
                    return true;
                }
            }

            return false;
        } else { // variable goes to a scope
            this.#addScope(variable.scope, overwrite);

            // rawVars[variable.scope] will always be a Scope object because if it isn't it will be made one by #addScope
            // @ts-ignore
            this.rawVars[variable.scope][variable.name] = variable;
        }
    }

    /**
     * Gets the path to a variable from its scope and name
     * @param {string} name             - The name of the variable
     * @param {string} [scope="global"] - The scope of the variable
     */
    getPath(name: string, scope?: string) {
        if (!scope) {
            scope = "global";
        }

        if (scope !== "global") {
            if (name.startsWith("../")) {
                if (this.globalRoot) {
                    return name.replace("../", "");
                }

                return `global.${name.replace("../", "")}`;
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