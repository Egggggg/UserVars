import { UserVars, BasicVar, ListVar, TableVar } from "../src/user-vars";
const data = require("./data.json");

describe("globalRoot true", () => {
    let userVars: UserVars;

    beforeEach(() => {
        userVars = new UserVars(true);
    });

    describe("getVar", () => {
		describe("Basic", () => {
			test("BasicVar literal", () => {
				userVars.setVar(data.basicGlobalLiteral);

				expect(userVars.getVar("nice")).toBe("cool");
			});

			test("BasicVar var", () => {
				userVars.setVarBulk(data.basicGlobalLiteral, data.basicGlobalVar);

				expect(userVars.getVar("niceVar")).toBe("cool");
			});

			test("BasicVar var pointing to var", () => {
				userVars.setVarBulk(data.basicGlobalLiteral, data.basicGlobalVar, data.basicGlobalVar2);

				expect(userVars.getVar("niceVar2")).toBe("cool");
			});

			test("Scoped BasicVar var", () => {
				userVars.setVarBulk(data.basicScopedLiteral, data.basicScopedVar);

				expect(userVars.getVar("scope1.niceVar")).toBe("epic");
			});
		
			test("Circular dependency", () => {
				userVars.setVar(data.basicCircular);

				expect(userVars.getVar("var")).toBe(
					"[CIRCULAR DEPENDENCY]"
				);
			});

			test("Circular 4 deep", () => {
				userVars.setVarBulk(data.basicCircular1, data.basicCircular2, data.basicCircular3, data.basicCircular4);

				expect(userVars.getVar("var1")).toBe(
					"[CIRCULAR DEPENDENCY]"
				);
			});

			test("Overwrite", () => {
				userVars.setVar(data.basicGlobalLiteral);
				userVars.setVar(data.basicGlobalLiteral2, true);

				expect(userVars.getVar("nice")).toBe("epic");
			});

			test("Overwrite not allowed", () => {
				userVars.setVar(data.basicGlobalLiteral, data.basicGlobalLiteral2);

				expect(userVars.getVar("nice")).toBe("cool");
			});
		});

		describe("List", () => {
			test("List of literals", () => {
				userVars.setVar(data.listOfLiterals);

				expect(userVars.getVar("list")).toStrictEqual(data.listOfLiterals.value);
			})

			test("Mixed list", () => {
				userVars.setVarBulk(data.basicGlobalLiteral, data.basicScopedLiteral, data.listMixed);

				expect(userVars.getVar("list")).toStrictEqual([
					"nice",
					"cool",
					"epic",
					"yes"
				]);
			});

			test("Scoped list of refs", () => {
				userVars.setVarBulk(data.basicGlobalLiteral, data.basicScopedLiteral, data.basicChaosScope, data.listRefScoped);

				expect(userVars.getVar("chaos.list")).toStrictEqual(["cool", "epic", "chaos city"]);
			});

			test("List circular", () => {
				userVars.setVarBulk(data.listCircular, data.basicListCircular);

				expect(userVars.getVar("list")).toStrictEqual([
					"nice",
					"nice cool",
					"[CIRCULAR DEPENDENCY]",
					"nice yeah cool and good"
				]);
			})
		});

		describe("Table", () => {
			test("Table with literal", () => {
				userVars.setVar(data.tableLiteral);

				expect(userVars.getVar("literal")).toBe("me!");
			});
			
			test("Table is eq", () => {
				userVars.setVarBulk(data.tableMulti, data.basicTableEq);

				expect(userVars.getVar("table")).toBe("eq");
			});

			test("Table is lt", () => {
				userVars.setVarBulk(data.tableMulti, data.basicTableLt);

				expect(userVars.getVar("table")).toBe("lt");
			});

			test("Table is gt", () => {
				userVars.setVarBulk(data.tableMulti, data.basicTableGt);

				expect(userVars.getVar("table")).toBe("gt");
			});

			test("Table is in", () => {
				userVars.setVarBulk(data.tableMulti, data.basicTableIn, data.listTableWords);

				expect(userVars.getVar("table")).toBe("in");
			});

			test("Table is default", () => {
				userVars.setVar(data.tableMulti);

				expect(userVars.getVar("table")).toBe("default");
			});

			test("Table priority first", () => {
				userVars.setVar(data.tableFirst);

				expect(userVars.getVar("first")).toBe("yes");
			});

			test("Table priority last", () => {
				userVars.setVar(data.tableLast);

				expect(userVars.getVar("last")).toBe("yes");
			});

			test("Table full priority first", () => {
				userVars.setVar(data.tableFirst);

				expect(userVars.getVar("first", true)).toStrictEqual(data.fullTableFirstOutput);
			});
			
			test("Table full priority last", () => {
				userVars.setVar(data.tableLast);

				expect(userVars.getVar("last", true)).toStrictEqual(data.fullTableLastOutput);
			});
		});

		describe("Expression", () => {
			test("Expression literal", () => {
				userVars.setVar(data.expressionLiteral);

				expect(userVars.getVar("var")).toBe("60");
			});

			test("Expression basic", () => {
				userVars.setVarBulk(data.expressionReference, data.basicExpression);
				
				expect(userVars.getVar("expression")).toBe("120");
			});

			test("Expression table", () => {
				userVars.setVarBulk(data.expressionReference, data.tableExpression);

				expect(userVars.getVar("expression")).toBe("180");
			});

			test("Expression expression", () => {
				userVars.setVarBulk(data.expressionLiteral, data.expressionReference);

				expect(userVars.getVar("expression")).toBe("240");
			});

			test("Expression function", () => {
				userVars.setVarBulk(data.expressionFunction, data.basicFunction, data.basicExpression);

				expect(userVars.getVar("expression")).toBe("135");
			});

			test("Expression function list", () => {
				userVars.setVarBulk(data.expressionFunctionList, data.listFunctions, data.basicExpression);
				
				expect(userVars.getVar("expression")).toBe("360");
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
            userVars.setVarBulk(data.basicScopedLiteral, data.basicScopedVar);

            expect(userVars.getVar("scope1.niceVar")).toBe("epic");
        });
    });
});
