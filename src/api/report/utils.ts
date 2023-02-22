export function normalizePhone(userPhone: string) {
  const phoneReg = /^(\+7|8|7)(?<num>\d+)$/;
  const exec = phoneReg.exec(userPhone);
  if (exec) {
    const { num } = exec.groups;
    return num;
  } else {
    return userPhone;
  }
}

const entityTitleReg = /(?<title>[^_]+)(_(\d+))?/;
export function extractEntityTitle(entitySourceName) {
  entityTitleReg.lastIndex = 0;
  const exec = entityTitleReg.exec(entitySourceName);
  const { title } = exec.groups;
  return title;
}

export function timeout(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}
