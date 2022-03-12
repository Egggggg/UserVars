import UserVars from "./user-vars";
import { BasicVar } from "./index.d";

describe("globalRoot = true", () => {
	let userVars: UserVars;

	beforeEach(() => {
		userVars = new UserVars(true);
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

			if (typeof userVars.vars.nice === "string") {
				expect(userVars.vars.nice).toBe("69");
			} else {
				throw new Error("userVars.vars.nice is not a string")
			}
		});

		test("BasicVar var", () => {
			const basicVar = {
				name: "nice",
				scope: "global",
				value: "69",
				varType: "basic",
				basicType: "literal"
			} as BasicVar;

			userVars.addVar(basicVar);
		});
	});
});

describe("globalRoot = false", () => {
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