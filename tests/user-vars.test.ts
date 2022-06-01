import { UserVars } from "../src";
const data = require("./data.json");

let userVars: UserVars;

beforeEach(() => {
  userVars = new UserVars();
});

describe("getVar", () => {
  describe("Basic", () => {
    test("BasicVar literal", () => {
      userVars.setVar(data.basicGlobalLiteral);

      expect(userVars.getVar("global.nice")).toBe("cool");
    });

    test("BasicVar var", () => {
      userVars.setVarBulk(data.basicGlobalLiteral, data.basicGlobalVar);

      expect(userVars.getVar("niceVar")).toBe("cool");
    });

    test("BasicVar var pointing to var", () => {
      userVars.setVarBulk(
        data.basicGlobalLiteral,
        data.basicGlobalVar,
        data.basicGlobalVar2
      );

      expect(userVars.getVar("niceVar2")).toBe("cool");
    });

    test("Scoped BasicVar var", () => {
      userVars.setVarBulk(data.basicScopedLiteral, data.basicScopedVar);

      expect(userVars.getVar("scope1.niceVar")).toBe("epic");
    });

    test("Circular dependency", () => {
      userVars.setVar(data.basicCircular);

      expect(userVars.getVar("var")).toBe("[CIRCULAR DEPENDENCY]");
    });

    test("Circular 4 deep", () => {
      userVars.setVarBulk(
        data.basicCircular1,
        data.basicCircular2,
        data.basicCircular3,
        data.basicCircular4
      );

      expect(userVars.getVar("var1")).toBe("[CIRCULAR DEPENDENCY]");
    });

    test("Overwrite", () => {
      userVars.setVar(data.basicGlobalLiteral);
      userVars.setVar(data.basicGlobalLiteral2, true);

      expect(userVars.getVar("nice")).toBe("epic");
    });

    test("Scoped overwrite not allowed", () => {
      userVars.setVarBulk(data.basicScopedLiteral, data.basicScopedLiteral2);

      expect(userVars.getVar("scope1.nice")).toBe("epic");
    });

    test("Scope with existing variable name", () => {
      userVars.setVarBulk(data.basicGlobalLiteral, data.basicScopeNice);

      expect(userVars.getVar("nice")).toBe("cool");
    });

    test("Get scope", () => {
      userVars.setVar(data.basicScopedLiteral);

      expect(() => userVars.getVar("scope1")).toThrow();
    });

    test("With table for varType", () => {
      userVars.setVar(data.basicTable);

      expect(() => userVars.getVar("var")).toThrow();
    });
  });

  describe("List", () => {
    test("List of literals", () => {
      userVars.setVar(data.listLiteral);

      expect(userVars.getVar("list")).toStrictEqual([
        "nice",
        "nice2",
        "nice3",
        "nice4",
        "cool (nice)"
      ]);
    });

    test("Mixed list", () => {
      userVars.setVarBulk(
        data.basicGlobalLiteral,
        data.basicScopedLiteral,
        data.listMixed
      );

      expect(userVars.getVar("list")).toStrictEqual([
        "nice",
        "cool",
        "epic",
        "yes"
      ]);
    });

    test("Scoped list of refs", () => {
      userVars.setVarBulk(
        data.basicGlobalLiteral,
        data.basicScopedLiteral,
        data.basicChaosScope,
        data.listRefScoped
      );

      expect(userVars.getVar("chaos.list")).toStrictEqual([
        "cool",
        "epic",
        "chaos city"
      ]);
    });

    test("List circular", () => {
      userVars.setVarBulk(data.listCircular, data.basicListCircular);

      expect(userVars.getVar("list")).toStrictEqual([
        "nice",
        "nice cool",
        "[CIRCULAR DEPENDENCY]",
        "nice yeah cool and good"
      ]);
    });

    test("List of with missing reference", () => {
      userVars.setVarBulk(data.listMissingRef);

      expect(userVars.getVar("list2")).toStrictEqual(["[MISSING no]"]);
    });

    test("List with reference to scope", () => {
      userVars.setVarBulk(data.listRefScope, data.basicScopedLiteral);

      expect(() => userVars.getVar("list")).toThrow();
    });

    test("List with reference to list", () => {
      userVars.setVarBulk(data.listRefList, data.listLiteral);

      expect(userVars.getVar("list2")).toStrictEqual([
        "cool and good",
        "nice",
        "nice2",
        "nice3",
        "nice4",
        "cool (nice)",
        "very cool"
      ]);
    });
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
      userVars.setVarBulk(
        data.tableMulti,
        data.basicTableIn,
        data.listTableWords
      );

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

    test("Table priority last, output first", () => {
      userVars.setVar(data.tableLastToFirst);

      expect(userVars.getVar("first")).toBe("yes");
    });

    test("Table full priority first", () => {
      userVars.setVar(data.tableFirst);

      expect(userVars.getVar("first", true)).toStrictEqual(
        data.fullTableFirstOutput
      );
    });

    test("Table full priority last", () => {
      userVars.setVar(data.tableLast);

      expect(userVars.getVar("last", true)).toStrictEqual(
        data.fullTableLastOutput
      );
    });

    test("Table reference priority first", () => {
      userVars.setVarBulk(data.tableRefFirst, data.basicGlobalLiteral);

      expect(userVars.getVar("ref")).toBe("cool");
    });

    test("Table reference priority last", () => {
      userVars.setVarBulk(data.tableRefLast, data.basicGlobalLiteral);

      expect(userVars.getVar("ref")).toBe("cool");
    });

    test("Table reference default", () => {
      userVars.setVarBulk(data.tableRefDefault, data.basicGlobalLiteral);

      expect(userVars.getVar("ref")).toBe("cool");
    });

    test("Table invalid lt/gt types and missing entry in list", () => {
      userVars.setVarBulk(data.tableInvalidIn, data.listLiteral);

      expect(userVars.getVar("table")).toBe("default");
    });

    test("Table full output with references", () => {
      userVars.setVarBulk(
        data.tableFullRefs,
        data.basicGlobalLiteral,
        data.basicScopedLiteral
      );

      expect(userVars.getVar("table", true)).toStrictEqual(
        data.fullTableRefOutput
      );
    });

    describe("Table list comparisons", () => {
      test("Eq", () => {
        userVars.setVarBulk(
          data.tableCompareLists,
          data.listLiteral,
          data.listCompare2
        );

        expect(userVars.getVar("table")).toBe("eq");
      });

      test("Lt", () => {
        userVars.setVarBulk(
          data.tableCompareLists,
          data.listLiteral,
          data.basicTableListLt
        );

        expect(userVars.getVar("table")).toBe("lt");
      });

      test("Gt", () => {
        userVars.setVarBulk(
          data.tableCompareLists,
          data.listLiteral,
          data.basicTableListGt
        );

        expect(userVars.getVar("table")).toBe("gt");
      });

      test("Gt with list as second operand", () => {
        userVars.setVarBulk(
          data.tableCompareLists,
          data.listLiteral,
          data.basicTableListGt2
        );

        expect(userVars.getVar("table")).toBe("gt2");
      });

      test("In", () => {
        userVars.setVarBulk(
          data.tableCompareLists,
          data.listLiteral,
          data.listSublist
        );

        expect(userVars.getVar("table")).toBe("in");
      });
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
      userVars.setVarBulk(
        data.expressionFunction,
        data.basicFunction,
        data.basicExpression
      );

      expect(userVars.getVar("expression")).toBe("135");
    });

    test("Expression function list", () => {
      userVars.setVarBulk(
        data.expressionFunctionList,
        data.listFunctions,
        data.basicExpression
      );

      expect(userVars.getVar("expression")).toBe("360");
    });

    test("Expression with reference for value", () => {
      userVars.setVarBulk(
        data.expressionRefValue,
        data.basicExpressionReferenced
      );

      expect(userVars.getVar("expression")).toBe("60");
    });

    test("Expression with reference for value", () => {
      userVars.setVarBulk(
        data.expressionRefValue,
        data.listExpressionReferenced
      );

      expect(userVars.getVar("expression")).toBe("[LIST math.expression1]");
    });

    test("Expression with missing function ref", () => {
      userVars.setVar(data.expressionMissingFunc);

      expect(userVars.getVar("expression")).toBe("[MISSING no]");
    });
  });

  test("Invalid varType", () => {
    userVars.setVar(data.invalid);

    expect(userVars.getVar("var")).toBe("[NOT IMPLEMENTED]");
  });
});
