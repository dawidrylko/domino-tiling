/**
 * Parses command line arguments based on a provided schema.
 * @param {string[]} args The command line arguments.
 * @param {Object} schema The schema defining argument mappings.
 * @returns {Object} Parsed options with their corresponding values, NaN for a missing value or one that is not a safe non-negative integer.
 */
function parseCommandLineArguments(args, schema) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const currentArg = args[i];
    const nextArg = args[i + 1];

    if (schema[currentArg]) {
      options[schema[currentArg]] =
        nextArg !== void 0 && /^\d+$/.test(nextArg) && Number.isSafeInteger(Number(nextArg))
          ? Number(nextArg)
          : NaN;
      i++;
    }
  }

  return options;
}

module.exports = parseCommandLineArguments;
