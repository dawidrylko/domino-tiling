/**
 * Parses command line arguments based on a provided schema.
 * @param {string[]} args The command line arguments.
 * @param {Object} schema The schema defining argument mappings.
 * @returns {Object} Parsed options with their corresponding values, NaN for a value that is not a non-negative integer.
 */
function parseCommandLineArguments(args, schema) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const currentArg = args[i];
    const nextArg = args[i + 1];

    if (schema[currentArg] && nextArg !== void 0) {
      options[schema[currentArg]] = /^\d+$/.test(nextArg) ? Number(nextArg) : NaN;
      i++;
    }
  }

  return options;
}

module.exports = parseCommandLineArguments;
