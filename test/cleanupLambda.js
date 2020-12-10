"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("./helpers");
exports.default = async () => {
    await helpers_1.cleanupExistingBuckets(true);
};
//# sourceMappingURL=cleanupLambda.js.map