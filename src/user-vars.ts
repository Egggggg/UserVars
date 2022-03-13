import {BasicVar, Deps, RawVar, RawVars, Vars} from "./index.d";
import {get} from "lodash";

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

        this.deps = {};
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
     * Adds the passed variable to the RawVars, and the evaluated value to vars.
     * This is done automatically with the build methods
     * @param {RawVar}  value  - Variable to add to the list
     * @param {boolean} [overwrite=true] - True if existing variable with conflicting name or scope should be overwritten
     * @returns {boolean} True if variable was set
     */
    addVar(value: RawVar, overwrite: boolean = true): boolean {
        // variable goes to root
        if (value.scope === "global" && this.globalRoot) {
            // variable doesn't exist yet
            if (!this.rawVars[value.name]) {
                this.rawVars[value.name] = value;
                this.evaluate(value);
                return true;
            } else if (overwrite) {
                this.rawVars[value.name] = value;
                this.evaluate(value);
                return true;
            }

            return false;
        } else { // variable goes to a scope
            // added or already existed
            if (this.#addScope(value.scope, overwrite)) {
                // can safely ignore because rawVars[value.scope] and vars[value.scope] were made into a RawScope by #addScope
                // @ts-ignore
                this.rawVars[value.scope][value.name] = value;
                this.evaluate(value);
                return true;
            } else {
                return false;
            }
        }
    }

    /**
     * Evaluates a RawVar into a string or string[] and puts the result in the vars object
     * @param {RawVar} value     - Value to evaluate
     * @param {number} [depth=0] - Current recursion depth
     * @returns {string | string[]} Evaluated value
     */
    evaluate(value: RawVar, depth?: number): string | string[] {
        if (!depth) {
            depth = 0;
        }

        depth++;

        if (depth > this.maxRecursion) {
            return "[TOO MUCH RECURSION]";
        }

        if (value.varType === "basic") {
            const basic = value as BasicVar;

            if (basic.basicType === "literal") {
                this.setEvaluated(basic.name, basic.scope, basic.value);
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
                this.setEvaluated(basic.name, basic.scope, referenced);
                return referenced;
            } else if (referenced !== null) { // referenced is a Scope
                return "[VARIABLE POINTS TO SCOPE]";
            }

            // referenced is null
            const rawReferenced = get(this.rawVars, basic.value, null);

            // rawReferenced is a variable
            if (rawReferenced?.varType) {
                const varReferenced = rawReferenced as RawVar;

                const evaluated = this.evaluate(varReferenced, depth);

                this.setEvaluated(basic.name, basic.scope, evaluated);

                return evaluated;
            } else if (rawReferenced !== null) { // rawReferenced is a RawScope
                return "[VARIABLE POINTS TO SCOPE]";
            }

            // rawReference is null
            return "[MISSING REFERENCE]";
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

    /**
     * Gets an evaluated variable from a string path
     * @param {string} path - The path to the variable
     * @returns {string | string[]} The value found at the path
     */
    getVar(path: string): string | string[];

    /**
     * Gets an evaluated variable from a name and a scope, under scope.name
     * @param {string} name  - The name of the variable
     * @param {string} scope - The scope the variable is under
     * @returns {string | string[]} The value found at scope.name
     */
    getVar(name: string, scope: string): string | string[];

    /**
     * Gets an evaluated variable from a path or a name and a scope
     * @param {string} path  - The path to the variable
     * @param {string} name  - The name of the variable
     * @param {string} scope - The scope the variable is under
     * @returns {string | string[]} The value found at scope.name or path
     */
    getVar(path?: string, name?: string, scope?: string): string | string[] {
        if (path) {
        }

        throw new ReferenceError("pass either path or name and scope");
    }

    /**
     * Gets a RawVar from a string path
     * @param {string} path - The path to the variable
     * @returns {RawVar} The RawVar found at the path
     */
    getRawVar(path: string): RawVar;

    /**
     * Gets a RawVar from a name and a scope, under scope.name
     * @param {string} name  - The name of the variable
     * @param {string} scope - The scope the variable is under
     * @returns {RawVar} The RawVar found at scope.name
     */
    getRawVar(name: string, scope: string): RawVar;

    /**
     * Gets a RawVar from a path or a name and a scope
     * @param {string} path  - The path to the variable
     * @param {string} name  - The name of the variable
     * @param {string} scope - The scope the variable is under
     * @returns {RawVar} The variable found at scope.name or path
     */
    getRawVar(path?: string, name?: string, scope?: string): RawVar {
        throw new ReferenceError("pass either path or name and scope");
    }

    /**
     * Sets the evaluated value of a variable in the vars map
     * @param {string} name             - The name of the variable to set
     * @param {string} scope            - The scope of the variable to set
     * @param {string | string[]} value - The value of the variable to set
     */
    setEvaluated(name: string, scope: string, value: string | string[]) {
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

        // remove multiple spaces in a row
        path = path.replace(/\.+/, ".");

        let split = path.split(".");
        const multipleParts = split.length > 1;

        split = [split[0], split[split.length - 1]];

        if ((scope === "global" || up) && !this.globalRoot && !multipleParts) {
            return `global.${split[0]}`;
        }

        if (!multipleParts) {
            return `${scope}.${split[0]}`;
        }

        return split.join(".");
    }
}