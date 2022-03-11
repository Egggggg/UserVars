type Comparison = "eq" | "lt" | "gt" | "in";
type Priority = "first" | "last";
type BasicType = "var" | "literal";

/**
 * Mapping of variable names to their dependents
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
 * Value for list items and table outputs, should evaluate to a BasicVar
 */
export type Value = BasicVar | string

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
    comparison: Comparison
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
export type ValueRecipe = BasicRecipe | string

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

export class UserVars {
    deps: Deps;
    globalRoot: boolean;
    rawVars: RawVars;
    scopes: string[]
    vars: Vars;

    constructor(globalRoot: bool);
    addScope(name: string, overwrite: boolean = true): boolean;
    addVar(value: RawVar, overwrite: boolean = true): boolean;
    bulkBuild(vars: Object);
    buildBasic(value: {name: string, value: string, basicType: "var" | "literal"});
    buildList(value: {name: string, value: ValueRecipe[]});
    buildTable(value: {name: string, value: TableRecipe, default: ValueRecipe, priority: Priority});
    evaluate(value: RawVar): string | string[];
}
