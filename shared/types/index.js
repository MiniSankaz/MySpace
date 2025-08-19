"use strict";
// ============================================
// Stock Portfolio v3.0 - Shared Types
// ============================================
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformancePeriod =
  exports.TradeStatus =
  exports.TradeType =
  exports.ProjectType =
  exports.UserRole =
    void 0;
var UserRole;
(function (UserRole) {
  UserRole["ADMIN"] = "ADMIN";
  UserRole["USER"] = "USER";
  UserRole["PREMIUM"] = "PREMIUM";
  UserRole["GUEST"] = "GUEST";
})(UserRole || (exports.UserRole = UserRole = {}));
var ProjectType;
(function (ProjectType) {
  ProjectType["NODEJS"] = "NODEJS";
  ProjectType["REACT"] = "REACT";
  ProjectType["NEXTJS"] = "NEXTJS";
  ProjectType["PYTHON"] = "PYTHON";
  ProjectType["JAVA"] = "JAVA";
  ProjectType["OTHER"] = "OTHER";
})(ProjectType || (exports.ProjectType = ProjectType = {}));
var TradeType;
(function (TradeType) {
  TradeType["BUY"] = "BUY";
  TradeType["SELL"] = "SELL";
  TradeType["DIVIDEND"] = "DIVIDEND";
  TradeType["SPLIT"] = "SPLIT";
})(TradeType || (exports.TradeType = TradeType = {}));
var TradeStatus;
(function (TradeStatus) {
  TradeStatus["PENDING"] = "PENDING";
  TradeStatus["EXECUTED"] = "EXECUTED";
  TradeStatus["CANCELLED"] = "CANCELLED";
  TradeStatus["FAILED"] = "FAILED";
})(TradeStatus || (exports.TradeStatus = TradeStatus = {}));
var PerformancePeriod;
(function (PerformancePeriod) {
  PerformancePeriod["ONE_DAY"] = "1D";
  PerformancePeriod["ONE_WEEK"] = "1W";
  PerformancePeriod["ONE_MONTH"] = "1M";
  PerformancePeriod["THREE_MONTHS"] = "3M";
  PerformancePeriod["SIX_MONTHS"] = "6M";
  PerformancePeriod["ONE_YEAR"] = "1Y";
  PerformancePeriod["THREE_YEARS"] = "3Y";
  PerformancePeriod["FIVE_YEARS"] = "5Y";
  PerformancePeriod["ALL"] = "ALL";
})(PerformancePeriod || (exports.PerformancePeriod = PerformancePeriod = {}));
// Export all types for easier importing
__exportStar(require("./auth.types"), exports);
__exportStar(require("./api.types"), exports);
// Common types are already exported above
//# sourceMappingURL=index.js.map
