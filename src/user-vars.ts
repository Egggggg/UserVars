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
     * @param {string} scope - Name of the scope to add to the list
     */
    #addScope(scope: string) {
        if (this.scopes.indexOf(scope) === -1) {
            this.scopes.push(scope);
        }

        this.rawVars[scope] = this.rawVars[scope] || [];
        this.vars[scope] = this.vars[scope] || [];
    }

    /**
     * Adds the passed variable to the list. This is done automatically with the build methods
     * @param {RawVar} variable - Variable to add to the list
     */
    addVar(variable: RawVar) {
        this.#addScope(variable.scope);

        this.rawVars[variable.scope][variable.name] = variable;
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