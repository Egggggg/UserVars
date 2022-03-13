import UserVars from "./user-vars";
import { BasicVar } from "./index.d";

const basicGlobalLiteral = {
    name: "nice",
    scope: "global",
    value: "69",
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
    value: "59",
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

/**
 * TODO
 * addVar
 *  failure
 * evaluate
 * 	too much recursion
 * 	circular dependency
 *  variable points to scope
 *  missing reference
 * normalizePath
 *  no passed scope
 *  up
 *  301
 *  309
 */

describe("globalRoot true", () => {
    let userVars: UserVars;

    beforeEach(() => {
        userVars = new UserVars(true);
    });

    describe("addVar", () => {
        test("BasicVar literal", () => {
            const basicVar = {
                name: "nice",
                scope: "global",
                value: "69",
                varType: "basic",
                basicType: "literal"
            } as BasicVar;

            userVars.addVar(basicVar);

            expect(userVars.vars.nice).toBe("69");
        });

        test("BasicVar var", () => {
            userVars.addVar(basicGlobalLiteral);
            userVars.addVar(basicGlobalVar);

            expect(userVars.vars.niceVar).toBe("69");
        });

        test("BasicVar var pointing to var", () => {
            userVars.addVar(basicGlobalLiteral);
            userVars.addVar(basicGlobalVar);
            userVars.addVar(basicGlobalVar2);

            expect(userVars.vars.niceVar2).toBe("69");
        });

        test("Scoped BasicVar var", () => {
            userVars.addVar(basicScopedLiteral);
            userVars.addVar(basicScopedVar);

            expect(userVars.vars.scope1).toHaveProperty("niceVar");
            // @ts-ignore
            expect(userVars.vars.scope1["niceVar"]).toBe("59");
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
            expect(userVars.getPath("../scope2.var", "scope")).toBe("scope2.var");
        });

        test("up to global then back to scope", () => {
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

            expect(userVars.vars.scope1).toHaveProperty("niceVar");
            // @ts-ignore
            expect(userVars.vars.scope1["niceVar"]).toBe("59");
        });
    });
});