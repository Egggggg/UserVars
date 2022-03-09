import UserVars from "./user-vars";

describe("UserVars with globalRoot set to true", () => {
	let userVars: UserVars;

	beforeEach(() => {
		userVars = new UserVars(true);
	});

	describe("getPath just name", () => {
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

	test("getPath scope and name", () => {
		expect(userVars.getPath("var", "scope")).toBe("scope.var");
	});
});

describe("UserVars with globalRoot set to false", () => {
	let userVars: UserVars;

	beforeEach(() => {
		userVars = new UserVars(false);
	});

	describe("getPath just name", () => {
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
});