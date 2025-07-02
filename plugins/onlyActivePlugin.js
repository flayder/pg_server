const os = require("os");

module.exports = function onlyActivePlugin(schema) {
  const applyActiveFilter = function () {
    const context = this.getOptions?.().context;
    const isAdmin = context?.isAdmin;

    if (!isAdmin) {
      this.where({ active: true });
    }

  };

  schema.pre('find', applyActiveFilter);
  schema.pre('findOne', applyActiveFilter);
  schema.pre('findOneAndUpdate', applyActiveFilter);
  schema.pre('count', applyActiveFilter);
  schema.pre('countDocuments', applyActiveFilter);
  schema.pre('aggregate', function () {
    // если агрегация — можно вручную вставить $match
    const firstStage = this.pipeline()[0];
    if (!firstStage || !firstStage.$match || !firstStage.$match.active) {
      this.pipeline().unshift({ $match: { active: true } });
    }
  });
};