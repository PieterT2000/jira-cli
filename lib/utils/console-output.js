import chalk from "chalk";

const error = (str) =>
  console.error(`\n ${chalk.bgRedBright.whiteBright(`\t🔥 ${str}\t`)} \n`);

const success = (str) =>
  console.log(`\n ${chalk.whiteBright(`\t✅ ${str}\t`)}\n`);

const info = (str) => {
  console.log("---------------------------------");
  console.log(`${chalk.whiteBright(`\tℹ️ ${str}\t`)}`);
  console.log("---------------------------------", "\n");
};

export default { error, success, info };
