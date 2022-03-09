export type Comparison = "eq" | "lt" | "gt" | "in";
export type Priority = "first" | "last";
export type BasicType = "var" | "literal";

export interface Deps {
    [key: string]: string[];
}

export interface RawVar {
    name: string;
    scope: string;
    value: any;
    varType: "basic" | "list" | "table";
}

export interface BasicVar extends RawVar {
    value: string;
    basicType: "var" | "literal";
    varType: "basic";
}

export type Value = BasicVar | string

export interface ListVar extends RawVar {
    value: Value[];
    varType: "list";
}

export interface Condition {
    val1: Value;
    comparison: Comparison
    val2: Value | ListVar;
}

export interface TableRow {
    conditions: Condition[];
    output: Value;
}

export interface TableVar extends RawVar {
    priority: Priority;
    default: Value;
    value: TableRow[];
    varType: "table";
}

export interface RawScope {
    [name: string]: RawVar;
}

export interface RawVars {
    [name: string]: RawVar;
    [name: string]: RawScope;
}

export interface Scope {
    [name: string]: string;
}

export interface Vars {
    [name: string]: string;
    [scope: string]: Scope;
}

export interface BasicRecipe {
    value: string;
    basicType: "var" | "literal";
}

export type ValueRecipe = BasicRecipe | string

export interface ConditionRecipe {
    val1: ValueRecipe;
    comparison: Comparison;
    val2: ValueRecipe | ValueRecipe[];
}

export interface RowRecipe {
    conditions: ConditionRecipe[];
    output: ValueRecipe;s
}

export type TableRecipe = RowRecipe[];

export class userVars {
    deps: Deps;
    rawVars: RawVars;
    scopes: string[]
    vars: Vars;

    constructor(globalRoot: bool, vars: Object);
    addScope(name: string);
    addVar(variable: RawVar);
    bulkBuild(vars: Object);
    buildBasic(value: {name: string, value: string, basicType: "var" | "literal"});
    buildList(value: {name: string, value: ValueRecipe[]});
    buildTable(value: {name: string, value: TableRecipe, default: ValueRecipe, priority: Priority});
}
