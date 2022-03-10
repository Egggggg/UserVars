import UserVars from "./user-vars";

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
	});
});