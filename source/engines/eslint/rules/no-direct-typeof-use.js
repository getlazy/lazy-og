/**
 * @fileoverview Rule that warns when typeof is used directly instead of
 * using de facto standard libraries like underscore and lodash.
 * @author Ivan Erceg
 */

/**
 * @fileoverview Ensures that the results of typeof are compared against a valid string
 * @author Ian Christian Myers
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
    meta: {
        docs: {
            description: "enforce comparing `typeof` expressions against valid strings",
            category: "Possible Errors",
            recommended: true
        },

        schema: []
    },

    create: function(context) {

        var VALID_TYPES = ["symbol", "undefined", "object", "boolean", "number", "string", "function"],
            OPERATORS = ["==", "===", "!=", "!=="];

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        return {

            UnaryExpression: function(node) {
                var parent, sibling;

                if (node.operator === "typeof") {
                	context.report(node, "Don't use typeof directly - use _.isUndefined, ")
                }
            }

        };

    }
};
