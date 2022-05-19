import { UserVars, BasicVar } from "./user-vars";

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

const basicNiceScopedLiteral = {
    name: "nice",
    scope: "nice",
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

const basicRecursion = {
    name: "var1",
    scope: "global",
    value: "var2",
    varType: "basic",
    basicType: "var"
} as BasicVar;

const basicRecursion2 = {
    name: "var2",
    scope: "global",
    value: "var1",
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

/**
 * TODO
 * evaluate
 *  both variable points to scopes
 *  missing reference
 * normalizePath
 *  no passed scope
 *  up
 */

describe("globalRoot true", () => {
    let userVars: UserVars;

    beforeEach(() => {
        userVars = new UserVars(true);
    });

    describe("addVar", () => {
        test("BasicVar literal", () => {
            userVars.setVar(basicGlobalLiteral);

            expect(userVars.getVar("nice")).toBe("69");
        });

        test("Conflicting name and scope no overwrite", () => {
            userVars.setVar(basicGlobalLiteral);
            userVars.setVar(basicNiceScopedLiteral, false);

            expect(userVars.vars).toStrictEqual({ nice: "69" });
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

        test("Recursion limit", () => {
            userVars.setVar(basicRecursion);
            userVars.setVar(basicRecursion2);

            expect(userVars.getVar("var1")).toBe(
                "[TOO MUCH RECURSION]"
            );
            expect(userVars.getVar("var2")).toBe(
                "[TOO MUCH RECURSION]"
            );
        });
      
        test("Circular dependency", () => {
            userVars.setVar(basicCircular);

            expect(userVars.getVar("var")).toBe(
                "[CIRCULAR DEPENDENCY]"
            );
        });

        test("Overwrite", () => {
            userVars.setVar(basicGlobalLiteral);
            userVars.setVar(basicGlobalLiteral2);

            expect(userVars.getVar("nice")).toBe("6969");
        });

        test("Overwrite not allowed", () => {
            userVars.setVar(basicGlobalLiteral);
            userVars.setVar(basicGlobalLiteral2, false);

            expect(userVars.getVar("nice")).toBe("69");
        });
    });

    describe("getPath", () => {
        describe("global scope", () => {
            test("traverse up to global", () => {
                expect(userVars.getPath("../var", "scope")).toBe("var");
            });

            test("never leave global", () => {
                expect(userVars.getPath("var", "global")).toBe("var");
            });

            test("no scope argument", () => {
                expect(userVars.getPath("var")).toBe("var");
            });
        });

        test("scope and name", () => {
            expect(userVars.getPath("var", "scope")).toBe("scope.var");
        });

        test("sibling scope", () => {
            expect(userVars.getPath("../scope2.var", "scope")).toBe(
                "scope2.var"
            );
        });

        test("up to global then back to scope", () => {
            expect(userVars.getPath("../scope.var", "scope")).toBe("scope.var");
        });
    });

    test("getRawVar", () => {
        userVars.setVar(basicGlobalLiteral);

        expect(userVars.getRawVar("nice")).toStrictEqual(
            basicGlobalLiteral
        );	
    });
});

describe("globalRoot false", () => {
    let userVars: UserVars;

    beforeEach(() => {
        userVars = new UserVars(false);
    });

    describe("getPath", () => {
        describe("global scope", () => {
            test("traverse up to global", () => {
                expect(userVars.getPath("../var", "scope")).toBe("global.var");
            });

            test("never leave global", () => {
                expect(userVars.getPath("var", "global")).toBe("global.var");
            });

            test("no scope argument", () => {
                expect(userVars.getPath("var")).toBe("global.var");
            });
        });

        test("up to global then back to scope", () => {
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

    test("getRawVar", () => {
        userVars.setVar(basicGlobalLiteral);

        expect(userVars.getRawVar("global.nice")).toStrictEqual(
            basicGlobalLiteral
        );

        expect(
            userVars.getRawVar({ name: "nice", scope: "global" })
        ).toStrictEqual(basicGlobalLiteral);
    });
});
