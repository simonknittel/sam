export const sleep = async (min: number, max: number) => {
  const ms = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise((resolve) => setTimeout(resolve, ms));
};
