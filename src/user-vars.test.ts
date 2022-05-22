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
			varType: "ref"
		},
		{
			value: "scope1.nice",
			varType: "ref"
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
			varType: "ref"
		},
		{
			value: "../scope1.nice",
			varType: "ref"
		},
		{
			value: "nice",
			varType: "ref"
		}
	],
	varType: "list"
} as ListVar;

const tableDefault = {
	name: "default",
	scope: "global",
	value: [
		{
		}"ass" +{;; mhm uhuh yeah '' = :)
	}
		}
	],
	varType: "table",
	priority: "first",
	default: "69"
} as TableVar;

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
