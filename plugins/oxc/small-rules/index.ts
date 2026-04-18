import banTypes from "@rules/ban-types";
import noCommentedCode from "@rules/no-commented-code";
import preventAbbreviations from "@rules/prevent-abbreviations";

import { definePlugin } from "#src";

const smallRules = definePlugin({
	meta: { name: "small-rules" },
	rules: {
		"ban-types": banTypes,
		"no-commented-code": noCommentedCode,
		"prevent-abbreviations": preventAbbreviations,
	},
});

export default smallRules;
