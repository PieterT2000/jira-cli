import chalk from "chalk";

const error = (str) =>
  console.error(`\n ${chalk.bgRedBright.whiteBright(`\t🔥 ${str}\t`)} \n`);

export default { error };
