const helper = require("../helpers");

class ReplacePlugin {
    apply(compiler) {
        compiler.hooks.compilation.tap("MyPlugin", (compilation, { normalModuleFactory }) => {
            normalModuleFactory.hooks.parser.for("javascript/auto").tap("MyPlugin", (parser, options) => {
                registerHook(parser, "window.process.env.NODE_ENV");
            });
        });
    }
}

function registerHook(parser, key) {
    parser.hooks.statement.tap("MyPlugin", (expression) => {
        return changeAssignStatemen(expression);
    });
}

function changeAssignStatemen(statement) {
    if (statement.type === "ExpressionStatement" && statement.expression.type === "AssignmentExpression") {
        let leftExp;
        let rightExp;
        if (statement.expression.left && statement.expression.left.type === "MemberExpression") {
            leftExp = extractProperty("", statement.expression.left);
        }
        if (statement.expression.right && statement.expression.right.type === "MemberExpression") {
            rightExp = extractProperty("", statement.expression.right);
        }
        if (leftExp === "process.env.NODE_ENV" && rightExp === "window.Mode") {
            const newMember = new BasicEvaluatedExpression();
            newMember.setObject(statement.expression.left).setName("window");
            newMember.loc = statement.loc;
            statement.left = newMember;
            return statement;
        }
    }
}

function extractProperty(path, statement) {
    if (statement.property && statement.property.name) {
        path = `${statement.property.name}${path ? `.${path}` : ""}`;
    }
    if (statement.object && statement.object.name) {
        path = `${statement.object.name}${path ? `.${path}` : ""}`;
    }
    if (statement.object.object) {
        return extractProperty(path, statement.object);
    }
    return path;
}

class BasicEvaluatedExpression {
    constructor() {
        this.type = "MemberExpression";
        this.range = null;
        this.expression = null;
        this.object = null;
        this.name = null;
    }

    setIdentifier(expression) {
        this.expression = expression;
        return this;
    }

    setObject(object) {
        this.object = object;
        return this;
    }

    setName(name) {
        this.name = name;
        return this;
    }

    setRange(range) {
        this.range = range;
        return this;
    }

    setExpression(expression) {
        this.expression = expression;
        return this;
    }
}

module.exports = ReplacePlugin;
