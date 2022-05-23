import { UserVars, BasicVar, ListVar, TableVar } from "./user-vars";

const basicGlobalLiteral = {
    name: "nice",
    scope: "global",
    value: "69",
    varType: "basic",
    basicType: "literal"
} as BasicVar;

const basicGlobalLiteral2 = {
    name: "nice",
    scope: "global",
    value: "6969",
    varType: "basic",
    basicType: "literal"
} as BasicVar;

const basicGlobalVar = {
    name: "niceVar",
    scope: "global",
    value: "nice",
    varType: "basic",
    basicType: "var"
} as BasicVar;

const basicGlobalVar2 = {
    name: "niceVar2",
    scope: "global",
    value: "niceVar",
    varType: "basic",
    basicType: "var"
} as BasicVar;

const basicScopedLiteral = {
    name: "nice",
    scope: "scope1",
    value: "6969",
    varType: "basic",
    basicType: "literal"
} as BasicVar;

const basicScopedVar = {
    name: "niceVar",
    scope: "scope1",
    value: "nice",
    varType: "basic",
    basicType: "var"
} as BasicVar;

const basicCircular = {
    name: "var",
    scope: "global",
    value: "var",
    varType: "basic",
    basicType: "var"
} as BasicVar;

const basicCircular1 = {
	name: "var1",
	scope: "global",
	value: "var2",
	varType: "basic",
	basicType: "var"
} as BasicVar;

const basicCircular2 = {
	name: "var2",
	scope: "global",
	value: "scope.var3",
	varType: "basic",
	basicType: "var"
} as BasicVar;

const basicCircular3 = {
	name: "var3",
	scope: "scope",
	value: "../var4",
	varType: "basic",
	basicType: "var"
} as BasicVar;

const basicCircular4 = {
	name: "var4",
	scope: "global",
	value: "var1",
	varType: "basic",
	basicType: "var"
} as BasicVar;

const listOfLiterals = {
	name: "list",
	scope: "global",
	value: [
		"nice",
		"nice2",
		"nice3",
		"nice4",
		"69 (nice)"
	],
	varType: "list"
} as ListVar;

const listMixed = {
	name: "list",
	scope: "global",
	value: [
		"nice",
		{
			value: "nice",
			varType: "reference"
		},
		{
			value: "scope1.nice",
			varType: "reference"
		},
		"fuck yes"
	],
	varType: "list"
} as ListVar;

const basicChaosScope = {
	name: "nice",
	scope: "chaos",
	value: "chaos city",
	varType: "basic",
	basicType: "literal"
} as BasicVar;

const listRefScoped = {
	name: "list",
	scope: "chaos",
	value: [
		{
			value: "../nice",
			varType: "reference"
		},
		{
			value: "../scope1.nice",
			varType: "reference"
		},
		{
			value: "nice",
			varType: "reference"
		}
	],
	varType: "list"
} as ListVar;

const listCircular = {
	name: "list",
	scope: "global",
	value: [
		"nice",
		"nice 69",
		{
			value: "var2",
			varType: "reference"
		},
		"nice yeah cool and good"
	],
	varType: "list"
} as ListVar;

const basicListCircular = {
	name: "var2",
	scope: "global",
	value: "list",
	varType: "basic",
	basicType: "var"
} as BasicVar;

const tableLiteral = {
	name: "default",
	scope: "global",
	value: [
		{
			output: "me!",
			conditions: [
				{
					val1: "1",
					comparison: "eq",
					val2: "1"
				}
			]
		}
	],
	varType: "table",
	priority: "first",
	default: "shouldn't"
} as TableVar;

const tableMulti = {
	name: "table",
	scope: "global",
	value: [
		{
			output: "eq",
			conditions: [
				{
					val1: {
						value: "var",
						varType: "reference"
					},
					comparison: "eq",
					val2: "69"
				}
			]
		},
		{
			output: "lt",
			conditions: [
				{
					val1: {
						value: "var",
						varType: "reference"
					},
					comparison: "lt",
					val2: "69"
				}
			]
		},
		{
			output: "gt",
			conditions: [
				{
					val1: {
						value: "var",
						varType: "reference"
					},
					comparison: "gt",
					val2: "69"
				}
			]
		},
		{
			output: "in",
			conditions: [
				{
					val1: {
						value: "var",
						varType: "reference"
					},
					comparison: "in",
					val2: {
						value: "listOfWords",
						varType: "reference"
					}
				}
			]
		}
	],
	varType: "table",
	priority: "first",
	default: "default"
} as TableVar;

const basicTableEq = {
	name: "var",
	scope: "global",
	value: "69",
	varType: "basic",
	basicType: "literal"
} as BasicVar;

const basicTableLt = {
	name: "var",
	scope: "global",
	value: "0",
	varType: "basic",
	basicType: "literal"
} as BasicVar;

const basicTableGt = {
	name: "var",
	scope: "global",
	value: "100",
	varType: "basic",
	basicType: "literal"
} as BasicVar;

const basicTableIn = {
	name: "var",
	scope: "global",
	value: "words",
	varType: "basic",
	basicType: "literal"
} as BasicVar;

const listTableWords = {
	name: "listOfWords",
	scope: "global",
	value: [
		"cool",
		"words",
		"are",
		"good"
	],
	varType: "list"
} as ListVar;

