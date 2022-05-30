const { UserVars } = require("uservars");

const userVars = new UserVars();

// resolves to "nice"
const basic = {
	name: "basicVar", // could be anything matching /^[A-Z\d_]+$/i
	scope: "global", // could be anything matching /^[A-Z\d_]+$/i
	value: "nice", // could be any string
	varType: "basic" // must be "basic"
};

// resolves to ["nice", "cool", "very good", "yeah"]
const list = {
	name: "listVar",
	scope: "global",
	value: ["nice", "cool", "very good", "yeah"],
	varType: "list"
};

// resolves to "this one!"
const table = {
	name: "tableVar",
	scope: "global",
	value: [
		{
			output: "this one!",
			conditions: [
				{
					val1: "10",
					comparison: "eq",
					val2: "10"
				}
			]
		},
		{
			output: "not a chance",
			conditions: [
				{
					val1: "0",
					comparison: "eq",
					val2: "10"
				}
			]
		}
	],
	varType: "table",
	default: "not happening",
	priority: "first"
};

// resolves to 1003
const expression = {
	name: "expressionVar",
	scope: "global",
	value: "f(x) + (12 / y)",
	varType: "expression",
	vars: {
		x: "100",
		y: "4"
	},
	functions: ["f(x) = x * 10"]
};

// evaluates to "nice"
const basicLiteral = {
	name: "basicVar",
	scope: "global",
	value: "nice",
	varType: "basic"
};

// basic references basic
// evaluates to "nice"
const basicRef = {
	name: "basicRef",
	scope: "global",
	value: {
		value: "basicVar",
		reference: true
	},
	varType: "basic"
};

// resolves to ["nice", "cool", "very good", "yeah"]
const listLiteral = {
	name: "listVar",
	scope: "global",
	value: ["nice", "cool", "very good", "yeah"],
	varType: "list"
};

// list references list
// resolves to ["epic", "nice", "cool", "very good", "yeah", "awesome"]
const listRef = {
	name: "listRef",
	scope: "global",
	value: ["epic", { value: "listVar", reference: true }, "awesome"],
	varType: "list"
};

// evaluates to "f(x) = x + 15"
const basicScoped = {
	name: "var",
	scope: "func",
	value: "f(x) = x + 15",
	varType: "basic"
};

// expression references differently scoped function
// evaluates to 45
const expressionScoped = {
	name: "var",
	scope: "math",
	value: "f(x)",
	varType: "expression",
	functions: [
		{
			value: "../func.var"
		}
	],
	vars: {
		x: "30"
	}
};

// can either add variables one at a time with the option to let scopes and variables overwrite eachother...
userVars.setVar(basic);

// or set them in bulk with no options
userVars.setVarBulk(
	list,
	table,
	expression,
	basicLiteral,
	basicRef,
	listLiteral,
	listRef,
	basicScoped,
	expressionScoped
);

// if you're running this, change this value to the path to a
// variable you want to evaluate
const path = "basic";

console.log(userVars.getVar(path));
