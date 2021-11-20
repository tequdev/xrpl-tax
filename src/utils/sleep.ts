export const _sleep = (sec: number) =>
  new Promise((resolve) => setTimeout(resolve, sec * 1000))
