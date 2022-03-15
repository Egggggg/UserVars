import UserVars from "./user-vars";
import { BasicVar } from "./index.d";

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
            userVars.addVar(basicGlobalLiteral);

            expect(userVars.getVar({ path: "nice" })).toBe("69");
        });

        test("Conflicting name and scope no overwrite", () => {
            userVars.addVar(basicGlobalLiteral);
            userVars.addVar(basicNiceScopedLiteral, false);

            expect(userVars.vars).toStrictEqual({ nice: "69" });
        });

        test("BasicVar var", () => {
            userVars.addVar(basicGlobalLiteral);
            userVars.addVar(basicGlobalVar);

            expect(userVars.getVar({ path: "niceVar" })).toBe("69");
        });

        test("BasicVar var pointing to var", () => {
            userVars.addVar(basicGlobalLiteral);
            userVars.addVar(basicGlobalVar);
            userVars.addVar(basicGlobalVar2);

            expect(userVars.getVar({ path: "niceVar2" })).toBe("69");
        });

        test("Scoped BasicVar var", () => {
            userVars.addVar(basicScopedLiteral);
            userVars.addVar(basicScopedVar);

            expect(userVars.getVar({ path: "scope1.niceVar" })).toBe("6969");
        });

        test("Recursion limit", () => {
            userVars.addVar(basicRecursion);
            userVars.addVar(basicRecursion2);

            expect(userVars.getVar({ path: "var1" })).toBe(
                "[TOO MUCH RECURSION]"
            );
            expect(userVars.getVar({ path: "var2" })).toBe(
                "[TOO MUCH RECURSION]"
            );
        });

        test("Circular dependency", () => {
            userVars.addVar(basicCircular);

            expect(userVars.getVar({ path: "var" })).toBe(
                "[CIRCULAR DEPENDENCY]"
            );
        });

        test("Overwrite", () => {
            userVars.addVar(basicGlobalLiteral);
            userVars.addVar(basicGlobalLiteral2);

            expect(userVars.getVar({ path: "nice" })).toBe("6969");
        });

        test("Overwrite not allowed", () => {
            userVars.addVar(basicGlobalLiteral);
            userVars.addVar(basicGlobalLiteral2, false);

            expect(userVars.getVar({ path: "nice" })).toBe("69");
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
        userVars.addVar(basicGlobalLiteral);

        expect(userVars.getRawVar({ path: "nice" })).toStrictEqual(
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
            userVars.addVar(basicScopedLiteral);
            userVars.addVar(basicScopedVar);

            expect(userVars.getVar({ path: "scope1.niceVar" })).toBe("6969");
        });
    });

    test("getRawVar", () => {
        userVars.addVar(basicGlobalLiteral);

        expect(userVars.getRawVar({ path: "global.nice" })).toStrictEqual(
            basicGlobalLiteral
        );

        expect(
            userVars.getRawVar({ name: "nice", scope: "global" })
        ).toStrictEqual(basicGlobalLiteral);
    });
});
