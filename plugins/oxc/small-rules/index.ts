import { definePlugin } from "oxlint-plugin-utilities";

import noCommentedCode from "./rules/no-commented-code";
import preventAbbreviations from "./rules/prevent-abbreviations";

const smallRules = definePlugin({
	meta: { name: "small-rules" },
	rules: {
		"no-commented-code": noCommentedCode,
		"prevent-abbreviations": preventAbbreviations,
	},
});

export default smallRules;