describe("globalRoot true", () => {
    let userVars: UserVars;

    beforeEach(() => {
        userVars = new UserVars(true);
    });

    describe("addVar", () => {
		describe("Basic", () => {
			test("BasicVar literal", () => {
				userVars.setVar(basicGlobalLiteral);

				expect(userVars.getVar("nice")).toBe("69");
			});

			test("BasicVar var", () => {
				userVars.setVar(basicGlobalLiteral);
				userVars.setVar(basicGlobalVar);

				expect(userVars.getVar("niceVar")).toBe("69");
			});

			test("BasicVar var pointing to var", () => {
				userVars.setVar(basicGlobalLiteral);
				userVars.setVar(basicGlobalVar);
				userVars.setVar(basicGlobalVar2);

				expect(userVars.getVar("niceVar2")).toBe("69");
			});

			test("Scoped BasicVar var", () => {
				userVars.setVar(basicScopedLiteral);
				userVars.setVar(basicScopedVar);

				expect(userVars.getVar("scope1.niceVar")).toBe("6969");
			});
		
			test("Circular dependency", () => {
				userVars.setVar(basicCircular);

				expect(userVars.getVar("var")).toBe(
					"[CIRCULAR DEPENDENCY]"
				);
			});

			test("Circular 4 deep", () => {
				userVars.setVar(basicCircular1);
				userVars.setVar(basicCircular2);
				userVars.setVar(basicCircular3);
				userVars.setVar(basicCircular4);

				expect(userVars.getVar("var1")).toBe(
					"[CIRCULAR DEPENDENCY]"
				);
			});

			test("Overwrite", () => {
				userVars.setVar(basicGlobalLiteral);
				userVars.setVar(basicGlobalLiteral2, true);

				expect(userVars.getVar("nice")).toBe("6969");
			});

			test("Overwrite not allowed", () => {
				userVars.setVar(basicGlobalLiteral);
				userVars.setVar(basicGlobalLiteral2, false);

				expect(userVars.getVar("nice")).toBe("69");
			});
		});

		describe("List", () => {
			test("List of literals", () => {
				userVars.setVar(listOfLiterals);

				expect(userVars.getVar("list")).toStrictEqual(listOfLiterals.value);
			})

			test("Mixed list", () => {
				userVars.setVar(basicGlobalLiteral);
				userVars.setVar(basicScopedLiteral);
				userVars.setVar(listMixed);

				expect(userVars.getVar("list")).toStrictEqual([
					"nice",
					"69",
					"6969",
					"fuck yes"
				]);
			});

			test("Scoped list of refs", () => {
				userVars.setVar(basicGlobalLiteral);
				userVars.setVar(basicScopedLiteral);
				userVars.setVar(basicChaosScope);
				userVars.setVar(listRefScoped);

				expect(userVars.getVar("chaos.list")).toStrictEqual(["69", "6969", "chaos city"]);
			});

			test("List circular", () => {
				userVars.setVar(listCircular);
				userVars.setVar(basicListCircular);

				expect(userVars.getVar("list")).toStrictEqual([
					"nice",
					"nice 69",
					"[CIRCULAR DEPENDENCY]",
					"nice yeah cool and good"
				]);
			})
		});

		describe("Table", () => {
			test("Table with literal", () => {
				userVars.setVar(tableLiteral);

				expect(userVars.getVar("default")).toBe("me!");
			});
			
			test("Table is eq", () => {
				userVars.setVar(tableMulti);
				userVars.setVar(basicTableEq);

				expect(userVars.getVar("table")).toBe("eq");
			});

			test("Table is lt", () => {
				userVars.setVar(tableMulti);
				userVars.setVar(basicTableLt);

				expect(userVars.getVar("table")).toBe("lt");
			});

			test("Table is gt", () => {
				userVars.setVar(tableMulti);
				userVars.setVar(basicTableGt);

				expect(userVars.getVar("table")).toBe("gt");
			});

			test("Table is in", () => {
				userVars.setVar(tableMulti);
				userVars.setVar(basicTableIn);
				userVars.setVar(listTableWords);

				expect(userVars.getVar("table")).toBe("in");
			});

			test("Table is default", () => {
				userVars.setVar(tableMulti);

				expect(userVars.getVar("table")).toBe("default");
			})
		});
    });

    describe("getPath", () => {
        describe("global scope", () => {
            test("Traverse up to global", () => {
                expect(userVars.getPath("../var", "scope")).toBe("var");
            });

            test("Never leave global", () => {
                expect(userVars.getPath("var", "global")).toBe("var");
            });

            test("No scope argument", () => {
                expect(userVars.getPath("var")).toBe("var");
            });
        });

        test("Scope and name", () => {
            expect(userVars.getPath("var", "scope")).toBe("scope.var");
        });

        test("Sibling scope", () => {
            expect(userVars.getPath("../scope2.var", "scope")).toBe(
                "scope2.var"
            );
        });

        test("Up to global then back to scope", () => {
            expect(userVars.getPath("../scope.var", "scope")).toBe("scope.var");
        });
    });
});

describe("globalRoot false", () => {
    let userVars: UserVars;

    beforeEach(() => {
        userVars = new UserVars(false);
    });

    describe("getPath", () => {
        describe("global scope", () => {
            test("Traverse up to global", () => {
                expect(userVars.getPath("../var", "scope")).toBe("global.var");
            });

            test("Never leave global", () => {
                expect(userVars.getPath("var", "global")).toBe("global.var");
            });

            test("No scope argument", () => {
                expect(userVars.getPath("var")).toBe("global.var");
            });
        });

        test("Up to global then back to scope", () => {
            expect(userVars.getPath("../scope.var", "scope")).toBe("scope.var");
        });
    });

    describe("addVar", () => {
        test("Scoped BasicVar var", () => {
            userVars.setVar(basicScopedLiteral);
            userVars.setVar(basicScopedVar);

            expect(userVars.getVar("scope1.niceVar")).toBe("6969");
        });
    });
});
